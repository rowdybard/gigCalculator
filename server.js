const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Pool } = require('pg');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database initialization
async function initDatabase() {
  try {
    // Drop and recreate users table to ensure correct schema
    await pool.query('DROP TABLE IF EXISTS calculations CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_preferences CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    // Create users table with comprehensive fields
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        given_name VARCHAR(255),
        family_name VARCHAR(255),
        picture_url TEXT,
        verified_email BOOLEAN DEFAULT false,
        locale VARCHAR(10),
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table for connect-pg-simple
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);
      
      ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
      ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
      
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    // Create calculations table with enhanced tracking
    await pool.query(`
      CREATE TABLE calculations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        
        -- Input data
        miles_driven DECIMAL(10,2),
        trip_miles DECIMAL(10,2),
        time_hours DECIMAL(10,2),
        total_earnings DECIMAL(10,2),
        gas_price DECIMAL(10,3),
        mpg DECIMAL(10,2),
        wear_tear_rate DECIMAL(10,3) DEFAULT 0.67,
        tax_rate DECIMAL(5,2) DEFAULT 0.00,
        
        -- Calculated results
        gross_hourly DECIMAL(10,2),
        net_hourly DECIMAL(10,2),
        fuel_cost DECIMAL(10,2),
        wear_tear_cost DECIMAL(10,2),
        estimated_tax DECIMAL(10,2),
        gross_per_mile DECIMAL(10,2),
        net_per_mile DECIMAL(10,2),
        gross_per_mile_all DECIMAL(10,2),
        net_per_mile_all DECIMAL(10,2),
        
        -- Scorecard data
        score INTEGER,
        score_grade VARCHAR(2),
        
        -- Metadata
        notes TEXT,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user preferences table
    await pool.query(`
      CREATE TABLE user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        default_mpg DECIMAL(10,2) DEFAULT 25.0,
        default_wear_tear_rate DECIMAL(10,3) DEFAULT 0.67,
        default_tax_rate DECIMAL(5,2) DEFAULT 0.00,
        preferred_currency VARCHAR(3) DEFAULT 'USD',
        timezone VARCHAR(50) DEFAULT 'America/New_York',
        notifications_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Session store will be created below using connect-pg-simple

// Middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:", "*.googleusercontent.com"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://gigcalculator.onrender.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: false // We create it manually above
  }),
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax' // Removed domain setting - let browser handle it
  },
  name: 'gigcalc.sid',
  proxy: process.env.NODE_ENV === 'production' // Trust proxy for HTTPS
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? "https://gigcalculator.onrender.com/auth/google/callback"
    : "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google OAuth profile received:', profile.id, profile.emails?.[0]?.value);
    
    // Check if user exists
    let userResult = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [profile.id]
    );

    let user;
    if (userResult.rows.length > 0) {
      // Update existing user
      user = await pool.query(`
        UPDATE users SET 
          name = $1, 
          given_name = $2, 
          family_name = $3, 
          picture_url = $4, 
          verified_email = $5,
          last_login = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE google_id = $6 
        RETURNING *
      `, [
        profile.displayName,
        profile.name?.givenName,
        profile.name?.familyName,
        profile.photos?.[0]?.value,
        profile.emails?.[0]?.verified || false,
        profile.id
      ]);
      
      console.log('Updated existing user:', profile.emails[0].value);
    } else {
      // Create new user
      user = await pool.query(`
        INSERT INTO users (
          google_id, email, name, given_name, family_name, 
          picture_url, verified_email, locale
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
      `, [
        profile.id,
        profile.emails[0].value,
        profile.displayName,
        profile.name?.givenName,
        profile.name?.familyName,
        profile.photos?.[0]?.value,
        profile.emails?.[0]?.verified || false,
        profile._json?.locale
      ]);

      // Create default preferences for new user
      await pool.query(`
        INSERT INTO user_preferences (user_id) VALUES ($1)
      `, [user.rows[0].id]);

      console.log('Created new user:', profile.emails[0].value);
    }

    return done(null, user.rows[0]);
  } catch (error) {
    console.error('❌ Error in Google Strategy:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return done(error, null);
  }
}));

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user ID:', id);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    console.log('User found:', !!result.rows[0]);
    done(null, result.rows[0] || null);
  } catch (error) {
    console.error('❌ Error deserializing user:', error);
    done(error, null);
  }
});

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// Initialize database on startup
initDatabase().catch(console.error);

