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
import { environment } from '../config/environment';

const firebaseConfig = environment.firebase;

// Prevent re-initializing on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db      = getFirestore(app);
export const storage = getStorage(app);

// Auth — firebaseConfig.ts already initializes auth with persistence; just get the instance
export const auth = getAuth(app);

export default app;
