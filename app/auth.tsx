// @ts-nocheck

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  X,
  ChevronLeft,
} from 'lucide-react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithCredential,
  GoogleAuthProvider,
  FacebookAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { userService } from '../services/firebaseService';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Required for web browser auth session
WebBrowser.maybeCompleteAuthSession();

const images = {
  icon: require('../assets/images/icon.png'),
  background: require('../assets/images/login.png'),
};

// Preload images function using expo-asset
const preloadImages = async () => {
  const imageAssets = Object.values(images).map((image) => {
    return Asset.fromModule(image).downloadAsync();
  });
  await Promise.all(imageAssets);
};

// ============================================
// IMPORTANT: Replace these with your own IDs
// ============================================
// Get Google Client IDs from: https://console.cloud.google.com/apis/credentials
// Get Facebook App ID from: https://developers.facebook.com/apps
const GOOGLE_WEB_CLIENT_ID =
  '133476003966-1lkcd5sc39mrvm2fqp5psc7a224lcm25.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '133476003966-43vu52rdk7eqr93nmhba9pnfl1ksjm0t.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID =
  '133476003966-vgcs2r26brtogv1fkkdivnha0uevq7s9.apps.googleusercontent.com';
const FACEBOOK_APP_ID = 'YOUR_FACEBOOK_APP_ID';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [socialLoading, setSocialLoading] = useState<
    'google' | 'facebook' | null
  >(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // Google Auth - using Expo proxy for development
  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      clientId: GOOGLE_WEB_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      scopes: ['profile', 'email'],
    });

  // Facebook Auth - using Expo proxy for development
  const [facebookRequest, facebookResponse, facebookPromptAsync] =
    Facebook.useAuthRequest({
      clientId: FACEBOOK_APP_ID,
      scopes: ['public_profile', 'email'],
    });

  // Preload images on mount
  useEffect(() => {
    const loadAssets = async () => {
      try {
        await preloadImages();
        setImagesLoaded(true);
      } catch (error) {
        console.error('Error preloading images:', error);
        setImagesLoaded(true); // Continue anyway
      }
    };
    loadAssets();
  }, []);

  // Load saved credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedCredentials = await AsyncStorage.getItem(
          'rememberedCredentials',
        );
        if (savedCredentials) {
          const { email, password } = JSON.parse(savedCredentials);
          setFormData((prev) => ({ ...prev, email, password }));
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      }
    };
    loadSavedCredentials();
  }, []);

  // Handle Google Response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      handleGoogleSignIn(id_token);
    } else if (googleResponse) {
      // Reset loading for any non-success response (error, dismiss, cancel, locked)
      setSocialLoading(null);
      if (googleResponse.type === 'error') {
        Alert.alert('Error', 'Google sign in failed. Please try again.');
      }
    }
  }, [googleResponse]);

  // Handle Facebook Response
  useEffect(() => {
    if (facebookResponse?.type === 'success') {
      const { access_token } = facebookResponse.params;
      handleFacebookSignIn(access_token);
    } else if (facebookResponse?.type === 'error') {
      setSocialLoading(null);
      Alert.alert('Error', 'Facebook sign in failed. Please try again.');
    }
  }, [facebookResponse]);

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      setSocialLoading('google');
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);

      // Check if user profile exists, if not create one
      const existingProfile = await userService.getProfile(
        userCredential.user.uid,
      );
      if (!existingProfile) {
        await userService.createProfile(
          userCredential.user.uid,
          userCredential.user.email || '',
          userCredential.user.displayName || 'Explorer',
        );
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookSignIn = async (accessToken: string) => {
    try {
      setSocialLoading('facebook');
      const credential = FacebookAuthProvider.credential(accessToken);
      const userCredential = await signInWithCredential(auth, credential);

      // Check if user profile exists, if not create one
      const existingProfile = await userService.getProfile(
        userCredential.user.uid,
      );
      if (!existingProfile) {
        await userService.createProfile(
          userCredential.user.uid,
          userCredential.user.email || '',
          userCredential.user.displayName || 'Explorer',
        );
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Facebook Sign In Error:', error);
      Alert.alert(
        'Error',
        'Failed to sign in with Facebook. Please try again.',
      );
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
      const result = await googlePromptAsync();
      // If prompt was dismissed or cancelled before response, reset loading
      if (result?.type !== 'success') {
        setSocialLoading(null);
      }
    } catch (error) {
      setSocialLoading(null);
      Alert.alert('Error', 'Failed to initiate Google sign in.');
    }
  };

  const handleFacebookLogin = () => {
    Alert.alert(
      'Coming Soon! 🚀',
      'Facebook login will be available in a future update. Stay tuned!',
      [{ text: 'OK', style: 'default' }],
    );
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      Alert.alert(
        'Email Sent! 📧',
        'Check your inbox for password reset instructions.',
        [{ text: 'OK', onPress: () => setShowForgotPassword(false) }],
      );
      setResetEmail('');
    } catch (error: any) {
      let errorMessage = 'Failed to send reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && !formData.name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Sign in existing user
        await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password,
        );

        // Save or clear credentials based on Remember Me
        if (rememberMe) {
          await AsyncStorage.setItem(
            'rememberedCredentials',
            JSON.stringify({
              email: formData.email,
              password: formData.password,
            }),
          );
        } else {
          await AsyncStorage.removeItem('rememberedCredentials');
        }

        router.replace('/(tabs)');
      } else {
        // Create new account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password,
        );

        // Update display name
        await updateProfile(userCredential.user, {
          displayName: formData.name,
        });

        // Create user profile in Firestore
        await userService.createProfile(
          userCredential.user.uid,
          formData.email,
          formData.name,
        );

        router.replace('/(tabs)');
      }
    } catch (error: any) {
      let errorMessage = 'An error occurred. Please try again.';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password.';
          break;
        default:
          errorMessage = error.message;
      }

      Alert.alert('Authentication Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen while images are preloading
  if (!imagesLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20B2AA" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {/* Background Image */}
        <ImageBackground
          source={images.background}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* Dark Green Gradient Overlay */}
          <LinearGradient
            colors={[
              'rgba(13, 59, 46, 0.85)',
              'rgba(20, 90, 71, 0.75)',
              'rgba(26, 123, 95, 0.8)',
            ]}
            style={StyleSheet.absoluteFill}
          />

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/onboarding')}
          >
            <ChevronLeft size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Header with App Logo */}
            <View style={styles.header}>
              {/* Glassy Logo Container */}
              <View style={styles.logoOuterRing}>
                <View style={styles.logoContainer}>
                  <Image
                    source={images.icon}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={styles.welcomeText}>
                {isLogin ? 'Ayubowan!' : 'Join Sri-EXPLORE'}
              </Text>
              <Text style={styles.subtitle}>
                {isLogin
                  ? 'Continue your Sri Lankan adventure'
                  : 'Start your journey through Sri Lanka'}
              </Text>
            </View>

            {/* Glassy Form Container */}
            <View style={styles.glassContainer}>
              <BlurView intensity={25} tint="light" style={styles.blurView}>
                <View style={styles.formContainer}>
                  {!isLogin && (
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIconContainer}>
                        <User size={18} color="#145A47" />
                      </View>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Full Name"
                        placeholderTextColor="rgba(20, 90, 71, 0.5)"
                        value={formData.name}
                        onChangeText={(text) =>
                          setFormData({ ...formData, name: text })
                        }
                        returnKeyType="next"
                      />
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <View style={styles.inputIconContainer}>
                      <Mail size={18} color="#145A47" />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Email Address"
                      placeholderTextColor="rgba(20, 90, 71, 0.5)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={formData.email}
                      onChangeText={(text) =>
                        setFormData({ ...formData, email: text })
                      }
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <View style={styles.inputIconContainer}>
                      <Lock size={18} color="#145A47" />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Password"
                      placeholderTextColor="rgba(20, 90, 71, 0.5)"
                      secureTextEntry={!showPassword}
                      value={formData.password}
                      onChangeText={(text) =>
                        setFormData({ ...formData, password: text })
                      }
                      returnKeyType="done"
                      onSubmitEditing={handleAuth}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color="#145A47" />
                      ) : (
                        <Eye size={18} color="#145A47" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Remember Me & Forgot Password Row */}
                  {isLogin && (
                    <View style={styles.rememberForgotRow}>
                      {/* Remember Me Checkbox */}
                      <TouchableOpacity
                        style={styles.rememberMeContainer}
                        onPress={() => setRememberMe(!rememberMe)}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            rememberMe && styles.checkboxChecked,
                          ]}
                        >
                          {rememberMe && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                        <Text style={styles.rememberMeText}>Remember me</Text>
                      </TouchableOpacity>

                      {/* Forgot Password Link */}
                      <TouchableOpacity
                        onPress={() => {
                          setResetEmail(formData.email);
                          setShowForgotPassword(true);
                        }}
                      >
                        <Text style={styles.forgotPasswordText}>
                          Forgot Password?
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Auth Button - Golden Sri Lankan Style */}
                  <TouchableOpacity
                    style={[
                      styles.authButton,
                      loading && styles.authButtonDisabled,
                    ]}
                    onPress={handleAuth}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={['#20B2AA', '#45bd9b', '#0eb779']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.authButtonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.authButtonText}>
                          {isLogin ? 'Sign In' : 'Create Account'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Divider with Sri Lankan Motif */}
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <View style={styles.dividerOrnament}>
                      <Text style={styles.dividerText}>✦</Text>
                    </View>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Social Login */}
                  <View style={styles.socialContainer}>
                    <TouchableOpacity
                      style={[
                        styles.socialButton,
                        styles.googleButton,
                        socialLoading === 'google' &&
                          styles.socialButtonDisabled,
                      ]}
                      onPress={handleGoogleLogin}
                      disabled={socialLoading !== null}
                    >
                      {socialLoading === 'google' ? (
                        <ActivityIndicator size="small" color="#DB4437" />
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.socialButtonText,
                              { color: '#DB4437' },
                            ]}
                          >
                            G
                          </Text>
                          <Text style={styles.socialButtonLabel}>Google</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.socialButton, styles.facebookButton]}
                      onPress={handleFacebookLogin}
                    >
                      <Text
                        style={[styles.socialButtonText, { color: '#4267B2' }]}
                      >
                        f
                      </Text>
                      <Text style={styles.socialButtonLabel}>Facebook</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Toggle Auth Mode */}
                  <TouchableOpacity
                    style={styles.toggleContainer}
                    onPress={() => setIsLogin(!isLogin)}
                  >
                    <Text style={styles.toggleText}>
                      {isLogin
                        ? "Don't have an account? "
                        : 'Already have an account? '}
                      <Text style={styles.toggleLink}>
                        {isLogin ? 'Sign Up' : 'Sign In'}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </KeyboardAvoidingView>
        </ImageBackground>

        {/* Forgot Password Modal */}
        <Modal
          visible={showForgotPassword}
          transparent
          animationType="fade"
          onRequestClose={() => setShowForgotPassword(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setShowForgotPassword(false)}
                >
                  <X size={24} color="#145A47" />
                </TouchableOpacity>

                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <Lock size={32} color="#20B2AA" />
                  </View>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter your email and we'll send you instructions to reset
                    your password.
                  </Text>
                </View>

                <View style={styles.modalInputContainer}>
                  <View style={styles.inputIconContainer}>
                    <Mail size={18} color="#145A47" />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email Address"
                    placeholderTextColor="rgba(20, 90, 71, 0.5)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    returnKeyType="done"
                    onSubmitEditing={handleForgotPassword}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    resetLoading && styles.authButtonDisabled,
                  ]}
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                >
                  <LinearGradient
                    colors={['#20B2AA', '#45bd9b', '#0eb779']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.authButtonGradient}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.authButtonText}>
                        Send Reset Email
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalBackButton}
                  onPress={() => setShowForgotPassword(false)}
                >
                  <Text style={styles.modalBackText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D3B2E',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoOuterRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(32, 178, 170, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(32, 178, 170, 0.5)',
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  welcomeText: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  glassContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.63)',
  },
  blurView: {
    padding: 0,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.54)',
    padding: 24,
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(5, 58, 44, 0.2)',
    shadowColor: '#d2e8e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(32, 178, 170, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#0D3B2E',
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 10,
  },
  rememberForgotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: -1,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1a7b5fcc',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
    marginLeft: 3,
  },
  checkboxChecked: {
    backgroundColor: '#1A7B5F',
    borderColor: '#124235',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#124235',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#124235',
  },
  authButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 18,
    elevation: 6,
    shadowColor: '#d2e8e2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  authButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(5, 58, 44, 0.2)',
  },
  dividerOrnament: {
    paddingHorizontal: 12,
  },
  dividerText: {
    fontSize: 16,
    color: '#20B2AA',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 12,
  },
  socialButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    position: 'relative',
  },
  googleButton: {
    borderColor: 'rgba(219, 68, 55, 0.3)',
    backgroundColor: 'rgba(254, 247, 247, 0.9)',
  },
  facebookButton: {
    borderColor: 'rgba(66, 103, 178, 0.3)',
    backgroundColor: 'rgba(245, 248, 252, 0.9)',
  },
  socialButtonDisabled: {
    opacity: 0.6,
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
  },
  socialButtonText: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
  },
  socialButtonLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#0D3B2E',
    marginLeft: 8,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
    backgroundColor: '#4267B2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  comingSoonText: {
    fontSize: 8,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  toggleContainer: {
    alignItems: 'center',
    paddingTop: 4,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#0D3B2E',
  },
  toggleLink: {
    color: '#1A7B5F',
    fontFamily: 'Poppins-SemiBold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 59, 46, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(32, 178, 170, 0.3)',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(32, 178, 170, 0.15)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(32, 178, 170, 0.3)',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#0D3B2E',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#145A47',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 90, 71, 0.2)',
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#145A47',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalBackButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  modalBackText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#145A47',
  },
});
