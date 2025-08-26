// Production-ready authentication system
console.log('🔐 Authentication system loaded');

// Authentication state management
let currentUser = null;
let authInitialized = false;

// Initialize authentication system
async function initAuth() {
  if (authInitialized) return;
  
  console.log('Initializing authentication system...');
  
  try {
    // Check authentication status
    await checkAuthStatus();
    
    // Handle OAuth callback
    handleOAuthCallback();
    
    authInitialized = true;
    console.log('✅ Authentication system initialized');
  } catch (error) {
    console.error('❌ Auth initialization error:', error);
    showLoginInterface();
  }
}

// Check current authentication status
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/status', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        currentUser = data.user;
        console.log('User authenticated:', data.user.email);
        await loadUserData();
        showUserInterface();
      } else {
        console.log('User not authenticated');
        showLoginInterface();
      }
    } else {
      console.log('Auth status check failed');
      showLoginInterface();
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    showLoginInterface();
  }
}

// Handle OAuth callback from Google
function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const authStatus = urlParams.get('auth');
  const error = urlParams.get('error');
  
  if (error) {
    console.error('OAuth error:', error);
    showNotification('Authentication failed. Please try again.', 'error');
    showLoginInterface();
  } else if (authStatus === 'success') {
    console.log('OAuth success, loading user data...');
    showNotification('Successfully signed in!', 'success');
    // Reload to get user data
    window.history.replaceState({}, document.title, window.location.pathname);
    checkAuthStatus();
  }
}

