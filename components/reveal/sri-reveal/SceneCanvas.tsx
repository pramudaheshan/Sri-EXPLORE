import React, {
  Suspense,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  Canvas,
  useFrame,
  useThree,
  ThreeEvent,
} from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import * as THREE from 'three';
import { HotspotData } from './DetailCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// FLOATING HOTSPOT INDICATOR (Small dot outside model)
// ============================================
interface FloatingHotspotProps {
  position: [number, number, number];
  hotspot: HotspotData;
  onPress: (hotspot: HotspotData) => void;
  isActive: boolean;
  index: number;
  totalHotspots: number;
}

const FloatingHotspot: React.FC<FloatingHotspotProps> = ({
  position,
  hotspot,
  onPress,
  isActive,
  index,
  totalHotspots,
}) => {
  const dotRef = useRef<THREE.Mesh>(null);

  // Position hotspots close to the model - just slightly outside
  // Use the actual hotspot position but push it outward slightly
  const pushOutDistance = 0.4; // How far to push the indicator from center

  // Get direction from center to hotspot position
  const dirX =
    position[0] !== 0 ? Math.sign(position[0]) : index % 2 === 0 ? 1 : -1;
  const dirZ =
    position[2] !== 0 ? Math.sign(position[2]) : index % 2 === 0 ? 1 : -1;

  // Keep Y close to the actual hotspot Y, clamped to visible range
  const clampedY = Math.max(-0.3, Math.min(0.8, position[1]));

  // Position indicator near the model surface, pushed outward
  const floatingPos: [number, number, number] = [
    dirX * pushOutDistance,
    clampedY,
    dirZ * pushOutDistance * 0.6,
  ];

  // Subtle glow pulse only - no movement
  useFrame((state, delta) => {
    if (dotRef.current) {
      const material = dotRef.current.material as THREE.MeshStandardMaterial;
      const time = state.clock.elapsedTime;
      material.emissiveIntensity = isActive
        ? 0.8 + Math.sin(time * 3) * 0.2
        : 0.4 + Math.sin(time * 2) * 0.1;
    }
  });

  // Animated ring made of small dots (more portable than dashed lines on mobile)
  const { camera } = useThree();
  const dotSize = 0.03;
  const ringRef = useRef<THREE.Group | null>(null); // defensive: keep a ringRef available
  const ringSegments = 10;
  const ringRadius = dotSize * 2.0; // slightly larger than dot
  const ringDotPositions = useMemo(() => {
    const pts: Array<{ x: number; y: number; z: number }> = [];
    for (let i = 0; i < ringSegments; i++) {
      const theta = (i / ringSegments) * Math.PI * 2;
      pts.push({
        x: Math.cos(theta) * ringRadius,
        y: Math.sin(theta) * ringRadius,
        z: 0,
      });
    }
    return pts;
  }, [ringSegments, ringRadius]);

  // Refs for the small dot meshes so we can animate them
  const ringDotsRef = useRef<Array<THREE.Mesh | null>>([]);

  // Reset ring dots refs on mount
  useEffect(() => {
    ringDotsRef.current = [];
  }, []);

  // Animate small ring dots (always animate, gentler when inactive)
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Animate each dot with a wave around the ring
    for (let i = 0; i < ringDotsRef.current.length; i++) {
      const mesh = ringDotsRef.current[i];
      if (!mesh) continue;
      const phase = (i / ringSegments) * Math.PI * 2;

      // Compute scale & emissive animation
      const speed = isActive ? 4 : 4;
      const amp = isActive ? 0.15 : 0.2; // larger amplitude when active
      const scale = 0.4 + Math.sin(t * speed + phase) * amp;

      mesh.scale.set(scale, scale, scale);

      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material) {
        const baseEmiss = isActive ? 0.9 : 0.25;
        material.emissiveIntensity =
          baseEmiss +
          Math.max(0, Math.sin(t * speed + phase)) * (isActive ? 0.6 : 0.2);
        material.emissive.set(isActive ? '#FFD700' : '#FFFFFF');
        material.needsUpdate = true;
      }
    }
  });

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      onPress(hotspot);
    },
    [hotspot, onPress],
  );

  // Anchor point on model (where line connects)
  const anchorPos: [number, number, number] = [
    position[0] * 0.15,
    position[1],
    position[2] * 0.15,
  ];

  // Line points from model to floating indicator
  const connectingLine = useMemo(() => {
    const points = [
      new THREE.Vector3(anchorPos[0], anchorPos[1], anchorPos[2]),
      new THREE.Vector3(floatingPos[0], floatingPos[1], floatingPos[2]),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: isActive ? 0xffd700 : 0xffffff,
      transparent: true,
      opacity: isActive ? 0.5 : 0.3,
    });
    return new THREE.Line(geometry, material);
  }, [anchorPos, floatingPos, isActive]);

  return (
    <group>
      {/* Subtle connecting line */}
      <primitive object={connectingLine} />

      {/* Small dot on model surface */}
      <mesh position={anchorPos}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={isActive ? '#FFD700' : '#FFFFFF'} />
      </mesh>

      {/* Animated ring made of small dots */}
      <group ref={ringRef} position={floatingPos} renderOrder={1}>
        {ringDotPositions.map((p, i) => (
          <mesh
            key={i}
            ref={(r) => (ringDotsRef.current[i] = r)}
            position={[p.x, p.y, p.z]}
          >
            <sphereGeometry args={[dotSize * 0.22, 8, 8]} />
            <meshStandardMaterial
              color={isActive ? '#FFD700' : '#FFFFFF'}
              emissive={isActive ? '#FFD700' : '#FFFFFF'}
              emissiveIntensity={isActive ? 0.8 : 0.25}
              metalness={0.2}
              roughness={0.6}
            />
          </mesh>
        ))}
      </group>

      {/* Larger invisible touch target to increase hit area */}
      <mesh position={floatingPos} onClick={handleClick} renderOrder={2}>
        <sphereGeometry args={[dotSize * 3, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.001} />
      </mesh>

      {/* Floating indicator - visible small dot */}
      <mesh ref={dotRef} position={floatingPos}>
        <sphereGeometry args={[dotSize, 16, 16]} />
        <meshStandardMaterial
          color={isActive ? '#FFD700' : '#FFFFFF'}
          emissive={isActive ? '#FFD700' : '#FFFFFF'}
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Subtle glow when active */}
      {isActive && (
        <pointLight
          position={floatingPos}
          color="#FFD700"
          intensity={0.3}
          distance={0.8}
          decay={2}
        />
      )}
    </group>
  );
};

