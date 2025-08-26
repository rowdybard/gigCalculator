// Basic Google OAuth Authentication
console.log('Basic auth script loaded');

// Google OAuth configuration
const GOOGLE_CLIENT_ID = '857672033553-l35tnpme67c0vd3526ruedg9sjras5ds.apps.googleusercontent.com';
const REDIRECT_URI = window.location.origin;

// Simple sign in function
function signInWithGoogle() {
  console.log('Starting Google sign-in...');
  
  // Create Google OAuth URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=openid%20email%20profile&` +
    `access_type=offline`;
  
  // Redirect to Google
  window.location.href = authUrl;
}

// Simple sign out function
function signOut() {
  console.log('Signing out...');
  localStorage.removeItem('user');
  showLoginButton();
  showNotification('Signed out successfully', 'success');
}

// Check auth status
function checkAuthStatus() {
  // Check if we're returning from OAuth
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (code) {
    console.log('OAuth code received, processing...');
    processOAuthCode(code);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    // Check if user is already signed in
    const user = localStorage.getItem('user');
    if (user) {
      console.log('User found in localStorage');
      showUserInfo(JSON.parse(user));
    } else {
      console.log('No user found, showing login');
      showLoginButton();
    }
  }
}

// Process OAuth code (simplified - just store user info)
function processOAuthCode(code) {
  console.log('Processing OAuth code...');
  
  // For simplicity, we'll just create a mock user
  // In a real app, you'd exchange the code for tokens on the server
  const mockUser = {
    email: 'user@example.com',
    name: 'Signed In User',
    picture: 'https://via.placeholder.com/40'
  };
  
  // Store user info
  localStorage.setItem('user', JSON.stringify(mockUser));
  
  // Show user info
  showUserInfo(mockUser);
  showNotification('Signed in successfully!', 'success');
}

// Show user info
function showUserInfo(user) {
  const lockOverlay = document.getElementById('lockOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const userInfo = document.getElementById('userInfo');
  const userPicture = document.getElementById('userPicture');
  const userName = document.getElementById('userName');
  
  // Hide lock overlay and login button
  if (lockOverlay) lockOverlay.style.display = 'none';
  if (loginBtn) loginBtn.style.display = 'none';
  
  // Show user info
  if (userInfo && userPicture && userName) {
    userPicture.src = user.picture || '/default-avatar.png';
    userName.textContent = user.name || 'User';
    userInfo.classList.remove('hidden');
  }
}

// Show login button
function showLoginButton() {
  const lockOverlay = document.getElementById('lockOverlay');
  const loginBtn = document.getElementById('loginBtn');
  const userInfo = document.getElementById('userInfo');
  
  // Show lock overlay and login button
  if (lockOverlay) lockOverlay.style.display = 'flex';
  if (loginBtn) loginBtn.style.display = 'block';
  
  // Hide user info
  if (userInfo) userInfo.classList.add('hidden');
}

// Simple notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-semibold z-50 ${
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' : 'bg-blue-600'
  }`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// Make functions globally available
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.checkAuthStatus = checkAuthStatus;
window.showUserInfo = showUserInfo;
window.showLoginButton = showLoginButton;
window.showNotification = showNotification;

// Initialize auth status
checkAuthStatus();
