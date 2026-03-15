// @ts-nocheck
// Firebase Configuration for Sri-EXPLORE (Web)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBFHtvzpVBUk0GD-xsuAIdIPS6rjXz5OlY',
  authDomain: 'sri-explore.firebaseapp.com',
  projectId: 'sri-explore',
  storageBucket: 'sri-explore.firebasestorage.app',
  messagingSenderId: '105479351363',
  appId: '1:105479351363:web:7522edfc32f1a37a30b8f6',
  measurementId: 'G-2Z9VQX84YL',
};

// Initialize Firebase (prevent re-initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const db = getFirestore(app);

// Initialize Auth with browser persistence for web
export const auth =
  getApps().length === 1
    ? initializeAuth(app, {
        persistence: browserLocalPersistence,
      })
    : getAuth(app);

export const storage = getStorage(app);

export default app;