// ============================================
// DYNAMIC GLB MODEL LOADER
// ============================================
interface DynamicRelicModelProps {
  modelUrl: string;
  onBoundsCalculated?: (bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    center: THREE.Vector3;
    size: THREE.Vector3;
  }) => void;
  gestureX?: any; // Reanimated shared value
  gestureRotation?: any; // Reanimated shared value
  gestureScale?: any; // Reanimated shared value
}

function DynamicRelicModel({
  modelUrl,
  onBoundsCalculated,
  gestureX,
  gestureRotation,
  gestureScale,
  onSceneReady,
}: DynamicRelicModelProps & { onSceneReady?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl);
  const autoRotationRef = useRef(0);
  const savedRotationRef = useRef(0);
  const [modelData, setModelData] = useState<{
    scale: number;
    offsetX: number;
    offsetY: number;
    offsetZ: number;
  } | null>(null);

  // Ensure we only call onSceneReady once
  const onSceneReadyCalledRef = useRef(false);

  // Calculate bounding box and proper scale on mount
  useEffect(() => {
    if (scene) {
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Target size - we want the model to fit in roughly a 2x2x2 unit cube
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 2;
      const scale = targetSize / maxDim;

      // Calculate offset to center the model (use primitive values, not Vector3)
      const offsetX = -center.x * scale;
      const offsetY = -box.min.y * scale;
      const offsetZ = -center.z * scale;

      setModelData({ scale, offsetX, offsetY, offsetZ });

      // Fix materials to show true colors - traverse all meshes
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (material) {
            // Ensure materials are properly lit and show original colors
            material.needsUpdate = true;
            // If material is too dark, boost it
            if (material.color) {
              // Keep original color but ensure it's visible
              material.toneMapped = false;
            }
            // Reduce metalness if too reflective without environment
            if (material.metalness > 0.5) {
              material.metalness = 0.3;
            }
            // Reduce roughness slightly for better light response
            if (material.roughness > 0.8) {
              material.roughness = 0.6;
            }
            // Add slight emissive to show base color
            if (material.color && !material.emissive) {
              material.emissive = material.color.clone();
              material.emissiveIntensity = 0.1;
            }
          }
        }
      });

      // Notify parent of the model bounds for hotspot positioning
      if (onBoundsCalculated) {
        const scaledMin = box.min.clone().multiplyScalar(scale);
        const scaledMax = box.max.clone().multiplyScalar(scale);
        const scaledSize = size.clone().multiplyScalar(scale);
        const scaledCenter = new THREE.Vector3(0, scaledSize.y / 2 - 0.8, 0);
        onBoundsCalculated({
          min: scaledMin,
          max: scaledMax,
          center: scaledCenter,
          size: scaledSize,
        });
      }

      console.log('🎨 Model loaded:', {
        originalSize: size,
        scale,
        scaledSize: size.clone().multiplyScalar(scale),
      });

      // Notify parent that the scene/model is ready (call once)
      if (onSceneReady && !onSceneReadyCalledRef.current) {
        onSceneReadyCalledRef.current = true;
        // longer delay to ensure Three.js has fully initialized internal buffers
        setTimeout(() => onSceneReady(), 500);
      }
    }
  }, [scene, onBoundsCalculated, onSceneReady]);

  // Read directly from gesture store every frame - no React re-renders needed
  useFrame((state, delta) => {
    if (groupRef.current && modelData) {
      // Read from Reanimated shared values (these support worklet context)
      const rotationValue = gestureRotation?.value ?? 0;
      const scaleValue = gestureScale?.value ?? 1;
      const autoRotationEnabled = true; // You can make this a shared value too if needed

      // Auto rotation only when enabled
      if (autoRotationEnabled) {
        autoRotationRef.current += delta * 0.1;
      }

      // Apply rotation directly
      groupRef.current.rotation.y = rotationValue + autoRotationRef.current;

      // Apply scale directly to children (the inner scaled group)
      const finalScale = modelData.scale * scaleValue;
      groupRef.current.children[0]?.scale.setScalar(finalScale);

      // Debug logging
      if (groupRef.current.children[0]) {
        const childScale = groupRef.current.children[0].scale.x;
        if (Math.abs(childScale - finalScale) > 0.001) {
          console.log('📊 Scale applied:', {
            modelScale: modelData.scale,
            gestureScale: scaleValue,
            finalScale,
            appliedScale: childScale,
          });
        }
      }
    }
  });

  // Clone the scene once with useMemo to avoid re-creating on every render
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const cloned = scene.clone(true);

    // Debug: log what's in the cloned scene
    console.log('📦 Cloned scene structure:', {
      childrenCount: cloned.children.length,
      children: cloned.children.map((c, i) => ({
        type: c.type,
        name: (c as any).name,
        isMesh: (c as any).isMesh,
      })),
    });

    return cloned;
  }, [scene]);

  if (!modelData || !clonedScene) return null;

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      <group
        scale={[modelData.scale, modelData.scale, modelData.scale]}
        position={[modelData.offsetX, modelData.offsetY, modelData.offsetZ]}
      >
        {/* Render the cloned scene directly */}
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

