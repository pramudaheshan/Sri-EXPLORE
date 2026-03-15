// ==========================================
// SriSafeSpot - Firebase Configuration
// Shared Firebase project: sri-explore
// SafeSpot uses its own collection (safespot_incidents)
// and reads user auth from the shared Firebase Auth instance.
// ==========================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore - React Native specific import
import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBFHtvzpVBUk0GD-xsuAIdIPS6rjXz5OlY',
  authDomain: 'sri-explore.firebaseapp.com',
  projectId: 'sri-explore',
  storageBucket: 'sri-explore.firebasestorage.app',
  messagingSenderId: '105479351363',
  appId: '1:105479351363:web:7522edfc32f1a37a30b8f6',
};

// Prevent re-initializing on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);

// Auth — safe: only initializes once; getAuth() on subsequent calls
export const auth =
  getApps().length === 1
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      })
    : getAuth(app);

export default app;
