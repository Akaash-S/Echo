import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration.
// Values can be provided via Vite environment variables or defaults for echo--gemni-journal
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSy' + 'FakeOrRealDefaultPlaceholder',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'echo--gemni-journal.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'echo--gemni-journal',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'echo--gemni-journal.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '112013234861',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:112013234861:web:placeholder',
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with Google Auth Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});
