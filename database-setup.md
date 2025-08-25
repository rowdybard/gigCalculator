# 🗄️ PostgreSQL Database Setup on Render

## Overview
This guide will help you set up PostgreSQL directly on Render and configure your gig calculator to use it.

## 🚀 Step 1: Create PostgreSQL Database on Render

### 1. Create New Database
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +"
3. Select "PostgreSQL"
4. Configure:
   - **Name**: `gig-calculator-db` (or your preferred name)
   - **Database**: `gig_calculator`
   - **User**: `gig_calculator_user`
   - **Plan**: Free (or choose paid for more features)

### 2. Get Connection Details
After creation, Render will show:
- **Internal Database URL**: `postgresql://user:password@host:port/database`
- **External Database URL**: For connecting from outside Render
- **Username, Password, Host, Port, Database name**

## 🔧 Step 2: Update Dependencies

Replace MongoDB dependencies with PostgreSQL:

```bash
# Remove MongoDB packages
npm uninstall mongoose

# Install PostgreSQL packages
npm install pg sequelize sequelize-cli
```

## 📊 Step 3: Database Configuration

### 1. Create Database Config (`config/database.js`)
```javascript
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false // Set to console.log for debugging
});

module.exports = sequelize;
```

### 2. User Model (`models/User.js`)
```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  picture: {
    type: DataTypes.STRING
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = User;
```

### 3. Calculation Model (`models/Calculation.js`)
```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Calculation = sequelize.define('Calculation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: false
  },
  data: {
    type: DataTypes.JSONB, // PostgreSQL JSONB for better performance
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = Calculation;
```

## 🔗 Step 4: Update Server Configuration

### 1. Update `server.js`
```javascript
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const sequelize = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// CORS for development
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Database connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connected successfully');
    return sequelize.sync(); // Creates tables if they don't exist
  })
  .then(() => {
    console.log('✅ Database tables synchronized');
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
  });

// Serve static files
app.use(express.static(path.join(__dirname, './')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Gig Calculator API is running',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚛 Gig Calculator server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
```

## 🔑 Step 5: Google Cloud APIs to Enable

### Required APIs:
1. **Google+ API** (or Google Identity API)
2. **Google OAuth2 API**

### Setup Steps:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Library"
4. Search for and enable:
   - **Google+ API** (for user profile data)
   - **Google OAuth2 API** (for authentication)

### OAuth Consent Screen:
1. Go to "APIs & Services" → "OAuth consent screen"
2. Configure:
   - **App name**: "Gig Calculator"
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **Scopes**: Add `email` and `profile`

### OAuth Credentials:
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Configure:
   - **Application type**: Web application
   - **Name**: "Gig Calculator Web Client"
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/google/callback` (development)
     - `https://your-app.onrender.com/auth/google/callback` (production)

## 🌍 Step 6: Environment Variables

### Local Development (.env file):
```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your_generated_jwt_secret_here

# PostgreSQL (from Render)
DATABASE_URL=postgresql://user:password@host:port/database

# Environment
NODE_ENV=development
PORT=3000
```

### Render Environment Variables:
Set these in your Render dashboard:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `DATABASE_URL` (Render will auto-set this if you link the database)
- `NODE_ENV=production`

## 🚀 Step 7: Link Database to Web Service

### On Render:
1. Go to your web service
2. Click "Environment" tab
3. Under "Environment Variables"
4. Add `DATABASE_URL` with the value from your PostgreSQL service
5. Or use Render's "Link Database" feature for automatic linking

## 🧪 Step 8: Test Database Connection

### Local Testing:
```bash
npm run dev
```

Check console for:
- ✅ Database connected successfully
- ✅ Database tables synchronized

### Health Check:
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "Gig Calculator API is running",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 📊 Benefits of PostgreSQL on Render:

1. **Integrated**: Same dashboard as your web service
2. **Automatic Backups**: Built-in backup system
3. **SSL**: Secure connections by default
4. **Scaling**: Easy to upgrade as needed
5. **Monitoring**: Built-in performance monitoring

---

Your gig calculator is now ready for PostgreSQL and Google authentication! 🎉