// ============================================
// SCENE LIGHTING (Bright, full illumination for true colors)
// ============================================
const SceneLighting: React.FC = () => {
  return (
    <>
      {/* High ambient for base visibility */}
      <ambientLight intensity={1.5} />

      {/* Key light - main illumination */}
      <directionalLight position={[5, 10, 5]} intensity={2} castShadow />

      {/* Fill light - reduce shadows */}
      <directionalLight position={[-5, 8, -5]} intensity={1.5} />

      {/* Back light - rim lighting */}
      <directionalLight position={[0, 5, -8]} intensity={1} />

      {/* Front fill */}
      <directionalLight position={[0, 2, 8]} intensity={1.2} />

      {/* Hemisphere light for natural sky/ground bounce */}
      <hemisphereLight args={['#ffffff', '#444444', 1.2]} />
    </>
  );
};

// ============================================
// CAMERA CONTROLLER (Focus on hotspot)
// ============================================
interface CameraControllerProps {
  focusPosition: [number, number, number] | null;
}

const CameraController: React.FC<CameraControllerProps> = ({
  focusPosition,
}) => {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3(0, 0, 4));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (focusPosition) {
      // Subtly shift camera to focus on hotspot
      const [x, y, z] = focusPosition;
      targetPosition.current.set(x * 0.3, y * 0.3 + 0.5, 3.5);
      targetLookAt.current.set(x * 0.5, y * 0.5, z * 0.5);
    } else {
      // Default position
      targetPosition.current.set(0, 0, 4);
      targetLookAt.current.set(0, 0, 0);
    }

    // Smooth camera movement
    camera.position.lerp(targetPosition.current, 0.05);

    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    currentLookAt.lerp(
      targetLookAt.current.clone().sub(camera.position).normalize(),
      0.05,
    );
    camera.lookAt(
      camera.position.x + currentLookAt.x,
      camera.position.y + currentLookAt.y,
      camera.position.z + currentLookAt.z,
    );
  });

  return null;
};

