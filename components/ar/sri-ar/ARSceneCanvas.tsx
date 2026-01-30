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
  gestureStore: typeof gestureStore;
}

function DynamicRelicModel({
  modelUrl,
  onBoundsCalculated,
  gestureStore,
  onSceneReady,
}: DynamicRelicModelProps & { onSceneReady?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl);
  const autoRotationRef = useRef(0);
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
        // slight delay to let three prepare internal buffers before we reveal UI
        setTimeout(() => onSceneReady(), 80);
      }
    }
  }, [scene, onBoundsCalculated, onSceneReady]);

  // Read directly from gesture store every frame - no React re-renders needed
  useFrame((state, delta) => {
    if (groupRef.current && modelData) {
      const {
        rotationY,
        scale: gestureScale,
        autoRotate,
      } = gestureStore.values;

      // Auto rotation only when enabled
      if (autoRotate) {
        autoRotationRef.current += delta * 0.1;
      }

      // Apply rotation directly
      groupRef.current.rotation.y = rotationY + autoRotationRef.current;

      // Apply scale directly
      const finalScale = modelData.scale * gestureScale;
      groupRef.current.children[0]?.scale.setScalar(finalScale);
    }
  });

  // Clone the scene once with useMemo to avoid re-creating on every render
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const cloned = scene.clone(true);
    return cloned;
  }, [scene]);

  if (!modelData || !clonedScene) return null;

  return (
    <group ref={groupRef} position={[0, -0.8, 0]}>
      <group
        scale={[modelData.scale, modelData.scale, modelData.scale]}
        position={[modelData.offsetX, modelData.offsetY, modelData.offsetZ]}
      >
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

// ============================================
// SAMPLE RELIC 3D MODEL (Placeholder/Fallback)
// ============================================
interface RelicModelProps {
  dimmed: boolean;
}

const SampleRelicModel: React.FC<
  RelicModelProps & { onSceneReady?: () => void }
> = ({ dimmed, onSceneReady }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Slow rotation
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  useEffect(() => {
    // Notify parent immediately for sample model
    if (onSceneReady) {
      setTimeout(() => onSceneReady(), 60);
    }
  }, [onSceneReady]);

  const opacity = dimmed ? 0.6 : 1;

  return (
    <group ref={groupRef}>
      {/* Base pedestal */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.2, 32]} />
        <meshStandardMaterial
          color="#4a4a4a"
          metalness={0.3}
          roughness={0.7}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Main artifact body - stylized ancient pillar */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 1.4, 8]} />
        <meshStandardMaterial
          color="#C4A55A"
          metalness={0.4}
          roughness={0.6}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Top ornament */}
      <mesh position={[0, 0.85, 0]}>
        <dodecahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color="#FFD700"
          metalness={0.9}
          roughness={0.1}
          emissive="#FFD700"
          emissiveIntensity={0.2}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Decorative rings */}
      {[0.3, 0, -0.3].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.03, 16, 32]} />
          <meshStandardMaterial
            color="#B8860B"
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
};

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
  gestureStore: typeof gestureStore;
  onSceneReady?: () => void;
}

const ARHotspotScene: React.FC<ARHotspotSceneProps> = ({
  hotspots,
  onHotspotPress,
  activeHotspotId,
  model3dUrl,
  gestureStore,
  onSceneReady,
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

      {/* Relic Model - Use dynamic if URL provided, otherwise fallback */}
      {model3dUrl ? (
        <DynamicRelicModel
          modelUrl={model3dUrl}
          onBoundsCalculated={setModelBounds}
          gestureStore={gestureStore}
          onSceneReady={onSceneReady}
        />
      ) : (
        <SampleRelicModel dimmed={false} onSceneReady={onSceneReady} />
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
// ============================================
// GESTURE VALUES STORE (shared between gesture handler and 3D scene)
// ============================================
interface GestureValues {
  rotationY: number;
  scale: number;
  autoRotate: boolean;
}

// Using a ref-based store to avoid React re-renders during gestures
const gestureStore = {
  values: { rotationY: 0, scale: 1, autoRotate: true } as GestureValues,
  listeners: new Set<() => void>(),
  update(partial: Partial<GestureValues>) {
    Object.assign(this.values, partial);
    // Don't trigger React re-renders, the 3D scene reads directly from the store
  },
  reset() {
    this.values = { rotationY: 0, scale: 1, autoRotate: true };
  },
};

// ============================================
// EXPORTED CANVAS WRAPPER
// ============================================
interface ARSceneCanvasProps {
  hotspots: HotspotData[];
  onHotspotPress: (hotspot: HotspotData) => void;
  activeHotspotId: string | null;
  model3dUrl?: string;
  // Called when the 3D scene and model have finished loading and are ready to display
  onSceneReady?: () => void;
}

export const ARSceneCanvas: React.FC<ARSceneCanvasProps> = ({
  hotspots,
  onHotspotPress,
  activeHotspotId,
  model3dUrl,
  onSceneReady,
}) => {
  // Use refs for gesture values to avoid re-renders
  const gestureRef = useRef(gestureStore.values);
  const savedRotation = useRef(0);
  const savedScale = useRef(1);
  const autoRotateTimeoutRef = useRef<number | null>(null);

  // Reset on mount
  useEffect(() => {
    gestureStore.reset();
    gestureRef.current = gestureStore.values;
    return () => {
      if (autoRotateTimeoutRef.current) {
        clearTimeout(autoRotateTimeoutRef.current);
      }
    };
  }, []);

  // Pan gesture for rotation - optimized without runOnJS on update
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          'worklet';
          gestureStore.values.autoRotate = false;
        })
        .onUpdate((event) => {
          'worklet';
          gestureStore.values.rotationY =
            savedRotation.current + event.translationX * 0.01;
        })
        .onEnd((event) => {
          'worklet';
          savedRotation.current =
            savedRotation.current + event.translationX * 0.01;
          gestureStore.values.rotationY = savedRotation.current;
        })
        .onFinalize(() => {
          // Resume auto-rotate after delay (this runs on JS thread)
          if (autoRotateTimeoutRef.current !== null) {
            clearTimeout(autoRotateTimeoutRef.current);
          }
          autoRotateTimeoutRef.current = setTimeout(() => {
            gestureStore.values.autoRotate = true;
          }, 3000) as unknown as number;
        }),
    [],
  );

  // Pinch gesture for zoom - optimized
  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          'worklet';
          gestureStore.values.autoRotate = false;
        })
        .onUpdate((event) => {
          'worklet';
          gestureStore.values.scale = Math.max(
            0.5,
            Math.min(3, savedScale.current * event.scale),
          );
        })
        .onEnd((event) => {
          'worklet';
          savedScale.current = Math.max(
            0.5,
            Math.min(3, savedScale.current * event.scale),
          );
          gestureStore.values.scale = savedScale.current;
        })
        .onFinalize(() => {
          if (autoRotateTimeoutRef.current !== null) {
            clearTimeout(autoRotateTimeoutRef.current);
          }
          autoRotateTimeoutRef.current = setTimeout(() => {
            gestureStore.values.autoRotate = true;
          }, 3000) as unknown as number;
        }),
    [],
  );

  // Double tap to reset
  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
          'worklet';
          savedRotation.current = 0;
          savedScale.current = 1;
          gestureStore.values.rotationY = 0;
          gestureStore.values.scale = 1;
          gestureStore.values.autoRotate = true;
        }),
    [],
  );

  // Combine gestures
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
                gestureStore={gestureStore}
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

export default ARSceneCanvas;
