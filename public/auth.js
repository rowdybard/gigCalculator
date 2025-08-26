// Client-side authentication functions

// Check if user is signed in
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/status');
    const data = await response.json();
    
    if (data.authenticated) {
      showUserInfo(data.user);
    } else {
      showLoginButton();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showLoginButton();
  }
}

// Sign in with Google
async function signInWithGoogle() {
  console.log('signInWithGoogle function called');
  try {
    // Load Google Identity Services
    await loadGoogleIdentity();
    
    // Get client ID from server
    const configResponse = await fetch('/api/config');
    const config = await configResponse.json();
    
    const client = google.accounts.oauth2.initTokenClient({
      client_id: config.googleClientId,
      scope: 'openid email profile',
      redirect_uri: window.location.origin,
      callback: async (response) => {
        if (response.access_token) {
          // Get user info and ID token
          const userInfo = await getUserInfo(response.access_token);
          const idToken = await getIdToken(response.access_token);
          
          // Send to server for verification
          const serverResponse = await fetch('/api/auth/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken })
          });
          
          const result = await serverResponse.json();
          
          if (result.success) {
            showUserInfo(result.user);
            showNotification('Signed in successfully!', 'success');
          } else {
            showNotification('Sign-in failed', 'error');
          }
        }
      }
    });
    
    client.requestAccessToken();
  } catch (error) {
    console.error('Sign-in error:', error);
    showNotification('Sign-in failed. Please try again.', 'error');
  }
}

// Sign out
async function signOut() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST'
    });
    
    if (response.ok) {
      showLoginButton();
      showNotification('Signed out successfully', 'success');
    } else {
      showNotification('Sign-out failed', 'error');
    }
  } catch (error) {
    console.error('Sign-out error:', error);
    showNotification('Sign-out failed', 'error');
  }
}

// Save calculation
async function saveCalculation(calculationData) {
  try {
    const response = await fetch('/api/calculations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calculationData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification('Calculation saved successfully!', 'success');
    } else {
      showNotification('Failed to save calculation', 'error');
    }
  } catch (error) {
    console.error('Save calculation error:', error);
    showNotification('Failed to save calculation', 'error');
  }
}

// Load user calculations
async function loadUserCalculations() {
  try {
    const response = await fetch('/api/calculations');
    const result = await response.json();
    
    if (response.ok) {
      return result.calculations || [];
    } else {
      console.error('Failed to load calculations:', result.error);
      return [];
    }
  } catch (error) {
    console.error('Load calculations error:', error);
    return [];
  }
}

// Show user information in UI
function showUserInfo(user) {
  // Hide lock overlay and show login button
  const lockOverlay = document.getElementById('lockOverlay');
  const loginBtn = document.getElementById('loginBtn');
  
  if (lockOverlay) {
    lockOverlay.style.display = 'none';
  }
  
  if (loginBtn) {
    loginBtn.style.display = 'none';
  }
  
  // Update user info if elements exist
  const userInfo = document.getElementById('userInfo');
  const userPicture = document.getElementById('userPicture');
  const userName = document.getElementById('userName');
  
  if (userInfo && userPicture && userName) {
    userPicture.src = user.picture || '/default-avatar.png';
    userName.textContent = user.name || 'User';
    userInfo.classList.remove('hidden');
  }
}

// Show login button
function showLoginButton() {
  // Show lock overlay and login button
  const lockOverlay = document.getElementById('lockOverlay');
  const loginBtn = document.getElementById('loginBtn');
  
  if (lockOverlay) {
    lockOverlay.style.display = 'flex';
  }
  
  if (loginBtn) {
    loginBtn.style.display = 'block';
  }
  
  // Update user info if elements exist
  const userInfo = document.getElementById('userInfo');
  
  if (userInfo) {
    userInfo.classList.add('hidden');
  }
}

// Load Google Identity Services
function loadGoogleIdentity() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) {
      resolve();
      return;
    }
    
    // Check if script is already loading
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Wait a bit for Google to initialize
      setTimeout(resolve, 100);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Get user info from Google
async function getUserInfo(accessToken) {
  const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
  return await response.json();
}

// Get ID token from Google
async function getIdToken(accessToken) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
  const data = await response.json();
  return data.id_token;
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-semibold z-50 transform transition-all duration-300 ${
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' :
    type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
  }`;
  notification.textContent = message;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
