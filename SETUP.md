# 🚛 Gig Calculator Setup Guide

## 📋 **Environment Variables Needed**

You need to set these environment variables in your Render dashboard:

### **Database (PostgreSQL)**
```
DATABASE_URL=postgresql://username:password@host:port/database
```

### **Google OAuth**
```
GOOGLE_CLIENT_ID=857672033553-l35tnpme67c0vd3526ruedg9sjras5ds.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## 🔧 **Setup Steps**

### **1. Create PostgreSQL Database on Render**
1. Go to your Render dashboard
2. Click "New" → "PostgreSQL"
3. Name it `gigcalculator-db`
4. Copy the `DATABASE_URL` from the database settings

### **2. Get Google Client Secret**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Find your OAuth 2.0 Client ID
5. Click "Download JSON" to get the client secret

### **3. Set Environment Variables**
1. Go to your web service settings on Render
2. Add these environment variables:
   - `DATABASE_URL` (from step 1)
   - `GOOGLE_CLIENT_ID` (you already have this)
   - `GOOGLE_CLIENT_SECRET` (from step 2)

### **4. Update Google OAuth Redirect URI**
1. In Google Cloud Console
2. Go to "APIs & Services" → "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add this redirect URI:
   ```
   https://your-app-name.onrender.com/api/auth/google/callback
   ```

## ✅ **What This Gives You**

- **User Accounts**: Real user accounts stored in PostgreSQL
- **Calculation History**: All calculations saved to database
- **Secure Sessions**: Proper session management
- **Scalable**: Can handle many users and calculations
- **Future-Ready**: Easy to add more features

## 🚀 **Deploy**

Once you've set up the environment variables, deploy to Render and it will:
1. Create the database tables automatically
2. Handle user authentication
3. Save and retrieve calculations
4. Work with real user accounts

The app will be much more robust and ready for real users! 🎉
