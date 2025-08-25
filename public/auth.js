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
  try {
    // Load Google Identity Services
    await loadGoogleIdentity();
    
    const client = google.accounts.oauth2.initTokenClient({
      client_id: 'YOUR_GOOGLE_CLIENT_ID', // This will be provided by the server
      scope: 'openid email profile',
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
  const userInfo = document.getElementById('userInfo');
  const loginBtn = document.getElementById('loginBtn');
  const userPicture = document.getElementById('userPicture');
  const userName = document.getElementById('userName');
  
  if (userInfo && loginBtn && userPicture && userName) {
    userPicture.src = user.picture || '/default-avatar.png';
    userName.textContent = user.name || 'User';
    userInfo.classList.remove('hidden');
    loginBtn.classList.add('hidden');
  }
}

// Show login button
function showLoginButton() {
  const userInfo = document.getElementById('userInfo');
  const loginBtn = document.getElementById('loginBtn');
  
  if (userInfo && loginBtn) {
    userInfo.classList.add('hidden');
    loginBtn.classList.remove('hidden');
  }
}

// Load Google Identity Services
function loadGoogleIdentity() {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
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
