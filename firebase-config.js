// Firebase configuration - Authentication + Database
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Auth and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other files
window.auth = auth;
window.db = db;
