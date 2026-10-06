// @ts-nocheck

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ImageBackground,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset } from 'expo-asset';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// Preload splash image
const splashImage = require('../assets/images/splash.png');
const logoImage = require('../assets/images/icon.png');

export default function SplashScreen() {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(30)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const loadingWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Preload image
    const loadImage = async () => {
      try {
        await Asset.fromModule(splashImage).downloadAsync();
        await Asset.fromModule(logoImage).downloadAsync();
        setImageLoaded(true);
      } catch (error) {
        setImageLoaded(true);
      }
    };
    loadImage();
  }, []);

  useEffect(() => {
    if (!imageLoaded) return;

    // Staggered animation sequence
    Animated.sequence([
      // Fade in background
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Logo animation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Text slide up
      Animated.parallel([
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Loading bar animation
    Animated.timing(loadingWidth, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Navigate after splash animation completes
    // Wait for auth state to be determined
    const timer = setTimeout(() => {
      if (isLoggedIn === true) {
        // User is logged in - go directly to main app
        router.replace('/(tabs)');
      } else if (isLoggedIn === false) {
        // User is not logged in - show onboarding
        router.replace('/onboarding');
      }
      // If isLoggedIn is null, auth state hasn't been determined yet
    }, 4000);

    return () => clearTimeout(timer);
  }, [imageLoaded, isLoggedIn]);

  if (!imageLoaded) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ImageBackground
        source={splashImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={[
            'rgba(13, 59, 46, 0.85)',
            'rgba(20, 90, 71, 0.7)',
            'rgba(26, 123, 95, 0.8)',
          ]}
          style={styles.overlay}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }, { scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.logoGlow}>
              <View style={styles.logoInner}>
                <Image
                  source={logoImage}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </Animated.View>

          {/* App Name & Tagline */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: textOpacity,
                transform: [{ translateY: textSlide }],
              },
            ]}
          >
            <Text style={styles.appName}>SRI-EXPLORE</Text>
            <Text style={styles.tagline}>AR-Powered Travel Companion</Text>
          </Animated.View>

          {/* Loading Section */}
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBar}>
              <Animated.View
                style={[
                  styles.loadingProgress,
                  {
                    width: loadingWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Animated.Text
              style={[styles.loadingText, { opacity: textOpacity }]}
            >
              Discovering Sri Lanka...
            </Animated.Text>
          </View>
        </View>

        {/* Bottom Branding */}
        <Animated.View style={[styles.footer, { opacity: textOpacity }]}>
          <Text style={styles.footerText}>Explore • Discover • Experience</Text>
        </Animated.View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#0D3B2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#20B2AA',
  },
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(32, 178, 170, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#20B2AA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  logoInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff60',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 38,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: '#20B2AA',
    borderRadius: 2,
    marginVertical: 16,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    width: width * 0.65,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 2,
  },
});
