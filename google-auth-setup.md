# 🔐 Google Authentication Setup - Quick Guide

## ✅ What's Been Added

Your gig calculator now has:
- ✅ Google OAuth authentication
- ✅ PostgreSQL database integration
- ✅ User session management
- ✅ Login/logout functionality
- ✅ User profile display

## 🚀 Next Steps

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select your project
3. Enable APIs:
   - Google+ API
   - Google OAuth2 API
4. Create OAuth 2.0 credentials:
   - **Redirect URI**: `https://gigcalculator.onrender.com/auth/google/callback`

### 2. Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "PostgreSQL"
3. Name: `gig-calculator-db`
4. Plan: Free

### 3. Set Environment Variables on Render

In your Render dashboard, add these environment variables:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_generated_jwt_secret
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
```

### 4. Generate JWT Secret

Run this command to generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. Deploy

1. Push your code to GitHub
2. Render will automatically redeploy
3. Check logs for database connection success

## 🧪 Test Your Setup

1. Visit [https://gigcalculator.onrender.com](https://gigcalculator.onrender.com)
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. You should see your profile picture and name
5. Test logout functionality

## 📊 Expected Results

After successful setup:
- ✅ Users can sign in with Google
- ✅ User profiles are stored in PostgreSQL
- ✅ Sessions persist across browser sessions
- ✅ Users can log out
- ✅ Calculator functionality remains intact

## 🔧 Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check DATABASE_URL in Render environment variables
   - Ensure PostgreSQL service is running

2. **Google OAuth Error**
   - Verify redirect URI matches exactly
   - Check Google Cloud Console credentials

3. **Session Issues**
   - Ensure JWT_SECRET is set
   - Check NODE_ENV=production

### Check Logs:
- Go to Render dashboard → Logs
- Look for database connection messages
- Check for authentication errors

---

Your gig calculator will now have full user authentication! 🎉
