import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// --- 1. HOSTEL DATA CONFIG (Reads from your .env file) ---
const hostelConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// --- 2. USER LOGIN CONFIG (Your NEW Project: otp-tolet) ---
const userAuthConfig = {
  apiKey: "AIzaSyBtYiV0tNQcJlO1STrb44Y5R-pIXcoLi-c",
  authDomain: "otp-tolet.firebaseapp.com",
  projectId: "otp-tolet",
  storageBucket: "otp-tolet.firebasestorage.app",
  messagingSenderId: "555982047416",
  appId: "1:555982047416:web:6157fd5ea1947a50bc8c4d",
  measurementId: "G-DJH0796J2W"
};

// --- INITIALIZE BOTH APPS ---
const hostelApp = initializeApp(hostelConfig, "hostelApp"); 
const userAuthApp = initializeApp(userAuthConfig, "userAuthApp");

// --- EXPORT SERVICES ---

// 1. For Room Data & Admin (Uses Hostel App)
// This fixes the "auth not found" error in App.js
export const db = getFirestore(hostelApp); 
export const storage = getStorage(hostelApp);
export const auth = getAuth(hostelApp); 

// 2. For User Login (Uses User Auth App)
export const userDb = getFirestore(userAuthApp);
export const userAuth = getAuth(userAuthApp);