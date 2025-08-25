# 🔐 User Authentication Flow

## 👤 **First-Time Users (Account Creation)**

### What Happens:
1. **Visit Site**: User goes to [https://gigcalculator.onrender.com](https://gigcalculator.onrender.com)
2. **See Login Button**: "Sign in with Google" button is visible
3. **Click Sign In**: User clicks the Google sign-in button
4. **Google OAuth**: Redirected to Google's consent screen
5. **Grant Permission**: User authorizes the app to access their profile
6. **Account Created**: System automatically creates a new user account in PostgreSQL
7. **Logged In**: User is redirected back and automatically logged in
8. **Profile Displayed**: User sees their name and profile picture

### Database Entry Created:
```sql
INSERT INTO Users (id, googleId, email, name, picture, createdAt, updatedAt)
VALUES (uuid, 'google_user_id', 'user@email.com', 'John Doe', 'profile_pic_url', NOW(), NOW());
```

## 🔄 **Returning Users (Automatic Login)**

### What Happens:
1. **Visit Site**: User returns to the site
2. **Session Check**: Browser sends session cookie
3. **Auto Login**: If session is valid, user is automatically logged in
4. **Profile Displayed**: User sees their name and profile picture
5. **Ready to Use**: Calculator is immediately available

### Session Persistence:
- **Duration**: 24 hours (configurable)
- **Storage**: Secure HTTP-only cookies
- **Security**: JWT-secured sessions

## 🚪 **Logout Process**

### What Happens:
1. **Click Logout**: User clicks "Logout" button
2. **Session Destroyed**: Server destroys the session
3. **Cookie Cleared**: Browser removes session cookie
4. **Redirected**: User returns to login state
5. **Login Button**: "Sign in with Google" button appears again

## 📊 **User Experience Summary**

| Scenario | What User Sees | What Happens Behind the Scenes |
|----------|----------------|--------------------------------|
| **First Visit** | Login button | No account exists yet |
| **First Sign In** | Google OAuth flow | Account created automatically |
| **Return Visit** | Profile + name | Session restored automatically |
| **Logout** | Login button again | Session destroyed |

## 🔧 **Technical Implementation**

### Account Creation Logic:
```javascript
// In config/passport.js
let user = await User.findOne({ where: { googleId: profile.id } });
if (!user) {
  // First-time user - create account
  user = await User.create({
    googleId: profile.id,
    email: profile.emails[0].value,
    name: profile.displayName,
    picture: profile.photos[0].value
  });
}
// User is now logged in (new or existing)
```

### Session Management:
```javascript
// In server.js
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

## ✅ **Benefits of This Flow**

1. **Seamless Experience**: No manual account creation required
2. **Secure**: Uses Google's proven OAuth system
3. **Persistent**: Users stay logged in across browser sessions
4. **Simple**: One-click sign-in process
5. **Reliable**: Google handles password security

## 🎯 **User Journey**

```
First Visit → Click "Sign in with Google" → Google OAuth → Account Created → Logged In
     ↓
Return Visit → Automatically Logged In → Use Calculator
     ↓
Logout → Session Cleared → Back to Login State
```

---

**The system handles everything automatically!** Users just need to click "Sign in with Google" once, and they're set for future visits. 🎉