// Authentication routes
app.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

app.get('/auth/google/callback',
  (req, res, next) => {
    console.log('🔄 OAuth callback hit with code:', !!req.query.code);
    console.log('Query params:', Object.keys(req.query));
    next();
  },
  (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
      console.log('🔍 Passport authenticate result:', { err: !!err, user: !!user, info });
      
      if (err) {
        console.error('❌ Passport authentication error:', err);
        return res.redirect('/?error=auth_failed&details=passport_error');
      }
      
      if (!user) {
        console.error('❌ No user returned from authentication');
        return res.redirect('/?error=auth_failed&details=no_user');
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('❌ Login error:', err);
          return res.redirect('/?error=auth_failed&details=login_error');
        }
        
        console.log('✅ Google OAuth successful for user:', user.email);
        console.log('🔍 Session after login:', {
          sessionID: req.sessionID,
          isAuthenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          sessionKeys: req.session ? Object.keys(req.session) : 'no session',
          cookies: req.headers.cookie
        });
        
        // Explicitly set cookie header for debugging
        console.log('🍪 Setting session cookie:', req.sessionID);
        
        return res.redirect('/?auth=success');
      });
    })(req, res, next);
  }
);

app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Session cleanup failed' });
      }
      res.clearCookie('gigcalc.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

// API Routes

// Get current user
app.get('/api/user', requireAuth, async (req, res) => {
  try {
    // Get user with preferences
    const userResult = await pool.query(`
      SELECT u.*, p.default_mpg, p.default_wear_tear_rate, p.default_tax_rate,
             p.preferred_currency, p.timezone, p.notifications_enabled
      FROM users u
      LEFT JOIN user_preferences p ON u.id = p.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    // Get calculation stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_calculations,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as calculations_this_month,
        AVG(score) as average_score
      FROM calculations 
      WHERE user_id = $1
    `, [req.user.id]);

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      given_name: user.given_name,
      family_name: user.family_name,
      picture_url: user.picture_url,
      verified_email: user.verified_email,
      last_login: user.last_login,
      preferences: {
        default_mpg: user.default_mpg,
        default_wear_tear_rate: user.default_wear_tear_rate,
        default_tax_rate: user.default_tax_rate,
        preferred_currency: user.preferred_currency,
        timezone: user.timezone,
        notifications_enabled: user.notifications_enabled
      },
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Update user preferences
app.put('/api/user/preferences', requireAuth, async (req, res) => {
  try {
    const {
      default_mpg, default_wear_tear_rate, default_tax_rate,
      preferred_currency, timezone, notifications_enabled
    } = req.body;

    const result = await pool.query(`
      UPDATE user_preferences SET 
        default_mpg = COALESCE($1, default_mpg),
        default_wear_tear_rate = COALESCE($2, default_wear_tear_rate),
        default_tax_rate = COALESCE($3, default_tax_rate),
        preferred_currency = COALESCE($4, preferred_currency),
        timezone = COALESCE($5, timezone),
        notifications_enabled = COALESCE($6, notifications_enabled),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $7
      RETURNING *
    `, [default_mpg, default_wear_tear_rate, default_tax_rate, 
        preferred_currency, timezone, notifications_enabled, req.user.id]);

    res.json({ success: true, preferences: result.rows[0] });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Save calculation
app.post('/api/calculations', requireAuth, async (req, res) => {
  try {
    const {
      miles_driven, trip_miles, time_hours, total_earnings, gas_price, mpg,
      wear_tear_rate, tax_rate, gross_hourly, net_hourly, fuel_cost,
      wear_tear_cost, estimated_tax, gross_per_mile, net_per_mile,
      gross_per_mile_all, net_per_mile_all, score, score_grade, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO calculations (
        user_id, session_id, miles_driven, trip_miles, time_hours, total_earnings,
        gas_price, mpg, wear_tear_rate, tax_rate, gross_hourly, net_hourly,
        fuel_cost, wear_tear_cost, estimated_tax, gross_per_mile, net_per_mile,
        gross_per_mile_all, net_per_mile_all, score, score_grade, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `, [
      req.user.id, req.sessionID, miles_driven, trip_miles, time_hours, total_earnings,
      gas_price, mpg, wear_tear_rate, tax_rate, gross_hourly, net_hourly,
      fuel_cost, wear_tear_cost, estimated_tax, gross_per_mile, net_per_mile,
      gross_per_mile_all, net_per_mile_all, score, score_grade, notes
    ]);

    console.log(`Calculation saved for user ${req.user.email}: Score ${score}`);
    res.json({ success: true, calculation: result.rows[0] });
  } catch (error) {
    console.error('Error saving calculation:', error);
    res.status(500).json({ error: 'Failed to save calculation' });
  }
});

// Get user calculations
app.get('/api/calculations', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, favorite_only } = req.query;
    
    let query = `
      SELECT * FROM calculations 
      WHERE user_id = $1
    `;
    const params = [req.user.id];
    
    if (favorite_only === 'true') {
      query += ' AND is_favorite = true';
    }
    
    query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    res.json({ 
      calculations: result.rows,
      total: result.rows.length,
      has_more: result.rows.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching calculations:', error);
    res.status(500).json({ error: 'Failed to fetch calculations' });
  }
});

// Toggle calculation favorite
app.put('/api/calculations/:id/favorite', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_favorite } = req.body;

    const result = await pool.query(`
      UPDATE calculations SET 
        is_favorite = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [is_favorite, id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    res.json({ success: true, calculation: result.rows[0] });
  } catch (error) {
    console.error('Error updating calculation favorite:', error);
    res.status(500).json({ error: 'Failed to update calculation' });
  }
});

// Delete calculation
app.delete('/api/calculations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM calculations WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    res.json({ success: true, deleted_id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting calculation:', error);
    res.status(500).json({ error: 'Failed to delete calculation' });
  }
});

// Session test endpoint
app.get('/api/session-test', (req, res) => {
  console.log('🧪 Session test:', {
    sessionID: req.sessionID,
    sessionData: req.session,
    cookies: req.headers.cookie
  });
  
  // Set a test value in session
  if (!req.session.testValue) {
    req.session.testValue = 'test-' + Date.now();
  }
  
  res.json({
    sessionID: req.sessionID,
    testValue: req.session.testValue,
    sessionKeys: Object.keys(req.session)
  });
});

// Authentication status check
app.get('/api/auth/status', (req, res) => {
  console.log('🔍 Auth status check:', {
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userEmail: req.user?.email,
    sessionData: req.session ? Object.keys(req.session) : 'no session',
    cookies: req.headers.cookie,
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });
  
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture_url: req.user.picture_url
    } : null
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Check basic connection
    const timeResult = await pool.query('SELECT NOW() as current_time');
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'session', 'calculations', 'user_preferences')
    `);
    
    const userCountResult = await pool.query('SELECT COUNT(*) as user_count FROM users');
    
    res.json({
      status: 'healthy',
      message: 'Gig Calculator API - Production Ready',
      timestamp: new Date().toISOString(),
      database: 'connected',
      db_time: timeResult.rows[0].current_time,
      tables: tablesResult.rows.map(r => r.table_name),
      total_users: userCountResult.rows[0].user_count,
      environment: process.env.NODE_ENV,
      powered_by: 'Hey Dispatch'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚛 Gig Calculator running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Google OAuth: http://localhost:${PORT}/auth/google`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});