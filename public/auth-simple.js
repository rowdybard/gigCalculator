// Simplified Authentication - Firebase Auth + Local Storage
console.log('Simple auth script loaded');

// Initialize Firebase Auth
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase config (you'll need to add this)
const firebaseConfig = {
  apiKey: "AIzaSyCMUhdRrlLL9-HRh-SRvbPZW_pBa8Z6mWU",
  authDomain: "gigcalc-715a5.firebaseapp.com",
  projectId: "gigcalc-715a5",
  storageBucket: "gigcalc-715a5.firebasestorage.app",
  messagingSenderId: "863699815068",
  appId: "1:863699815068:web:fd15e9262435b814edfb59"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Simple sign in function
async function signInWithGoogle() {
  try {
    console.log('Signing in with Google...');
    const result = await signInWithPopup(auth, provider);
    console.log('Signed in successfully:', result.user.email);
    showUserInfo(result.user);
    showNotification('Signed in successfully!', 'success');
  } catch (error) {
    console.error('Sign-in error:', error);
    showNotification('Sign-in failed. Please try again.', 'error');
  }
}

// Simple sign out function
async function signOut() {
  try {
    await firebaseSignOut(auth);
    console.log('Signed out successfully');
    showLoginButton();
    showNotification('Signed out successfully', 'success');
  } catch (error) {
    console.error('Sign-out error:', error);
    showNotification('Sign-out failed', 'error');
  }
}

// Check auth status
function checkAuthStatus() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is signed in:', user.email);
      showUserInfo(user);
    } else {
      console.log('User is signed out');
      showLoginButton();
    }
  });
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
    userPicture.src = user.photoURL || '/default-avatar.png';
    userName.textContent = user.displayName || 'User';
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
