# Gig Worker Pay Calculator

A comprehensive calculator for gig workers to determine their true hourly rates after accounting for expenses like gas, wear and tear, and taxes.

## Features

- **Real-time calculations** for gross and net hourly rates
- **Expense tracking** including fuel costs, vehicle wear & tear, and taxes
- **Per-mile rate analysis** for both total miles and on-trip miles
- **Scorecard generation** with social media sharing
- **Google authentication** for saving calculations
- **Firebase integration** for secure data storage

## Tech Stack

- **Frontend**: HTML5, CSS3 (Tailwind), Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Authentication**: Google OAuth 2.0
- **Database**: Firebase Firestore
- **Hosting**: Render (Web Service)

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Google provider
   - Add your domain to authorized domains
4. Enable Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
   - Set up security rules (see below)
5. Create Service Account:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

### 2. Environment Variables

1. Copy `env.example` to `.env`
2. Get your Firebase service account JSON:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
3. Copy the entire JSON content into the `FIREBASE_SERVICE_ACCOUNT` variable:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id","private_key_id":"your-private-key-id","private_key":"-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com","client_id":"your-client-id","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"}
SESSION_SECRET=your-session-secret-key
NODE_ENV=production
PORT=3000
```

### 3. Firebase Security Rules

Set up Firestore security rules:

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
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

### 4. Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open http://localhost:3000

### 5. Deployment on Render

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Set environment variables in Render dashboard
5. Deploy

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/google` - Google authentication
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check authentication status
- `POST /api/calculations` - Save calculation
- `GET /api/calculations` - Get user calculations

## File Structure

```
├── index.html          # Main application
├── server.js           # Express server
├── public/
│   └── auth.js         # Client-side auth functions
├── package.json        # Dependencies
├── env.example         # Environment variables template
└── README.md           # This file
```

## Security Features

- Firebase Admin SDK for server-side operations
- Environment variables for sensitive data
- Helmet.js for security headers
- CORS protection
- Session-based authentication
- Firestore security rules

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
