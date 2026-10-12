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

//  REPLACE THIS WITH YOUR FIREBASE CONFIG 
export const firebaseConfig = {
  apiKey: "AIzaSyCJgQ45ZpW1CYzX4Vt2L6T5r93ON1DUP7g",
  authDomain: "hmc-iimbodhgaya.firebaseapp.com",
  projectId: "hmc-iimbodhgaya",
  storageBucket: "hmc-iimbodhgaya.firebasestorage.app",
  messagingSenderId: "1071466096630",
  appId: "1:1071466096630:web:86c23928a659f340ba09d7",
  measurementId: "G-0B2NEH0DR0"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const storage = getStorage(app);
