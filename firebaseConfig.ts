// Firebase Configuration for Sri-EXPLORE (Native - iOS/Android)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore - React Native specific import
import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from './config/environment';

const firebaseConfig = environment.firebase;

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
