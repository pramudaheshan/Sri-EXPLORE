import React, { Suspense, useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { Relic } from '../../types';
import { COLORS, getRarityColor } from '../../styles/RelicHunterStyles';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// 3D RELIC MODELS
// ============================================

const GoldenBuddha: React.FC<{ color: string }> = ({ color }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle idle animation
      groupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Base/Lotus Platform */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.8, 1.0, 0.15, 32]} />
        <meshStandardMaterial color="#8B7355" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.7, 0.8, 0.1, 32]} />
        <meshStandardMaterial color="#9B8365" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Body - seated Buddha shape */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Shoulders */}
      <mesh position={[-0.35, 0.2, 0]} rotation={[0, 0, 0.3]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0.35, 0.2, 0]} rotation={[0, 0, -0.3]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Ushnisha (wisdom bump) */}
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Face details */}
      <mesh position={[0, 0.65, 0.28]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#8B4513" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
};

const StoneTablet: React.FC<{ color: string }> = ({ color }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.4) * 0.015;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Stone base */}
      <mesh position={[0, -0.7, 0]}>
        <boxGeometry args={[1.2, 0.15, 0.6]} />
        <meshStandardMaterial
          color="#5a5a5a"
          metalness={0.1}
          roughness={0.95}
        />
      </mesh>

      {/* Main tablet */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.0, 1.4, 0.12]} />
        <meshStandardMaterial color="#707070" metalness={0.1} roughness={0.9} />
      </mesh>

      {/* Carved border */}
      <mesh position={[0, 0.1, 0.065]}>
        <boxGeometry args={[0.9, 1.3, 0.02]} />
        <meshStandardMaterial
          color="#606060"
          metalness={0.1}
          roughness={0.85}
        />
      </mesh>

      {/* Inscription lines */}
      {[-0.4, -0.2, 0, 0.2, 0.4].map((y, i) => (
        <mesh key={i} position={[0, y, 0.08]}>
          <boxGeometry args={[0.7, 0.04, 0.01]} />
          <meshStandardMaterial
            color={color}
            metalness={0.6}
            roughness={0.4}
            emissive={color}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Ancient symbols */}
      <mesh position={[0, 0.55, 0.08]}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
};

const TempleBell: React.FC<{ color: string }> = ({ color }) => {
  const groupRef = useRef<THREE.Group>(null);
  const clapperRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle swaying
      groupRef.current.rotation.z =
        Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      groupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.6) * 0.01;
    }
    if (clapperRef.current) {
      // Clapper swing
      clapperRef.current.rotation.z =
        Math.sin(state.clock.elapsedTime * 2) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Hanging chain */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Top crown */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 0.15, 16]} />
        <meshStandardMaterial
          color="#CD7F32"
          metalness={0.75}
          roughness={0.25}
        />
      </mesh>

      {/* Bell dome */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.18, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#CD7F32"
          metalness={0.75}
          roughness={0.25}
        />
      </mesh>

      {/* Bell body */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.18, 0.45, 0.7, 32, 1, true]} />
        <meshStandardMaterial
          color="#CD7F32"
          metalness={0.75}
          roughness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bell rim */}
      <mesh position={[0, -0.25, 0]}>
        <torusGeometry args={[0.45, 0.04, 16, 32]} />
        <meshStandardMaterial color="#B8860B" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Decorative band */}
      <mesh position={[0, 0.25, 0]}>
        <torusGeometry args={[0.22, 0.02, 16, 32]} />
        <meshStandardMaterial
          color={color}
          metalness={0.9}
          roughness={0.1}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Clapper */}
      <group ref={clapperRef}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
          <meshStandardMaterial
            color="#4a4a4a"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial
            color="#8B4513"
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
      </group>
    </group>
  );
};

