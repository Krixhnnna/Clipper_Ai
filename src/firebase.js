import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC44oP77LLDB0FXpCpkaKTSkR8_wAbj5wE",
  authDomain: "clipx01.firebaseapp.com",
  projectId: "clipx01",
  storageBucket: "clipx01.firebasestorage.app",
  messagingSenderId: "567480792278",
  appId: "1:567480792278:web:cd1d10d90a7ba304c50577",
  measurementId: "G-8RLDZQ4CRG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

// Add scopes for better compatibility
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Set custom parameters
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged }; 