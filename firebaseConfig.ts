// Firebase Configuration for Sri-EXPLORE (Native - iOS/Android)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore - React Native specific import
import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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

// Initialize Auth with AsyncStorage persistence for React Native
export const auth =
  getApps().length === 1
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      })
    : getAuth(app);

export const storage = getStorage(app);

export default app;
