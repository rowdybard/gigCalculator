const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');

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
    // Drop existing tables if they exist (to fix any schema issues)
    await pool.query('DROP TABLE IF EXISTS calculations CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create calculations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calculations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        gross_hourly DECIMAL(10,2),
        net_hourly DECIMAL(10,2),
        fuel_cost DECIMAL(10,2),
        wear_tear_cost DECIMAL(10,2),
        tax_rate DECIMAL(5,2),
        gross_per_mile DECIMAL(10,2),
        net_per_mile DECIMAL(10,2),
        gross_per_mile_all DECIMAL(10,2),
        net_per_mile_all DECIMAL(10,2),
        score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// Initialize database on startup
initDatabase();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Simple OAuth callback handler
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${req.protocol}://${req.get('host')}/auth/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    // Get user info from Google
    const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`);
    const userData = await userResponse.json();

    // Save/update user in database
    let user;
    try {
      // Try to find existing user
      const existingUser = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [userData.id]
      );

      if (existingUser.rows.length > 0) {
        // Update existing user
        const updateResult = await pool.query(
          'UPDATE users SET name = $1, picture_url = $2, updated_at = CURRENT_TIMESTAMP WHERE google_id = $3 RETURNING *',
          [userData.name, userData.picture, userData.id]
        );
        user = updateResult.rows[0];
        console.log('Updated existing user:', user.email);
      } else {
        // Create new user
        const insertResult = await pool.query(
          'INSERT INTO users (google_id, email, name, picture_url) VALUES ($1, $2, $3, $4) RETURNING *',
          [userData.id, userData.email, userData.name, userData.picture]
        );
        user = insertResult.rows[0];
        console.log('Created new user:', user.email);
      }

      // Create a simple session token (just the user ID for now)
      const sessionToken = `user_${user.id}_${Date.now()}`;
      
      // Redirect back with session token
      res.redirect(`/?session=${sessionToken}&user_id=${user.id}`);
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.redirect('/?error=db_error');
    }
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect('/?error=auth_failed');
  }
});

// Helper function to extract user ID from session token
function getUserIdFromToken(sessionToken) {
  if (!sessionToken || !sessionToken.startsWith('user_')) {
    return null;
  }
  const parts = sessionToken.split('_');
  return parts[1] ? parseInt(parts[1]) : null;
}

// API: Get user info
app.get('/api/user', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    const userId = getUserIdFromToken(sessionToken);
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      picture_url: user.picture_url
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// API: Save calculation
app.post('/api/calculations', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    const userId = getUserIdFromToken(sessionToken);
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    const {
      gross_hourly, net_hourly, fuel_cost, wear_tear_cost, tax_rate,
      gross_per_mile, net_per_mile, gross_per_mile_all, net_per_mile_all, score
    } = req.body;

    const result = await pool.query(`
      INSERT INTO calculations (
        user_id, gross_hourly, net_hourly, fuel_cost, wear_tear_cost, tax_rate,
        gross_per_mile, net_per_mile, gross_per_mile_all, net_per_mile_all, score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `, [userId, gross_hourly, net_hourly, fuel_cost, wear_tear_cost, tax_rate,
        gross_per_mile, net_per_mile, gross_per_mile_all, net_per_mile_all, score]);

    res.json({ success: true, calculation: result.rows[0] });
  } catch (error) {
    console.error('Error saving calculation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// API: Get user calculations
app.get('/api/calculations', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    const userId = getUserIdFromToken(sessionToken);
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    const result = await pool.query(
      'SELECT * FROM calculations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    res.json({ calculations: result.rows });
  } catch (error) {
    console.error('Error fetching calculations:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'ok',
      message: 'Simple Auth Server with Database',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.json({
      status: 'error',
      message: 'Server running but database connection failed',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚛 Simple Auth Server running on port ${PORT}`);
});
