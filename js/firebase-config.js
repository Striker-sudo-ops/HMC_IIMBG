// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// INSTRUCTIONS: Replace the firebaseConfig object below with your
// own Firebase project credentials.
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (e.g., "hmc-iimbodhgaya")
// 3. Enable Authentication (Email/Password)
// 4. Enable Firestore Database (start in test mode)
// 5. Enable Storage
// 6. Go to Project Settings > Your Apps > Add Web App
// 7. Copy the firebaseConfig object and paste it below.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage }     from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { localFirebaseConfig } from './env-config.js';

// Load configuration from Vite environment variables or local unversioned config
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || localFirebaseConfig?.apiKey || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || localFirebaseConfig?.authDomain || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || localFirebaseConfig?.projectId || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || localFirebaseConfig?.storageBucket || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || localFirebaseConfig?.messagingSenderId || "",
  appId: env.VITE_FIREBASE_APP_ID || localFirebaseConfig?.appId || "",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || localFirebaseConfig?.measurementId || ""
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const storage = getStorage(app);