const MoonstoneCarving: React.FC<{ color: string }> = ({ color }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
      // Mystical pulsing
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      groupRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={groupRef} rotation={[-Math.PI / 6, 0, 0]}>
      {/* Base platform */}
      <mesh position={[0, -0.5, 0.2]}>
        <boxGeometry args={[1.8, 0.1, 1.2]} />
        <meshStandardMaterial color="#8B8B83" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Main moonstone (semicircle) */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.08, 32, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#E8E4D9" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Outer decorative ring */}
      <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.04, 16, 32, Math.PI]} />
        <meshStandardMaterial
          color={color}
          metalness={0.85}
          roughness={0.15}
          emissive={color}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Inner carved bands */}
      {[0.6, 0.45, 0.3].map((radius, i) => (
        <mesh key={i} position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.015, 8, 32, Math.PI]} />
          <meshStandardMaterial
            color="#C0B8A8"
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
      ))}

      {/* Center lotus flower */}
      <mesh position={[0, -0.15, 0.06]}>
        <dodecahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial
          color={color}
          metalness={0.9}
          roughness={0.1}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Decorative gems around the arc */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const angle = (i / 6) * Math.PI;
        const x = Math.cos(angle) * 0.65;
        const y = Math.sin(angle) * 0.65 - 0.15;
        return (
          <mesh key={i} position={[x, y, 0.06]}>
            <octahedronGeometry args={[0.04, 0]} />
            <meshStandardMaterial
              color={color}
              metalness={1}
              roughness={0}
              emissive={color}
              emissiveIntensity={0.6}
            />
          </mesh>
        );
      })}

      {/* Animal carvings (simplified elephants) */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, -0.3, 0.05]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color="#A09080"
            metalness={0.2}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
};

// ============================================
// AR SCENE - GPS-BASED CAMERA (User walks around static relic)
// ============================================

interface GPSCameraControllerProps {
  relativeAngle: number; // Angle from user to relic in radians (0 = North)
  distance: number; // Distance in meters (used for scaling)
  compassHeading: number; // User's compass heading in degrees
  useGPS: boolean; // Whether to use GPS-based positioning
}

