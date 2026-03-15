// @ts-nocheck
// ==========================================
// SriSafeSpot - Background Location Task
//
// Runs in the background even when the app is
// closed or the phone is in the user's pocket.
//
// Every time the OS delivers a location update
// (approx. every 2 minutes), this task:
//   1. Fetches high-risk danger clusters from
//      Firestore (safespot_incidents)
//   2. Checks if the user is within 1km of any
//   3. Fires a push notification if so
//
// Registration:
//   Call startBackgroundLocationTracking() once
//   after the user grants "Always" permission.
//   Call stopBackgroundLocationTracking() on logout.
// ==========================================

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTION } from './incidentService';
import { sendDangerZoneAlert } from './notificationService';

export const BACKGROUND_LOCATION_TASK = 'SAFESPOT_BACKGROUND_LOCATION';

const CLUSTER_RADIUS_DEG = 0.008;
const DANGER_THRESHOLD_KM = 1.0;
const HIGH_RISK_WEIGHT = 0.6;
const MAX_INCIDENTS_FETCH = 300;

// ─── Haversine distance (km) ───────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Cluster incidents into weighted heatmap points ───────────────────────
function clusterToHeatmap(
  incidents: { latitude: number; longitude: number }[]
): { latitude: number; longitude: number; weight: number }[] {
  const used = new Set<number>();
  const result: { latitude: number; longitude: number; weight: number }[] = [];

  for (let i = 0; i < incidents.length; i++) {
    if (used.has(i)) continue;
    const base = incidents[i];
    if (!base.latitude || !base.longitude) continue;

    let count = 1;
    used.add(i);

    for (let j = i + 1; j < incidents.length; j++) {
      if (used.has(j)) continue;
      const other = incidents[j];
      if (
        Math.abs(base.latitude - other.latitude) <= CLUSTER_RADIUS_DEG &&
        Math.abs(base.longitude - other.longitude) <= CLUSTER_RADIUS_DEG
      ) {
        count++;
        used.add(j);
      }
    }

    result.push({
      latitude: base.latitude,
      longitude: base.longitude,
      weight: Math.min(1.0, count / 5),
    });
  }
  return result;
}

// ─── Define the background task ───────────────────────────────────────────
// This runs in the background OS process — keep it lightweight.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.warn('[SafeSpot BG] Task error:', error.message);
    return;
  }

  const locations: Location.LocationObject[] = data?.locations ?? [];
  if (!locations.length) return;

  const { latitude, longitude } = locations[locations.length - 1].coords;

  try {
    // Fetch recent non-flagged incidents from Firestore
    const q = query(
      collection(db, COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(MAX_INCIDENTS_FETCH)
    );
    const snapshot = await getDocs(q);
    const incidents = snapshot.docs
      .map(d => d.data() as { latitude: number; longitude: number; flagCount?: number })
      .filter(i => (i.flagCount ?? 0) < 5 && i.latitude && i.longitude);

    // Cluster and find high-risk zones
    const highRisk = clusterToHeatmap(incidents).filter(
      p => p.weight >= HIGH_RISK_WEIGHT
    );

    for (const zone of highRisk) {
      const dist = haversineKm(latitude, longitude, zone.latitude, zone.longitude);
      if (dist <= DANGER_THRESHOLD_KM) {
        // Fire a push notification — visible even when app is fully closed
        await sendDangerZoneAlert();
        break; // One notification per location update is enough
      }
    }
  } catch (err) {
    console.warn('[SafeSpot BG] Firestore fetch failed:', err);
  }
});

// ─── Start background tracking ────────────────────────────────────────────
/**
 * Start background GPS tracking for danger zone alerts.
 * Must be called AFTER the user grants "Always" location permission.
 * Safe to call multiple times — checks if already running first.
 */
export async function startBackgroundLocationTracking(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_LOCATION_TASK
    );
    if (isRegistered) return true; // Already running

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 2 * 60 * 1000,   // Check every 2 minutes
      distanceInterval: 200,           // Or when moved 200 metres
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true, // iOS blue bar
      foregroundService: {              // Android foreground service
        notificationTitle: 'SriSafeSpot is protecting you',
        notificationBody: 'Monitoring for nearby danger zones in the background.',
        notificationColor: '#EF4444',
      },
    });

    console.log('[SafeSpot BG] Background location tracking started');
    return true;
  } catch (err) {
    console.warn('[SafeSpot BG] Failed to start tracking:', err);
    return false;
  }
}

// ─── Stop background tracking ─────────────────────────────────────────────
/**
 * Stop background GPS tracking.
 * Call when user logs out or explicitly disables safety monitoring.
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_LOCATION_TASK
    );
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('[SafeSpot BG] Background location tracking stopped');
    }
  } catch (err) {
    console.warn('[SafeSpot BG] Failed to stop tracking:', err);
  }
}

// ─── Check if currently tracking ─────────────────────────────────────────
export async function isBackgroundTrackingActive(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
}