// ============================================
// MAIN 3D SCENE
// ============================================
interface ARHotspotSceneProps {
  hotspots: HotspotData[];
  onHotspotPress: (hotspot: HotspotData) => void;
  activeHotspotId: string | null;
  model3dUrl?: string;
  onSceneReady?: () => void;
  gestureRotation?: any; // Reanimated shared value
  gestureScale?: any; // Reanimated shared value
}

const ARHotspotScene: React.FC<ARHotspotSceneProps> = ({
  hotspots,
  onHotspotPress,
  activeHotspotId,
  model3dUrl,
  onSceneReady,
  gestureRotation,
  gestureScale,
}) => {
  const [modelBounds, setModelBounds] = useState<{
    min: THREE.Vector3;
    max: THREE.Vector3;
    center: THREE.Vector3;
    size: THREE.Vector3;
  } | null>(null);

  // Convert normalized hotspot positions (0-1) to actual 3D positions based on model bounds
  const getHotspotPosition = useCallback(
    (hotspot: HotspotData): [number, number, number] => {
      if (modelBounds && model3dUrl) {
        // Model is positioned at y=-0.8 base, and scaled to fit in ~2 unit height
        const modelHeight = modelBounds.size.y;
        const modelWidth = Math.max(modelBounds.size.x, modelBounds.size.z);

        // Convert normalized position to actual position
        // x, z: -1 to 1 maps to model width around center
        // y: 0 to 1 maps from bottom to top of model
        const x = hotspot.position.x * (modelWidth * 0.6);
        const y = -0.8 + hotspot.position.y * modelHeight;
        const z = hotspot.position.z * (modelWidth * 0.6);

        return [x, y, z];
      }
      // Fallback for sample model
      return [hotspot.position.x, hotspot.position.y, hotspot.position.z];
    },
    [modelBounds, model3dUrl],
  );

  const activeHotspot = hotspots.find((h) => h.id === activeHotspotId);
  const focusPosition = activeHotspot
    ? getHotspotPosition(activeHotspot)
    : null;

  return (
    <>
      <SceneLighting />
      <CameraController focusPosition={focusPosition} />

      {/* Relic Model - Use dynamic if URL provided */}
      {model3dUrl && (
        <DynamicRelicModel
          modelUrl={model3dUrl}
          onBoundsCalculated={setModelBounds}
          gestureRotation={gestureRotation}
          gestureScale={gestureScale}
          onSceneReady={onSceneReady}
        />
      )}

      {/* Floating Hotspot Indicators - positioned outside model */}
      {hotspots.map((hotspot, index) => {
        const position = getHotspotPosition(hotspot);
        return (
          <FloatingHotspot
            key={hotspot.id}
            position={position}
            hotspot={hotspot}
            onPress={onHotspotPress}
            isActive={hotspot.id === activeHotspotId}
            index={index}
            totalHotspots={hotspots.length}
          />
        );
      })}
    </>
  );
};

