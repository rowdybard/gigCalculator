// PostgreSQL-backed Google OAuth Authentication
console.log('PostgreSQL auth script loaded');

// Google OAuth configuration
const GOOGLE_CLIENT_ID = '857672033553-l35tnpme67c0vd3526ruedg9sjras5ds.apps.googleusercontent.com';
const REDIRECT_URI = `${window.location.origin}/api/auth/google/callback`;

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
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('user');
  showLoginButton();
  showNotification('Signed out successfully', 'success');
}

// Check auth status
function checkAuthStatus() {
  console.log('Checking auth status...');
  console.log('Current URL:', window.location.href);
  
  // Check if we're returning from OAuth with session token
  const urlParams = new URLSearchParams(window.location.search);
  const sessionToken = urlParams.get('session');
  const error = urlParams.get('error');
  
  console.log('URL params - session:', sessionToken ? 'YES' : 'NO', 'error:', error || 'NONE');
  
  if (error) {
    console.error('Auth error:', error);
    showNotification('Authentication failed. Please try again.', 'error');
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  
  if (sessionToken) {
    console.log('Session token received, storing...');
    console.log('Session token length:', sessionToken.length);
    localStorage.setItem('sessionToken', sessionToken);
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    // Get user info
    getUserInfo();
  } else {
    // Check if user is already signed in
    const storedToken = localStorage.getItem('sessionToken');
    console.log('Stored token in localStorage:', storedToken ? 'YES' : 'NO');
    if (storedToken) {
      console.log('Session token found in localStorage');
      getUserInfo();
    } else {
      console.log('No session token found, showing login');
      showLoginButton();
    }
  }
}

// Get user info from server
async function getUserInfo() {
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    console.log('Getting user info with token:', sessionToken ? 'YES' : 'NO');
    
    if (!sessionToken) {
      console.log('No session token, showing login');
      showLoginButton();
      return;
    }

    console.log('Making request to /api/user...');
    const response = await fetch('/api/user', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (response.ok) {
      const user = await response.json();
      console.log('User info received:', user);
      localStorage.setItem('user', JSON.stringify(user));
      showUserInfo(user);
    } else {
      const errorText = await response.text();
      console.log('Session expired or invalid. Response:', errorText);
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');
      showLoginButton();
    }
  } catch (error) {
    console.error('Get user info error:', error);
    showLoginButton();
  }
}

// Save calculation to database
async function saveCalculation(calculationData) {
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      showNotification('Please sign in to save calculations', 'error');
      return false;
    }

    const response = await fetch('/api/calculations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify(calculationData)
    });

    if (response.ok) {
      const saved = await response.json();
      console.log('Calculation saved:', saved);
      showNotification('Calculation saved successfully!', 'success');
      return true;
    } else {
      console.error('Save calculation failed');
      showNotification('Failed to save calculation', 'error');
      return false;
    }
  } catch (error) {
    console.error('Save calculation error:', error);
    showNotification('Failed to save calculation', 'error');
    return false;
  }
}

// Get user calculations from database
async function getUserCalculations() {
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      return [];
    }

    const response = await fetch('/api/calculations', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    if (response.ok) {
      const calculations = await response.json();
      console.log('User calculations:', calculations);
      return calculations;
    } else {
      console.error('Get calculations failed');
      return [];
    }
  } catch (error) {
    console.error('Get calculations error:', error);
    return [];
  }
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
    userPicture.src = user.picture_url || '/default-avatar.png';
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
window.getUserInfo = getUserInfo;
window.saveCalculation = saveCalculation;
window.getUserCalculations = getUserCalculations;
window.showUserInfo = showUserInfo;
window.showLoginButton = showLoginButton;
window.showNotification = showNotification;

// Initialize auth status
checkAuthStatus();
