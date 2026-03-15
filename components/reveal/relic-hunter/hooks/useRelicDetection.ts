import { useState, useEffect, useCallback, useRef } from 'react';
import { Relic, RadarDot, HUDState } from '../types';
import { useLocationTracking } from './useLocationTracking';

// ========================================
// 🧪 TESTING MODE - Set to false for production
// ========================================
const TESTING_MODE = true;

// For testing: We'll place relics relative to user's current position
// In production, these would be fixed GPS coordinates of real locations
const createTestRelics = (userLat: number, userLon: number): Relic[] => {
  // Place relics in a circle around the user (approx 10-30 meters away)
  const metersToLat = 1 / 111320; // 1 meter in latitude degrees
  const metersToLon = 1 / (111320 * Math.cos((userLat * Math.PI) / 180)); // 1 meter in longitude degrees

  return [
    {
      id: '1',
      name: 'Golden Buddha Statue',
      description: 'A rare golden Buddha statue from the 5th century',
      rarity: 'legendary',
      region: 'polonnaruwa',
      location: {
        latitude: userLat + 15 * metersToLat, // 15m north
        longitude: userLon,
      },
      distance: 15,
      angle: 0,
      isInView: false,
      isCollected: false,
      points: 500,
    },
    {
      id: '2',
      name: 'Ancient Stone Tablet',
      description: 'Stone tablet with ancient Brahmi script',
      rarity: 'rare',
      region: 'polonnaruwa',
      location: {
        latitude: userLat,
        longitude: userLon + 20 * metersToLon, // 20m east
      },
      distance: 20,
      angle: 90,
      isInView: false,
      isCollected: false,
      points: 250,
    },
    {
      id: '3',
      name: 'Temple Bell Fragment',
      description: 'Bronze fragment from an ancient temple bell',
      rarity: 'common',
      region: 'polonnaruwa',
      location: {
        latitude: userLat - 25 * metersToLat, // 25m south
        longitude: userLon,
      },
      distance: 25,
      angle: 180,
      isInView: false,
      isCollected: false,
      points: 100,
    },
    {
      id: '4',
      name: 'Moonstone Carving',
      description: 'Intricate moonstone with lotus patterns',
      rarity: 'mythical',
      region: 'polonnaruwa',
      location: {
        latitude: userLat,
        longitude: userLon - 10 * metersToLon, // 10m west (closer for testing)
      },
      distance: 10,
      angle: 270,
      isInView: false,
      isCollected: false,
      points: 1000,
    },
  ];
};

// Default relics for emulator/testing without GPS
const DEFAULT_RELICS: Relic[] = [
  {
    id: '1',
    name: 'Golden Buddha Statue',
    description: 'A rare golden Buddha statue from the 5th century',
    rarity: 'legendary',
    region: 'polonnaruwa',
    location: { latitude: 7.9403, longitude: 81.0188 },
    distance: 15,
    angle: 0,
    isInView: false,
    isCollected: false,
    points: 500,
  },
  {
    id: '2',
    name: 'Ancient Stone Tablet',
    description: 'Stone tablet with ancient Brahmi script',
    rarity: 'rare',
    region: 'polonnaruwa',
    location: { latitude: 7.941, longitude: 81.0195 },
    distance: 20,
    angle: 90,
    isInView: false,
    isCollected: false,
    points: 250,
  },
  {
    id: '3',
    name: 'Temple Bell Fragment',
    description: 'Bronze fragment from an ancient temple bell',
    rarity: 'common',
    region: 'polonnaruwa',
    location: { latitude: 7.9395, longitude: 81.0175 },
    distance: 25,
    angle: 180,
    isInView: false,
    isCollected: false,
    points: 100,
  },
  {
    id: '4',
    name: 'Moonstone Carving',
    description: 'Intricate moonstone with lotus patterns',
    rarity: 'mythical',
    region: 'polonnaruwa',
    location: { latitude: 7.942, longitude: 81.02 },
    distance: 10,
    angle: 270,
    isInView: false,
    isCollected: false,
    points: 1000,
  },
];

interface UseRelicDetectionReturn {
  relics: Relic[];
  radarDots: RadarDot[];
  hudState: HUDState;
  compassHeading: number;
  userLocation: { latitude: number; longitude: number } | null;
  hasGPS: boolean; // Whether GPS is active and working
  getTargetRelicPosition: () => {
    relativeAngle: number;
    distance: number;
  } | null;
  startScanning: () => void;
  stopScanning: () => void;
  captureRelic: () => Promise<boolean>;
}