// ============================================
// EXPORTED CANVAS WRAPPER
// ============================================
interface SceneCanvasProps {
  hotspots: HotspotData[];
  onHotspotPress: (hotspot: HotspotData) => void;
  activeHotspotId: string | null;
  model3dUrl?: string;
  // Called when the 3D scene and model have finished loading and are ready to display
  onSceneReady?: () => void;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  hotspots,
  onHotspotPress,
  activeHotspotId,
  model3dUrl,
  onSceneReady,
}) => {
  // Create Reanimated shared values that can be safely modified from worklets
  const gestureRotation = useSharedValue(0);
  const gestureScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const pinchStartScale = useSharedValue(1);
  const autoRotateTimeoutRef = useRef<number | null>(null);

  // Reset on mount
  useEffect(() => {
    gestureRotation.value = 0;
    gestureScale.value = 1;
    savedRotation.value = 0;
    savedScale.value = 1;
    return () => {
      if (autoRotateTimeoutRef.current) {
        clearTimeout(autoRotateTimeoutRef.current);
      }
    };
  }, [gestureRotation, gestureScale, savedRotation, savedScale]);

  // Pan gesture for rotation
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          'worklet';
          // Disable auto-rotation during pan
        })
        .onUpdate((event) => {
          'worklet';
          const newRotation = savedRotation.value + event.translationX * 0.01;
          gestureRotation.value = newRotation;
        })
        .onEnd(() => {
          'worklet';
          savedRotation.value = gestureRotation.value;
        })
        .onFinalize(() => {
          // Resume auto-rotate after delay (runs on JS thread)
          if (autoRotateTimeoutRef.current !== null) {
            clearTimeout(autoRotateTimeoutRef.current);
          }
          autoRotateTimeoutRef.current = setTimeout(
            () => {},
            3000,
          ) as unknown as number;
        }),
    [gestureRotation, savedRotation],
  );

  // Pinch gesture for zoom
  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          'worklet';
          // Store the current scale at the start of the pinch
          pinchStartScale.value = savedScale.value;
        })
        .onUpdate((event) => {
          'worklet';
          // Calculate new scale from the pinch start value
          const newScale = pinchStartScale.value * event.scale;
          const clampedScale = Math.max(0.5, Math.min(3, newScale));
          gestureScale.value = clampedScale;
        })
        .onEnd((event) => {
          'worklet';
          // Update the saved scale for the next gesture
          const newScale = Math.max(
            0.5,
            Math.min(3, pinchStartScale.value * event.scale),
          );
          savedScale.value = newScale;
          gestureScale.value = newScale;
        })
        .onFinalize(() => {
          if (autoRotateTimeoutRef.current !== null) {
            clearTimeout(autoRotateTimeoutRef.current);
          }
          autoRotateTimeoutRef.current = setTimeout(
            () => {},
            3000,
          ) as unknown as number;
        }),
    [gestureScale, savedScale, pinchStartScale],
  );

  // Double tap to reset
  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
          'worklet';
          savedRotation.value = 0;
          savedScale.value = 1;
          pinchStartScale.value = 1;
          gestureRotation.value = 0;
          gestureScale.value = 1;
        }),
    [gestureRotation, gestureScale, savedRotation, savedScale, pinchStartScale],
  );

  // Combine gestures - pinch and pan work simultaneously
  const composedGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture, doubleTapGesture),
    [panGesture, pinchGesture, doubleTapGesture],
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.gestureArea}>
          <Canvas
            style={styles.canvas}
            camera={{ position: [0, 0, 4], fov: 50 }}
            gl={{ alpha: true }}
            frameloop="always"
          >
            <Suspense fallback={null}>
              <ARHotspotScene
                hotspots={hotspots}
                onHotspotPress={onHotspotPress}
                activeHotspotId={activeHotspotId}
                model3dUrl={model3dUrl}
                onSceneReady={onSceneReady}
                gestureRotation={gestureRotation}
                gestureScale={gestureScale}
              />
            </Suspense>
          </Canvas>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    elevation: 60,
  },
  gestureArea: {
    flex: 1,
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default SceneCanvas;
