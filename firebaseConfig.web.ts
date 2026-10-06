// @ts-nocheck
// Firebase Configuration for Sri-EXPLORE (Web)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { environment } from './config/environment';

const firebaseConfig = environment.firebase;

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
