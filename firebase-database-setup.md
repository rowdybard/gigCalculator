# 🔥 Firebase Database Setup Guide

## ✅ **What You Need to Set Up**

1. **Firestore Security Rules** - Control who can access what data
2. **Database Collections** - Users and calculations data
3. **Authentication** - Google sign-in
4. **Configuration** - Firebase config in your app

## 🔐 **Step 1: Set Up Security Rules**

Go to **Firebase Console** → **Firestore Database** → **Rules** tab and paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only access their own calculations
    match /calculations/{calculationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Allow users to create new calculations
    match /calculations/{calculationId} {
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
  }
}
```

Click **"Publish"** to save the rules.

## 🗄️ **Step 2: Database Structure**

Your Firestore will have these collections:

### **Users Collection**
```
users/{userId}
├── uid: string
├── email: string
├── displayName: string
├── photoURL: string
├── lastSignIn: timestamp
└── createdAt: timestamp
```

### **Calculations Collection**
```
calculations/{calculationId}
├── userId: string
├── platform: string
├── hours: number
├── miles: number
├── basePay: number
├── tips: number
├── grossHourly: number
├── realHourly: number
├── netProfit: number
└── createdAt: timestamp
```

## ⚙️ **Step 3: Update Your Firebase Config**

Replace the placeholder values in `firebase-config.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Your actual API key
  authDomain: "gig-calculator.firebaseapp.com", // Your actual domain
  projectId: "gig-calculator", // Your actual project ID
  storageBucket: "gig-calculator.appspot.com", // Your actual storage bucket
  messagingSenderId: "123456789", // Your actual sender ID
  appId: "1:123456789:web:abcdef..." // Your actual app ID
};
```

## 🔐 **Step 4: Enable Authentication**

1. Go to **Firebase Console** → **Authentication**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **"Google"** provider
5. Add your project support email
6. Click **"Save"**

## 🚀 **Step 5: Test Your Setup**

1. Deploy your app
2. Visit your app URL
3. Click **"Sign in with Google"**
4. Complete the OAuth flow
5. Try the **"Save"** button
6. Check Firebase Console → Firestore to see data

## 📊 **What Happens When Users Sign In**

1. **User signs in with Google**
2. **User account created** in `users` collection
3. **User data stored** with Firebase Auth UID
4. **User can save calculations** to `calculations` collection
5. **Data is secure** - users only see their own data

## 🔧 **Security Rules Explained**

### **Users Collection:**
- Users can only read/write their own user document
- Document ID must match their Firebase Auth UID

### **Calculations Collection:**
- Users can only access calculations where `userId` matches their UID
- Users can create new calculations with their UID
- Users cannot access other users' calculations

## 📱 **User Experience**

### **First-Time User:**
1. Signs in with Google
2. Account automatically created in Firestore
3. Can immediately save calculations
4. Data persists across devices

### **Returning User:**
1. Automatically logged in
2. Can access saved calculations
3. Can save new calculations
4. Data syncs across all devices

## 🔍 **Troubleshooting**

### **If calculations don't save:**
1. Check Firebase Console → Firestore for errors
2. Verify security rules are published
3. Check browser console for errors
4. Ensure user is authenticated

### **If authentication fails:**
1. Check Google provider is enabled
2. Verify Firebase config is correct
3. Check domain is authorized
4. Look for console errors

### **If rules don't work:**
1. Make sure rules are published
2. Check syntax in rules editor
3. Test with Firebase Console
4. Verify user authentication

## 📈 **Database Usage**

### **Free Tier Limits:**
- **50,000 reads/day**
- **20,000 writes/day**
- **20,000 deletes/day**
- **1GB stored data**

### **For a gig calculator app:**
- Each user saves ~10-20 calculations
- Very low usage - well within free limits
- Can handle thousands of users

## 🎯 **Next Steps**

Once database is working:
1. Add calculation history display
2. Implement data export
3. Add user preferences
4. Set up analytics

---

**Your Firebase database is now ready for user accounts and calculation storage!** 🚛✨
