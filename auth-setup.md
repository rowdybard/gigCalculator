# 🔐 Authentication Setup Guide

## Overview
This guide will help you add Google login and user account creation to your gig calculator.

## 🚀 Phase 1: Basic Web Service Setup

### Current Setup
- ✅ Express.js server (`server.js`)
- ✅ Static file serving
- ✅ Security middleware (Helmet, CORS)
- ✅ Health check endpoint
- ✅ Ready for Render deployment

### Next Steps for Authentication

## 🔑 Phase 2: Google OAuth Setup

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://your-app.onrender.com/auth/google/callback` (production)

### 2. Environment Variables
Create `.env` file:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret_key
MONGODB_URI=your_mongodb_connection_string
```

### 3. Database Setup (MongoDB)
- Sign up for [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)
- Create a cluster
- Get your connection string
- Add to environment variables

## 📦 Phase 3: Install Authentication Dependencies

```bash
npm install passport passport-google-oauth20 jsonwebtoken mongoose dotenv express-session
```

## 🔧 Phase 4: Implementation Steps

### 1. User Model (`models/User.js`)
```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: String,
  email: String,
  name: String,
  picture: String,
  savedCalculations: [{
    platform: String,
    data: Object,
    createdAt: Date
  }]
});

module.exports = mongoose.model('User', userSchema);
```

### 2. Authentication Routes (`routes/auth.js`)
```javascript
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google'), (req, res) => {
  // Handle successful authentication
});

// Logout route
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
```

### 3. Passport Configuration (`config/passport.js`)
```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0].value
      });
    }
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
```

## 🎨 Phase 5: Frontend Integration

### 1. Add Login Button to HTML
```html
<!-- Add this to your index.html -->
<div id="auth-section" class="hidden">
  <button id="loginBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg">
    <i class="fab fa-google mr-2"></i>Sign in with Google
  </button>
  <div id="userInfo" class="hidden">
    <img id="userPicture" class="w-8 h-8 rounded-full" />
    <span id="userName"></span>
    <button id="logoutBtn" class="text-red-500">Logout</button>
  </div>
</div>
```

### 2. Authentication JavaScript
```javascript
// Add to your existing script
function checkAuthStatus() {
  fetch('/api/auth/status')
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        showUserInfo(data.user);
      } else {
        showLoginButton();
      }
    });
}

function showUserInfo(user) {
  document.getElementById('userPicture').src = user.picture;
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userInfo').classList.remove('hidden');
  document.getElementById('loginBtn').classList.add('hidden');
}

function showLoginButton() {
  document.getElementById('userInfo').classList.add('hidden');
  document.getElementById('loginBtn').classList.remove('hidden');
}

// Event listeners
document.getElementById('loginBtn').addEventListener('click', () => {
  window.location.href = '/auth/google';
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  window.location.href = '/auth/logout';
});
```

## 🚀 Phase 6: Render Deployment

### 1. Update Render Configuration
- Service Type: **Web Service**
- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variables: Add all your `.env` variables

### 2. Environment Variables on Render
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `MONGODB_URI`
- `NODE_ENV=production`

## 📊 Phase 7: User Features

### Saved Calculations
- Users can save their calculator inputs
- View calculation history
- Share saved calculations
- Export data

### User Dashboard
- Profile management
- Earnings tracking over time
- Platform comparison tools
- Tax estimation tools

## 🔒 Security Considerations

1. **HTTPS Only**: Render provides this automatically
2. **Secure Headers**: Already configured with Helmet
3. **JWT Tokens**: For API authentication
4. **Input Validation**: Sanitize all user inputs
5. **Rate Limiting**: Prevent abuse

## 🧪 Testing

### Local Development
```bash
npm run dev
```

### Test Authentication Flow
1. Click "Sign in with Google"
2. Complete Google OAuth
3. Verify user data is saved
4. Test logout functionality

## 📈 Future Enhancements

- Email notifications
- Data export (CSV, PDF)
- Advanced analytics
- Multi-user sharing
- API for mobile apps

---

This setup gives you a solid foundation for user authentication and account management! 🎉