export const useRelicDetection = (): UseRelicDetectionReturn => {
  const [relics, setRelics] = useState<Relic[]>(DEFAULT_RELICS);
  const [relicsInitialized, setRelicsInitialized] = useState(false);
  const [hudState, setHudState] = useState<HUDState>({
    isScanning: false,
    canCapture: false,
    targetRelic: null,
    compassHeading: 0,
  });

  // Use location tracking hook
  const {
    userLocation,
    compassHeading: realCompassHeading,
    getRelicPosition,
    hasPermission,
  } = useLocationTracking();

  // Fallback compass for testing/emulator
  const [testCompassHeading, setTestCompassHeading] = useState(0);

  // Use real compass if available, otherwise test compass
  const compassHeading =
    hasPermission && userLocation ? realCompassHeading : testCompassHeading;

  // Use ref to track target relic for capture (avoids stale closure)
  const targetRelicRef = useRef<Relic | null>(null);

  // Initialize relics around user's location when GPS is available
  useEffect(() => {
    if (userLocation && !relicsInitialized && TESTING_MODE) {
      const testRelics = createTestRelics(
        userLocation.latitude,
        userLocation.longitude
      );
      setRelics(testRelics);
      setRelicsInitialized(true);
    }
  }, [userLocation, relicsInitialized]);

  // Update relic distances and angles based on user location
  useEffect(() => {
    if (!userLocation) return;

    setRelics((prev) =>
      prev.map((relic) => {
        const position = getRelicPosition(relic);
        return {
          ...relic,
          distance: Math.round(position.distance),
          angle: position.bearing,
          isInView: position.isVisible && position.isInRange,
        };
      })
    );
  }, [userLocation, compassHeading, getRelicPosition]);

  // Convert relics to radar dots
  const radarDots: RadarDot[] = relics
    .filter((r) => !r.isCollected)
    .map((relic) => ({
      id: relic.id,
      angle: relic.angle,
      distance: Math.min(relic.distance / 100, 1), // Normalize to 0-1, max 100m
      rarity: relic.rarity,
    }));

  // Simulate compass heading updates (only in testing mode without GPS)
  useEffect(() => {
    if (!TESTING_MODE || (hasPermission && userLocation)) return;

    const interval = setInterval(() => {
      setTestCompassHeading((prev) => (prev + 2) % 360);
    }, 100);

    return () => clearInterval(interval);
  }, [hasPermission, userLocation]);

  // Check if any relic is in view
  useEffect(() => {
    let relicInView = relics.find((relic) => {
      if (relic.isCollected) return false;

      // If we have real location, use proper angle calculation
      if (userLocation) {
        const position = getRelicPosition(relic);
        return position.isVisible && position.isInRange;
      }

      // Fallback: use simulated angle
      const angleDiff = Math.abs(relic.angle - compassHeading);
      const normalizedDiff = angleDiff > 180 ? 360 - angleDiff : angleDiff;
      const detectionAngle = TESTING_MODE ? 45 : 30;
      return normalizedDiff < detectionAngle && relic.distance < 100;
    });

    // 🧪 TESTING: Always show first uncollected relic
    if (!relicInView && TESTING_MODE) {
      relicInView = relics.find((r) => !r.isCollected);
    }

    // Update ref for capture function
    targetRelicRef.current = relicInView || null;

    setHudState((prev) => ({
      ...prev,
      canCapture: !!relicInView,
      targetRelic: relicInView || null,
      compassHeading,
    }));
  }, [relics, compassHeading, userLocation, getRelicPosition]);

  const startScanning = useCallback(() => {
    setHudState((prev) => ({ ...prev, isScanning: true }));
  }, []);

  const stopScanning = useCallback(() => {
    setHudState((prev) => ({ ...prev, isScanning: false }));
  }, []);

  const captureRelic = useCallback(async (): Promise<boolean> => {
    // Use ref to get current target (avoids stale closure issue)
    const currentTarget = targetRelicRef.current;
    if (!currentTarget) return false;

    // Store the ID before async operation
    const targetId = currentTarget.id;

    // Short delay for capture animation
    await new Promise((resolve) => setTimeout(resolve, 800));

    setRelics((prev) =>
      prev.map((relic) =>
        relic.id === targetId ? { ...relic, isCollected: true } : relic
      )
    );

    setHudState((prev) => ({
      ...prev,
      isScanning: false,
      canCapture: false,
      targetRelic: null,
    }));

    return true;
  }, []);

  // Get the relative angle for the target relic (for AR camera positioning)
  const getTargetRelicPosition = useCallback(() => {
    const currentTarget = targetRelicRef.current;
    if (!currentTarget || !userLocation) return null;

    const position = getRelicPosition(currentTarget);

    // Calculate relative angle: bearing from user to relic in radians
    const relativeAngle = (position.bearing * Math.PI) / 180;

    return {
      relativeAngle,
      distance: position.distance,
    };
  }, [userLocation, getRelicPosition]);

  // Check if GPS is active and working
  const hasGPS = !!(hasPermission && userLocation);

  return {
    relics,
    radarDots,
    hudState,
    compassHeading,
    userLocation: userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : null,
    hasGPS,
    getTargetRelicPosition,
    startScanning,
    stopScanning,
    captureRelic,
  };
};
