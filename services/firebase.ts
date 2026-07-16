// @ts-nocheck
// ==========================================
// SriSafeSpot - Firebase Configuration
// Shared Firebase project: sri-explore
// SafeSpot uses its own collection (safespot_incidents)
// and reads user auth from the shared Firebase Auth instance.
// ==========================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

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

export const db      = getFirestore(app);
export const storage = getStorage(app);

// Auth — firebaseConfig.ts already initializes auth with persistence; just get the instance
export const auth = getAuth(app);

export default app;