// Load comprehensive user data
async function loadUserData() {
  try {
    const response = await fetch('/api/user', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      currentUser = userData;
      console.log('User data loaded:', userData);
      
      // Apply user preferences to the calculator
      applyUserPreferences(userData.preferences);
      
      // Update UI with user stats
      updateUserStats(userData.stats);
      
      return userData;
    } else {
      console.error('Failed to load user data');
      return null;
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    return null;
  }
}

// Apply user preferences to calculator defaults
function applyUserPreferences(preferences) {
  if (!preferences) return;
  
  // Set default values based on user preferences
  const mpgInput = document.getElementById('mpg');
  const wearTearInput = document.getElementById('wearTear');
  const taxInput = document.getElementById('tax');
  
  if (mpgInput && preferences.default_mpg) {
    mpgInput.value = preferences.default_mpg;
  }
  
  if (wearTearInput && preferences.default_wear_tear_rate) {
    wearTearInput.value = preferences.default_wear_tear_rate;
  }
  
  if (taxInput && preferences.default_tax_rate) {
    taxInput.value = preferences.default_tax_rate;
  }
  
  console.log('Applied user preferences to calculator');
}

// Update user statistics display
function updateUserStats(stats) {
  if (!stats) return;
  
  const statsContainer = document.getElementById('userStats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="text-xs text-gray-600 space-y-1">
        <div>Total Calculations: ${stats.total_calculations}</div>
        <div>This Month: ${stats.calculations_this_month}</div>
        <div>Average Score: ${stats.average_score ? Math.round(stats.average_score) : 'N/A'}</div>
      </div>
    `;
  }
}

// Show login interface
function showLoginInterface() {
  const lockOverlay = document.getElementById('lockOverlay');
  const userInfo = document.getElementById('userInfo');
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  
  if (lockOverlay) {
    lockOverlay.style.display = 'flex';
    lockOverlay.innerHTML = `
      <div class="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
        <div class="mb-6">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-lock text-blue-600 text-2xl"></i>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Welcome to Gig Calculator</h2>
          <p class="text-gray-600">Sign in with Google to save your calculations and access advanced features</p>
        </div>
        
        <button onclick="signInWithGoogle()" class="w-full bg-white border border-gray-300 rounded-lg px-6 py-3 flex items-center justify-center space-x-3 hover:bg-gray-50 transition-colors mb-4">
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span class="font-medium text-gray-700">Continue with Google</span>
        </button>
        
        <div class="text-xs text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>
      </div>
    `;
  }
  
  if (userInfo) userInfo.style.display = 'none';
  if (loginButton) loginButton.style.display = 'inline-block';
  if (logoutButton) logoutButton.style.display = 'none';
}

// Show user interface (authenticated state)
function showUserInterface() {
  const lockOverlay = document.getElementById('lockOverlay');
  const userInfo = document.getElementById('userInfo');
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  
  if (lockOverlay) lockOverlay.style.display = 'none';
  
  if (userInfo && currentUser) {
    userInfo.style.display = 'flex';
    userInfo.innerHTML = `
      <img src="${currentUser.picture_url}" alt="Profile" class="w-8 h-8 rounded-full">
      <div class="flex flex-col">
        <span class="text-sm font-medium">${currentUser.name}</span>
        <div id="userStats"></div>
      </div>
    `;
  }
  
  if (loginButton) loginButton.style.display = 'none';
  if (logoutButton) logoutButton.style.display = 'inline-block';
}

// Google OAuth sign in
function signInWithGoogle() {
  console.log('Initiating Google OAuth...');
  showNotification('Redirecting to Google...', 'info');
  window.location.href = '/auth/google';
}

// Sign out
async function signOut() {
  try {
    console.log('Signing out...');
    
    const response = await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      currentUser = null;
      showNotification('Successfully signed out', 'success');
      showLoginInterface();
      
      // Clear calculator form
      clearCalculatorForm();
    } else {
      throw new Error('Logout failed');
    }
  } catch (error) {
    console.error('Error signing out:', error);
    showNotification('Error signing out. Please try again.', 'error');
  }
}

// Clear calculator form
function clearCalculatorForm() {
  const form = document.querySelector('form');
  if (form) {
    form.reset();
  }
  
  // Clear results
  const resultElements = [
    'grossHourly', 'realHourly', 'fuelCost', 'wearTear', 'estimatedTax',
    'grossPerMile', 'netPerMile', 'grossPerMileAll', 'netPerMileAll'
  ];
  
  resultElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.textContent = '$0.00';
  });
}

// Enhanced calculation saving with comprehensive data
async function saveCalculation(calculationData) {
  if (!currentUser) {
    console.log('No user signed in, cannot save calculation');
    return false;
  }
  
  try {
    console.log('Saving calculation to database...');
    
    // Enhance calculation data with additional fields
    const enhancedData = {
      ...calculationData,
      // Add input values from form
      miles_driven: parseFloat(document.getElementById('miles')?.value) || 0,
      trip_miles: parseFloat(document.getElementById('tripMiles')?.value) || 0,
      time_hours: parseFloat(document.getElementById('hours')?.value) || 0,
      total_earnings: parseFloat(document.getElementById('earnings')?.value) || 0,
      gas_price: parseFloat(document.getElementById('gasPrice')?.value) || 0,
      mpg: parseFloat(document.getElementById('mpg')?.value) || 0,
      wear_tear_rate: parseFloat(document.getElementById('wearTear')?.value) || 0.67,
      tax_rate: parseFloat(document.getElementById('tax')?.value) || 0,
      
      // Add score data
      score_grade: getScoreGrade(calculationData.score || 0),
      notes: document.getElementById('calculationNotes')?.value || null
    };
    
    const response = await fetch('/api/calculations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(enhancedData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Calculation saved successfully:', result);
      showNotification('Calculation saved successfully!', 'success');
      
      // Update user stats
      const userData = await loadUserData();
      if (userData) {
        updateUserStats(userData.stats);
      }
      
      return true;
    } else {
      const error = await response.json();
      console.error('Failed to save calculation:', error);
      showNotification('Failed to save calculation', 'error');
      return false;
    }
  } catch (error) {
    console.error('Error saving calculation:', error);
    showNotification('Error saving calculation', 'error');
    return false;
  }
}

// Get user's calculation history
async function getUserCalculations(limit = 50, favoriteOnly = false) {
  if (!currentUser) {
    return [];
  }
  
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(favoriteOnly && { favorite_only: 'true' })
    });
    
    const response = await fetch(`/api/calculations?${params}`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Retrieved ${data.calculations.length} calculations`);
      return data.calculations;
    } else {
      console.error('Failed to get calculations');
      return [];
    }
  } catch (error) {
    console.error('Error getting calculations:', error);
    return [];
  }
}

// Update user preferences
async function updateUserPreferences(preferences) {
  if (!currentUser) {
    return false;
  }
  
  try {
    const response = await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(preferences)
    });
    
    if (response.ok) {
      console.log('Preferences updated successfully');
      showNotification('Preferences saved!', 'success');
      return true;
    } else {
      console.error('Failed to update preferences');
      return false;
    }
  } catch (error) {
    console.error('Error updating preferences:', error);
    return false;
  }
}

// Get score grade based on numeric score
function getScoreGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 45) return 'D+';
  if (score >= 40) return 'D';
  return 'F';
}

// Show notification
function showNotification(message, type = 'info') {
  console.log(`${type.toUpperCase()}: ${message}`);
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    type === 'warning' ? 'bg-yellow-500 text-black' :
    'bg-blue-500 text-white'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Make functions globally available
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.currentUser = () => currentUser;
window.saveCalculation = saveCalculation;
window.getUserCalculations = getUserCalculations;
window.updateUserPreferences = updateUserPreferences;

// Initialize authentication when DOM is ready
document.addEventListener('DOMContentLoaded', initAuth);

// Export for use in other scripts
window.Auth = {
  currentUser: () => currentUser,
  isAuthenticated: () => !!currentUser,
  signIn: signInWithGoogle,
  signOut: signOut,
  saveCalculation: saveCalculation,
  getUserCalculations: getUserCalculations,
  updateUserPreferences: updateUserPreferences
};
