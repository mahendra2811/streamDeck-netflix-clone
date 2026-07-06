// src/firebase/firebase.js
//
// "Sign-up screen - Setup a firebase server and authenticate this app using
// firebase only."
//
// Drop your own project config into a .env file (Vite exposes vars
// prefixed VITE_) - never commit real keys. This module only wraps Auth;
// no other Firebase product is required by the brief.

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// browserLocalPersistence keeps the signed-in session in IndexedDB/localStorage
// so the "offline mode" requirement doesn't kick the user back to sign-up
// just because the network dropped - only *new* sign-in/sign-up actions
// require connectivity, not staying signed in.
setPersistence(auth, browserLocalPersistence).catch((err) =>
  console.warn('[firebase] failed to set persistence:', err.message)
);

export async function signUp(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

/** React hook-friendly subscription; caller is responsible for unsubscribing on unmount. */
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
