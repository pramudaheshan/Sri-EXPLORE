import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';
import { Magnetometer } from 'expo-sensors';

interface DeviceOrientation {
  alpha: number; // Z-axis rotation (compass heading)
  beta: number; // X-axis rotation (front-back tilt)
  gamma: number; // Y-axis rotation (left-right tilt)
}

interface ARWorldPosition {
  // Camera position relative to relic
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  // Camera rotation
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}

interface UseARWorldTrackingReturn {
  orientation: DeviceOrientation;
  worldPosition: ARWorldPosition;
  isTracking: boolean;
  calibrate: () => void;
  error: string | null;
}

export const useARWorldTracking = (): UseARWorldTrackingReturn => {
  const [orientation, setOrientation] = useState<DeviceOrientation>({
    alpha: 0,
    beta: 0,
    gamma: 0,
  });

  const [worldPosition, setWorldPosition] = useState<ARWorldPosition>({
    cameraX: 0,
    cameraY: 0,
    cameraZ: 3, // Default camera distance
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  });

  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialOrientation = useRef<DeviceOrientation | null>(null);
  const magnetometerHeading = useRef(0);

  // Subscribe to device motion
  useEffect(() => {
    let motionSubscription: any;
    let magnetSubscription: any;

    const startTracking = async () => {
      try {
        // Check availability
        const motionAvailable = await DeviceMotion.isAvailableAsync();
        const magnetAvailable = await Magnetometer.isAvailableAsync();

        if (!motionAvailable) {
          setError('Device motion not available');
          return;
        }

        // Set update interval (60fps)
        DeviceMotion.setUpdateInterval(16);

        if (magnetAvailable) {
          Magnetometer.setUpdateInterval(50);
        }

        // Subscribe to device motion
        motionSubscription = DeviceMotion.addListener(
          (data: DeviceMotionMeasurement) => {
            if (data.rotation) {
              const { alpha, beta, gamma } = data.rotation;

              // Store initial orientation for calibration
              if (!initialOrientation.current) {
                initialOrientation.current = {
                  alpha: alpha || 0,
                  beta: beta || 0,
                  gamma: gamma || 0,
                };
              }

              const newOrientation = {
                alpha:
                  ((alpha || 0) - (initialOrientation.current?.alpha || 0)) *
                  (180 / Math.PI),
                beta:
                  ((beta || 0) - (initialOrientation.current?.beta || 0)) *
                  (180 / Math.PI),
                gamma:
                  ((gamma || 0) - (initialOrientation.current?.gamma || 0)) *
                  (180 / Math.PI),
              };

              setOrientation(newOrientation);

              // Calculate camera position around the relic (orbital camera)
              const distance = 3; // Fixed distance from relic
              const horizontalAngle = newOrientation.alpha * (Math.PI / 180);
              const verticalAngle =
                Math.max(-60, Math.min(60, newOrientation.beta)) *
                (Math.PI / 180);

              setWorldPosition({
                cameraX:
                  Math.sin(horizontalAngle) *
                  distance *
                  Math.cos(verticalAngle),
                cameraY: Math.sin(verticalAngle) * distance * 0.5,
                cameraZ:
                  Math.cos(horizontalAngle) *
                  distance *
                  Math.cos(verticalAngle),
                rotationX: -newOrientation.beta * (Math.PI / 180),
                rotationY: -newOrientation.alpha * (Math.PI / 180),
                rotationZ: newOrientation.gamma * (Math.PI / 180) * 0.3,
              });
            }
          }
        );

        // Subscribe to magnetometer for compass heading
        if (magnetAvailable) {
          magnetSubscription = Magnetometer.addListener((data) => {
            const { x, y } = data;
            magnetometerHeading.current = Math.atan2(y, x) * (180 / Math.PI);
          });
        }

        setIsTracking(true);
      } catch (err) {
        setError('Failed to start motion tracking');
        console.error(err);
      }
    };

    startTracking();

    return () => {
      if (motionSubscription) {
        motionSubscription.remove();
      }
      if (magnetSubscription) {
        magnetSubscription.remove();
      }
    };
  }, []);

  // Calibrate / reset orientation
  const calibrate = useCallback(() => {
    initialOrientation.current = null;
    setOrientation({ alpha: 0, beta: 0, gamma: 0 });
    setWorldPosition({
      cameraX: 0,
      cameraY: 0,
      cameraZ: 3,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    });
  }, []);

  return {
    orientation,
    worldPosition,
    isTracking,
    calibrate,
    error,
  };
};

export default useARWorldTracking;
