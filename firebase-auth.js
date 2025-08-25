// Firebase Authentication Functions - Login + Database

// Check if user is signed in
function checkAuthState() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      showUserInfo(user);
      createOrUpdateUserAccount(user);
    } else {
      // User is signed out
      showLoginButton();
    }
  });
}

// Sign in with Google
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .catch((error) => {
      console.error('Sign-in error:', error);
      showNotification('Sign-in failed. Please try again.', 'error');
    });
}

// Sign out
function signOut() {
  auth.signOut()
    .then(() => {
      showNotification('Signed out successfully', 'success');
    })
    .catch((error) => {
      console.error('Sign-out error:', error);
    });
}

// Create or update user account in Firestore
function createOrUpdateUserAccount(user) {
  const userRef = db.collection('users').doc(user.uid);
  
  userRef.set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastSignIn: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true })
  .then(() => {
    console.log('User account created/updated in Firestore');
  })
  .catch((error) => {
    console.error('Error saving user data:', error);
  });
}

// Get current user data from Firestore
function getCurrentUser() {
  return auth.currentUser;
}

// Save calculation to Firestore
function saveCalculation(calculationData) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showNotification('Please sign in to save calculations', 'warning');
    return;
  }

  const calculationRef = db.collection('calculations').add({
    userId: currentUser.uid,
    ...calculationData,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    showNotification('Calculation saved successfully!', 'success');
  })
  .catch((error) => {
    console.error('Error saving calculation:', error);
    showNotification('Failed to save calculation', 'error');
  });
}

// Load user's saved calculations from Firestore
function loadUserCalculations() {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];

  return db.collection('calculations')
    .where('userId', '==', currentUser.uid)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get()
    .then((querySnapshot) => {
      const calculations = [];
      querySnapshot.forEach((doc) => {
        calculations.push({ id: doc.id, ...doc.data() });
      });
      return calculations;
    })
    .catch((error) => {
      console.error('Error loading calculations:', error);
      return [];
    });
}

// Show user information in UI
function showUserInfo(user) {
  const userInfo = document.getElementById('userInfo');
  const loginBtn = document.getElementById('loginBtn');
  const userPicture = document.getElementById('userPicture');
  const userName = document.getElementById('userName');
  
  if (userInfo && loginBtn && userPicture && userName) {
    userPicture.src = user.photoURL || '/default-avatar.png';
    userName.textContent = user.displayName || 'User';
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
