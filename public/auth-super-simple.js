// Super simple Google OAuth
console.log('Super simple auth loaded');

// This will need to be updated to use the new client ID once you create it
const GOOGLE_CLIENT_ID = '857672033553-l35tnpme67c0vd3526ruedg9sjras5ds.apps.googleusercontent.com';

// Sign in with Google
function signInWithGoogle() {
  const redirectUri = `${window.location.origin}/auth/callback`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=openid%20email%20profile`;
  
  console.log('Redirecting to:', authUrl);
  window.location.href = authUrl;
}

// Sign out
function signOut() {
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('user');
  showLoginButton();
  showNotification('Signed out successfully', 'success');
}

// Check auth status on page load
function checkAuthStatus() {
  // Check if we're returning from OAuth with session token
  const urlParams = new URLSearchParams(window.location.search);
  const sessionToken = urlParams.get('session');
  const userId = urlParams.get('user_id');
  const error = urlParams.get('error');
  
  if (error) {
    console.error('Auth error:', error);
    showNotification('Authentication failed. Please try again.', 'error');
    showLoginButton();
    return;
  }
  
  if (sessionToken && userId) {
    // Store session token and get user info from database
    localStorage.setItem('sessionToken', sessionToken);
    localStorage.setItem('userId', userId);
    console.log('Session token received, getting user info...');
    getUserInfo();
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  
  // Check if user is already signed in
  const storedToken = localStorage.getItem('sessionToken');
  if (storedToken) {
    console.log('Session token found, getting user info...');
    getUserInfo();
  } else {
    showLoginButton();
  }
}

// Get user info from database
async function getUserInfo() {
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    
    if (!sessionToken) {
      console.log('No session token, showing login');
      showLoginButton();
      return;
    }

    const response = await fetch('/api/user', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    if (response.ok) {
      const user = await response.json();
      console.log('User info received:', user);
      localStorage.setItem('user', JSON.stringify(user));
      showUserInfo(user);
    } else {
      console.error('Failed to get user info, response:', response.status);
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
      showLoginButton();
    }
  } catch (error) {
    console.error('Error getting user info:', error);
    showLoginButton();
  }
}

// Save calculation to database
async function saveCalculation(calculationData) {
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    
    if (!sessionToken) {
      console.log('No session token, cannot save to database');
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
      const result = await response.json();
      console.log('Calculation saved to database:', result);
      showNotification('Calculation saved successfully', 'success');
      return true;
    } else {
      console.error('Failed to save calculation:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error saving calculation:', error);
    return false;
  }
}

// Get user calculations from database
async function getUserCalculations() {
  try {
    const sessionToken = localStorage.getItem('sessionToken');
    
    if (!sessionToken) {
      console.log('No session token, cannot get calculations');
      return [];
    }

    const response = await fetch('/api/calculations', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Retrieved calculations:', result.calculations.length);
      return result.calculations;
    } else {
      console.error('Failed to get calculations:', response.status);
      return [];
    }
  } catch (error) {
    console.error('Error getting calculations:', error);
    return [];
  }
}

// Show login button and lock calculator
function showLoginButton() {
  const lockOverlay = document.getElementById('lockOverlay');
  const userInfo = document.getElementById('userInfo');
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  
  if (lockOverlay) lockOverlay.style.display = 'flex';
  if (userInfo) userInfo.style.display = 'none';
  if (loginButton) loginButton.style.display = 'inline-block';
  if (logoutButton) logoutButton.style.display = 'none';
}

// Show user info and unlock calculator
function showUserInfo(user) {
  const lockOverlay = document.getElementById('lockOverlay');
  const userInfo = document.getElementById('userInfo');
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  
  if (lockOverlay) lockOverlay.style.display = 'none';
  if (userInfo) {
    userInfo.style.display = 'flex';
    userInfo.innerHTML = `
      <img src="${user.picture}" alt="Profile" class="w-8 h-8 rounded-full">
      <span class="text-sm">${user.name}</span>
    `;
  }
  if (loginButton) loginButton.style.display = 'none';
  if (logoutButton) logoutButton.style.display = 'inline-block';
}

// Show notification
function showNotification(message, type = 'info') {
  console.log(`${type.toUpperCase()}: ${message}`);
  // You can add a toast notification here if needed
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', checkAuthStatus);

// Make functions globally available
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.getUserInfo = getUserInfo;
window.saveCalculation = saveCalculation;
window.getUserCalculations = getUserCalculations;
