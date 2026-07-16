// @ts-nocheck

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

SplashScreen.preventAutoHideAsync();

// ============================================
// DEBUG: Set to a route path to test directly
// Examples: '/auth', '/onboarding', '/splash', '/(tabs)', '/(tabs)/profile'
// Set to null for normal auth flow
// ============================================
const DEBUG_START_PAGE: string | null = null; // e.g., '/auth'

// Auth context hook
function useProtectedRoute(
  user: User | null,
  isLoading: boolean,
  hasSeenOnboarding: boolean,
) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // DEBUG: Skip auth flow and go directly to test page
    if (DEBUG_START_PAGE) {
      router.replace(DEBUG_START_PAGE as any);
      return;
    }

    const inAuthGroup =
      segments[0] === 'auth' ||
      segments[0] === 'onboarding' ||
      segments[0] === 'splash';

    if (!user && !inAuthGroup) {
      // Redirect to splash screen if not logged in
      router.replace('/splash');
    } else if (user && inAuthGroup) {
      // Redirect to main app if logged in and on auth screen
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);
}

export default function RootLayout() {
  useFrameworkReady();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isLoading]);

  // Protect routes
  useProtectedRoute(user, isLoading, false);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0D3B2E',
        }}
      >
        <ActivityIndicator size="large" color="#20B2AA" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="splash" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
