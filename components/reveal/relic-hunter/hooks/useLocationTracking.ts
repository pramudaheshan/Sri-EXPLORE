import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Relic } from '../types';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number; // Compass heading (0-360)
}

interface RelicPosition {
  distance: number; // meters from user
  bearing: number; // angle from north (0-360)
  relativeAngle: number; // angle relative to user's heading (-180 to 180)
  isVisible: boolean; // within view cone
  isInRange: boolean; // close enough to interact
}

interface UseLocationTrackingReturn {
  userLocation: UserLocation | null;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
  getRelicPosition: (relic: Relic) => RelicPosition;
  compassHeading: number;
}

// Distance threshold for AR viewing (meters)
const AR_VIEW_DISTANCE = 50;
// Field of view angle (degrees)
const FOV_ANGLE = 60;

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculate bearing from point 1 to point 2
 */
const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360; // Normalize to 0-360

  return bearing;
};

export const useLocationTracking = (): UseLocationTrackingReturn => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );
  const magnetometerSubscription = useRef<any>(null);

  // Request permissions and start tracking
  useEffect(() => {
    let isMounted = true;

    const startTracking = async () => {
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (isMounted) {
            setError('Location permission denied');
            setHasPermission(false);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setHasPermission(true);
        }

        // Start watching location
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 500,
            distanceInterval: 0.5,
          },
          (location) => {
            if (isMounted) {
              setUserLocation((prev) => ({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                heading: prev?.heading ?? 0,
              }));
            }
          }
        );

        // Start magnetometer for compass heading
        const magnetAvailable = await Magnetometer.isAvailableAsync();
        if (magnetAvailable) {
          Magnetometer.setUpdateInterval(50);
          magnetometerSubscription.current = Magnetometer.addListener(
            (data) => {
              if (isMounted) {
                // Calculate heading from magnetometer
                let heading = Math.atan2(data.y, data.x) * (180 / Math.PI);
                heading = (heading + 360) % 360;
                setCompassHeading(heading);
                setUserLocation((prev) => (prev ? { ...prev, heading } : null));
              }
            }
          );
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to start location tracking');
          setIsLoading(false);
        }
        console.error(err);
      }
    };

    startTracking();

    return () => {
      isMounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
      }
    };
  }, []);

  // Calculate relic position relative to user
  const getRelicPosition = useCallback(
    (relic: Relic): RelicPosition => {
      if (!userLocation) {
        return {
          distance: Infinity,
          bearing: 0,
          relativeAngle: 0,
          isVisible: false,
          isInRange: false,
        };
      }

      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        relic.location.latitude,
        relic.location.longitude
      );

      const bearing = calculateBearing(
        userLocation.latitude,
        userLocation.longitude,
        relic.location.latitude,
        relic.location.longitude
      );

      // Calculate relative angle (how far off-center the relic is)
      let relativeAngle = bearing - compassHeading;
      if (relativeAngle > 180) relativeAngle -= 360;
      if (relativeAngle < -180) relativeAngle += 360;

      const isVisible = Math.abs(relativeAngle) <= FOV_ANGLE;
      const isInRange = distance <= AR_VIEW_DISTANCE;

      return {
        distance,
        bearing,
        relativeAngle,
        isVisible,
        isInRange,
      };
    },
    [userLocation, compassHeading]
  );

  return {
    userLocation,
    hasPermission,
    isLoading,
    error,
    getRelicPosition,
    compassHeading,
  };
};

export default useLocationTracking;
