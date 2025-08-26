const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// Database initialization
async function initDatabase() {
  try {
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

// API Routes

// Test OAuth URL
app.get('/api/test-oauth', (req, res) => {
  const redirectUri = process.env.NODE_ENV === 'production' ? `https://${req.get('host')}` : `${req.protocol}://${req.get('host')}`;
  res.json({
    redirectUri,
    clientId: process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    oauthUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&access_type=offline`
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'ok',
      message: 'Gig Calculator API is running',
      poweredBy: 'Hey Dispatch',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.json({
      status: 'error',
      message: 'Gig Calculator API is running but database connection failed',
      poweredBy: 'Hey Dispatch',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Google OAuth callback
app.get('/', async (req, res) => {
  console.log('Root route hit - URL:', req.url);
  console.log('Query params:', req.query);
  
  // Check if this is an OAuth callback
  const { code } = req.query;
  
  if (code) {
    console.log('OAuth callback received with code:', code ? 'YES' : 'NO');
    
    if (!code) {
      console.error('No code received in OAuth callback');
      return res.redirect('/?error=no_code');
    }

    try {
      console.log('Exchanging code for tokens...');
      
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
                 body: new URLSearchParams({
           code,
           client_id: process.env.GOOGLE_CLIENT_ID,
           client_secret: process.env.GOOGLE_CLIENT_SECRET,
           redirect_uri: process.env.NODE_ENV === 'production' ? `https://${req.get('host')}` : `${req.protocol}://${req.get('host')}`,
           grant_type: 'authorization_code',
         }),
      });

      const tokens = await tokenResponse.json();
      console.log('Token response received:', tokens.error ? 'ERROR' : 'SUCCESS');

      if (tokens.error) {
        console.error('Token exchange error:', tokens);
        return res.redirect('/?error=token_exchange_failed');
      }

      console.log('Getting user info from Google...');
      
      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      const userData = await userResponse.json();
      console.log('User data received:', userData.email);

      // Find or create user in database
      let user = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [userData.id]
      );

      if (user.rows.length === 0) {
        console.log('Creating new user...');
        // Create new user
        user = await pool.query(
          'INSERT INTO users (google_id, email, name, picture_url) VALUES ($1, $2, $3, $4) RETURNING *',
          [userData.id, userData.email, userData.name, userData.picture]
        );
      } else {
        console.log('Updating existing user...');
        // Update existing user
        user = await pool.query(
          'UPDATE users SET email = $1, name = $2, picture_url = $3, updated_at = CURRENT_TIMESTAMP WHERE google_id = $4 RETURNING *',
          [userData.email, userData.name, userData.picture, userData.id]
        );
      }

      // Create session token (simple JWT-like approach)
      const sessionToken = Buffer.from(JSON.stringify({
        userId: user.rows[0].id,
        email: user.rows[0].email,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      })).toString('base64');

      console.log('Session token created, redirecting to app...');
      console.log('Redirect URL:', `/?session=${sessionToken}`);

      // Redirect to app with session token
      return res.redirect(`/?session=${sessionToken}`);

    } catch (error) {
      console.error('OAuth callback error:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      return res.redirect('/?error=auth_failed');
    }
  }

  // If no OAuth code, serve the main app
  res.sendFile(path.join(__dirname, 'index.html'));
});



// Get current user
app.get('/api/user', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token' });
    }

    const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    
    if (sessionData.exp < Date.now()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const user = await pool.query('SELECT id, email, name, picture_url FROM users WHERE id = $1', [sessionData.userId]);
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save calculation
app.post('/api/calculations', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token' });
    }

    const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    
    if (sessionData.exp < Date.now()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const {
      gross_hourly,
      net_hourly,
      fuel_cost,
      wear_tear_cost,
      tax_rate,
      gross_per_mile,
      net_per_mile,
      gross_per_mile_all,
      net_per_mile_all,
      score
    } = req.body;

    const result = await pool.query(
      `INSERT INTO calculations (
        user_id, gross_hourly, net_hourly, fuel_cost, wear_tear_cost, 
        tax_rate, gross_per_mile, net_per_mile, gross_per_mile_all, 
        net_per_mile_all, score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [sessionData.userId, gross_hourly, net_hourly, fuel_cost, wear_tear_cost, 
       tax_rate, gross_per_mile, net_per_mile, gross_per_mile_all, 
       net_per_mile_all, score]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Save calculation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user calculations
app.get('/api/calculations', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token' });
    }

    const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    
    if (sessionData.exp < Date.now()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const calculations = await pool.query(
      'SELECT * FROM calculations WHERE user_id = $1 ORDER BY created_at DESC',
      [sessionData.userId]
    );

    res.json(calculations.rows);
  } catch (error) {
    console.error('Get calculations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve auth-basic.js with correct MIME type
app.get('/auth-basic.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public/auth-basic.js'));
});



// Debug route to catch all requests
app.get('*', (req, res) => {
  console.log('Catch-all route hit:', req.method, req.url);
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);
  
  // If this is an OAuth callback, handle it
  const { code } = req.query;
  if (code) {
    console.log('OAuth callback found in catch-all route!');
    // Handle OAuth callback here
    return res.redirect('/?code=' + code);
  }
  
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚛 Gig Calculator running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
