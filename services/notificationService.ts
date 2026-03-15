// @ts-nocheck
// ==========================================
// SriSafeSpot - Notification Service
// Handles push notification permissions, token
// registration (FCM via Expo), and local alerts.
//
// Architecture:
//   Expo push token (wraps FCM) → saved to
//   safespot_tokens collection in Firestore.
//   Local notifications → fired immediately for
//   geofencing and weather alerts.
// ==========================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

// How notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ==========================================
// PERMISSION + TOKEN REGISTRATION
// ==========================================

/**
 * Request notification permissions from the user.
 * Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Register device for push notifications.
 * Gets Expo push token (backed by FCM on Android, APNs on iOS).
 * Saves token to Firestore safespot_tokens collection.
 * Returns the token string, or null if unavailable.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      console.warn('[SafeSpot] Notification permission denied');
      return null;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('safespot-alerts', {
        name: 'SriSafeSpot Safety Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
        sound: 'default',
        description: 'Alerts for nearby danger zones and weather warnings',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Save token to Firestore so server-side FCM can target this device
    const userId = auth.currentUser?.uid ?? 'anon';
    await addDoc(collection(db, 'safespot_tokens'), {
      userId,
      token,
      platform: Platform.OS,
      registeredAt: serverTimestamp(),
    });

    console.log('[SafeSpot] Push token registered:', token);
    return token;
  } catch (err) {
    // Token registration can fail on simulators — safe to ignore
    console.warn('[SafeSpot] Push token registration failed:', err);
    return null;
  }
}

// ==========================================
// LOCAL NOTIFICATIONS (Immediate / Scheduled)
// ==========================================

/**
 * Send an immediate local push notification.
 * Used for geofencing and weather alerts.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        color: '#EF4444',
      },
      trigger: null, // null = deliver immediately
    });
  } catch (err) {
    console.warn('[SafeSpot] Failed to send local notification:', err);
  }
}

/**
 * Send a danger zone geofencing alert.
 * Called when user enters within 1km of a high-risk cluster.
 */
export async function sendDangerZoneAlert(zoneName?: string): Promise<void> {
  await sendLocalNotification(
    '⚠️ SriSafeSpot Safety Warning',
    zoneName
      ? `You are entering a high-risk area near ${zoneName}. Stay alert and take precautions.`
      : 'Warning: You are entering a high-risk area reported by other tourists. Stay alert.',
    { type: 'geofence_alert' }
  );
}

/**
 * Send a weather / natural disaster alert.
 */
export async function sendWeatherAlert(condition: string): Promise<void> {
  await sendLocalNotification(
    '🌩️ Weather Safety Alert',
    `${condition} conditions detected in Sri Lanka. Exercise caution when outdoors.`,
    { type: 'weather_alert', condition }
  );
}

// ==========================================
// NOTIFICATION LISTENERS
// Attach these in your root layout or App component.
// ==========================================

/**
 * Set up foreground and interaction listeners.
 * Returns a cleanup function — call it in useEffect return.
 *
 * Usage (in _layout.tsx or App):
 *   useEffect(() => setupNotificationListeners(), []);
 */
export function setupNotificationListeners(): () => void {
  // Fires when notification arrives while app is open
  const foregroundSub = Notifications.addNotificationReceivedListener(notification => {
    console.log('[SafeSpot] Notification received:', notification.request.content.title);
  });

  // Fires when user taps the notification
  const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as any;
    console.log('[SafeSpot] Notification tapped, type:', data?.type);
    // Navigation on tap can be added here using expo-router
  });

  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
}