const GPSCameraController: React.FC<GPSCameraControllerProps> = ({
  relativeAngle,
  distance,
  compassHeading,
  useGPS,
}) => {
  const { camera } = useThree();
  const angleRef = useRef(0);
  const targetAngleRef = useRef(0);

  useFrame((state, delta) => {
    if (useGPS) {
      // GPS MODE: Camera position based on user's position relative to relic
      // The relic is at center (0,0,0), camera orbits based on user's real position

      // Convert compass heading to radians and combine with relative angle
      // When user faces the relic, they see the front
      // As user walks around, the view angle changes
      const headingRad = (compassHeading * Math.PI) / 180;

      // Calculate camera angle: user's bearing to relic minus their heading
      // This creates the effect of walking around a stationary object
      targetAngleRef.current = relativeAngle - headingRad + Math.PI;

      // Smooth interpolation for stable viewing
      angleRef.current += (targetAngleRef.current - angleRef.current) * 0.1;

      // Camera orbit radius (fixed for consistent view)
      const radius = 3;

      // Position camera based on calculated angle
      camera.position.x = Math.sin(angleRef.current) * radius;
      camera.position.z = Math.cos(angleRef.current) * radius;
      camera.position.y = 1;
      camera.lookAt(0, 0, 0);
    } else {
      // DEMO MODE: Auto-rotation for testing without GPS
      angleRef.current += delta * 0.3;
      const radius = 3;
      camera.position.x = Math.sin(angleRef.current) * radius;
      camera.position.z = Math.cos(angleRef.current) * radius;
      camera.position.y = 1;
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
};

interface RelicSceneProps {
  relic: Relic;
  relativeAngle: number;
  distance: number;
  compassHeading: number;
  useGPS: boolean;
}

const RelicScene: React.FC<RelicSceneProps> = ({
  relic,
  relativeAngle,
  distance,
  compassHeading,
  useGPS,
}) => {
  const rarityColor = getRarityColor(relic.rarity);

  const renderRelic = () => {
    switch (relic.id) {
      case '1':
        return <GoldenBuddha color={rarityColor} />;
      case '2':
        return <StoneTablet color={rarityColor} />;
      case '3':
        return <TempleBell color={rarityColor} />;
      case '4':
        return <MoonstoneCarving color={rarityColor} />;
      default:
        return <GoldenBuddha color={rarityColor} />;
    }
  };

  return (
    <>
      {/* GPS-based or auto-rotating camera */}
      <GPSCameraController
        relativeAngle={relativeAngle}
        distance={distance}
        compassHeading={compassHeading}
        useGPS={useGPS}
      />

      {/* Ambient lighting */}
      <ambientLight intensity={0.6} />

      {/* Main directional light (sun) */}
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />

      {/* Accent lights based on rarity */}
      <pointLight position={[2, 2, 2]} intensity={0.5} color={rarityColor} />
      <pointLight position={[-2, 1, -2]} intensity={0.3} color={rarityColor} />
      <spotLight
        position={[0, 4, 0]}
        intensity={0.8}
        angle={0.5}
        penumbra={0.5}
        color={rarityColor}
      />

      {/* Ground plane (subtle shadow catcher) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.8, 0]}
        receiveShadow
      >
        <circleGeometry args={[2.5, 64]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.15} />
      </mesh>

      {/* Relic glow ring on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.78, 0]}>
        <ringGeometry args={[1.2, 1.35, 64]} />
        <meshBasicMaterial color={rarityColor} transparent opacity={0.5} />
      </mesh>

      {/* Inner glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.77, 0]}>
        <ringGeometry args={[0.9, 1.0, 64]} />
        <meshBasicMaterial color={rarityColor} transparent opacity={0.3} />
      </mesh>

      {/* The 3D Relic - centered and properly oriented */}
      <group position={[0, 0, 0]}>{renderRelic()}</group>
    </>
  );
};

// ============================================
// MAIN AR VIEWER COMPONENT
// ============================================

interface ARRelicViewerProps {
  relic: Relic;
  visible: boolean;
  // GPS-based positioning props
  relativeAngle?: number; // Bearing from user to relic (radians)
  compassHeading?: number; // User's compass heading (degrees)
  useGPS?: boolean; // Enable GPS-based camera positioning
}

export const ARRelicViewer: React.FC<ARRelicViewerProps> = ({
  relic,
  visible,
  relativeAngle = 0,
  compassHeading = 0,
  useGPS = false,
}) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (visible) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => setIsReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [visible]);

  if (!visible) return null;

  const rarityColor = getRarityColor(relic.rarity);
  const modeText = useGPS
    ? 'GPS tracking active - Walk around to view'
    : 'Auto-rotating view';

  return (
    <View style={styles.container}>
      {/* 3D Canvas - Full screen, transparent background */}
      <Canvas
        style={styles.canvas}
        camera={{ position: [0, 1, 3], fov: 50, near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <RelicScene
            relic={relic}
            relativeAngle={relativeAngle}
            distance={relic.distance}
            compassHeading={compassHeading}
            useGPS={useGPS}
          />
        </Suspense>
      </Canvas>

      {/* Relic info overlay */}
      <View style={styles.infoOverlay}>
        <View style={[styles.infoCard, { borderColor: rarityColor }]}>
          <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
            <Text style={styles.rarityText}>{relic.rarity.toUpperCase()}</Text>
          </View>
          <Text style={styles.relicName}>{relic.name}</Text>
          <Text style={styles.relicDescription} numberOfLines={2}>
            {relic.description}
          </Text>
        </View>
      </View>

      {/* Distance & points */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="navigate" size={14} color={COLORS.textSecondary} />
          <Text style={styles.statText}>{relic.distance}m away</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="star" size={14} color={COLORS.primary} />
          <Text style={[styles.statText, { color: COLORS.primary }]}>
            +{relic.points} XP
          </Text>
        </View>
      </View>

      {/* Tracking mode indicator */}
      <View style={styles.trackingIndicator}>
        <View
          style={[
            styles.trackingDot,
            { backgroundColor: useGPS ? '#00E676' : rarityColor },
          ]}
        />
        <Text style={styles.trackingText}>{modeText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1, // Lower z-index so HUD buttons are clickable
    pointerEvents: 'box-none', // Allow touches to pass through to buttons
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent',
    pointerEvents: 'none', // 3D canvas doesn't block touches
  },
  infoOverlay: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    pointerEvents: 'none', // Info doesn't block touches
  },
  infoCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    backdropFilter: 'blur(10px)',
  },
  rarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 1,
  },
  relicName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  relicDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  calibrateButton: {
    position: 'absolute',
    top: 80,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  calibrateText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  statsContainer: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    flexDirection: 'row',
    gap: 16,
    pointerEvents: 'none', // Don't block touches
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  trackingIndicator: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    pointerEvents: 'none', // Don't block touches
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676',
  },
  trackingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  errorContainer: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 82, 82, 0.9)',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ARRelicViewer;
