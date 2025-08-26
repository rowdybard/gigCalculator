const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const admin = require('firebase-admin');
const FirestoreSessionStore = require('./firestore-session-store');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin with service account JSON
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
  console.error('Failed to parse Firebase service account JSON:', error);
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://accounts.google.com", "https://www.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com", "https://www.googleapis.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// CORS for development
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Session configuration with Firestore store
app.use(session({
  store: new FirestoreSessionStore(db, {
    collection: 'sessions',
    ttl: 24 * 60 * 60 * 1000 // 24 hours
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, './')));

// Serve auth.js with correct MIME type
app.get('/auth.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public/auth.js'));
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Gig Calculator API is running',
    poweredBy: 'Hey Dispatch',
    timestamp: new Date().toISOString()
  });
});

// Get Google client ID for frontend
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '863699815068-abc123def456.apps.googleusercontent.com'
  });
});

// Authentication routes
app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'No ID token provided' });
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Store user session
    req.session.userId = decodedToken.uid;
    req.session.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture
    };

    // Save user to Firestore
    await db.collection('users').doc(decodedToken.uid).set({
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      lastSignIn: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ 
      success: true, 
      user: req.session.user 
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Exchange authorization code for tokens
app.post('/api/auth/token', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Exchange code for tokens using Google's token endpoint
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${req.protocol}://${req.get('host')}`,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      return res.status(400).json({ error: 'Token exchange failed' });
    }

    // Get user info from Google
    const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`);
    const userInfo = await userInfoResponse.json();

    // Create a custom token for Firebase
    const customToken = await admin.auth().createCustomToken(userInfo.id);
    
    // Store user session
    req.session.userId = userInfo.id;
    req.session.user = {
      uid: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    };

    // Save user to Firestore
    await db.collection('users').doc(userInfo.id).set({
      uid: userInfo.id,
      email: userInfo.email,
      displayName: userInfo.name,
      photoURL: userInfo.picture,
      lastSignIn: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ 
      success: true, 
      user: req.session.user 
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(401).json({ error: 'Token exchange failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/api/auth/status', (req, res) => {
  if (req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Save calculation
app.post('/api/calculations', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const calculationData = {
      userId: req.session.user.uid,
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('calculations').add(calculationData);
    
    res.json({ 
      success: true, 
      id: docRef.id 
    });
  } catch (error) {
    console.error('Save calculation error:', error);
    res.status(500).json({ error: 'Failed to save calculation' });
  }
});

// Get user calculations
app.get('/api/calculations', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const snapshot = await db.collection('calculations')
      .where('userId', '==', req.session.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const calculations = [];
    snapshot.forEach(doc => {
      calculations.push({ id: doc.id, ...doc.data() });
    });

    res.json({ calculations });
  } catch (error) {
    console.error('Get calculations error:', error);
    res.status(500).json({ error: 'Failed to get calculations' });
  }
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes by serving the main app (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Clean up expired sessions every hour
const sessionStore = new FirestoreSessionStore(db);
setInterval(() => {
  sessionStore.cleanup().catch(console.error);
}, 60 * 60 * 1000); // Every hour

app.listen(PORT, () => {
  console.log(`🚛 Gig Calculator (Powered by Hey Dispatch) server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
