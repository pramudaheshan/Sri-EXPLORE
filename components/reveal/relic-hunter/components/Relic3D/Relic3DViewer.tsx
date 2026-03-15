import React, { Suspense, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { Relic } from '../../types';
import { COLORS, getRarityColor } from '../../styles/RelicHunterStyles';

// Individual 3D Relic Models
const GoldenBuddha: React.FC<{ color: string }> = ({ color }) => {
  const meshRef = useRef<any>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Base/Lotus */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.2, 16]} />
        <meshStandardMaterial color="#8B7355" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Ushnisha (top knot) */}
      <mesh position={[0, 1.0, 0]}>
        <coneGeometry args={[0.15, 0.2, 16]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

const StoneTablet: React.FC<{ color: string }> = ({ color }) => {
  const meshRef = useRef<any>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
      meshRef.current.rotation.y += 0.008;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Main tablet */}
      <mesh>
        <boxGeometry args={[0.8, 1.2, 0.15]} />
        <meshStandardMaterial color="#696969" metalness={0.1} roughness={0.9} />
      </mesh>

      {/* Inscriptions (decorative lines) */}
      {[-0.3, -0.1, 0.1, 0.3].map((y, i) => (
        <mesh key={i} position={[0, y, 0.08]}>
          <boxGeometry args={[0.5, 0.05, 0.02]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};

const TempleBell: React.FC<{ color: string }> = ({ color }) => {
  const meshRef = useRef<any>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 1.2) * 0.05;
      meshRef.current.rotation.y += 0.015;
      // Slight swing
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Bell body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.5, 0.8, 32, 1, true]} />
        <meshStandardMaterial
          color="#CD7F32"
          metalness={0.7}
          roughness={0.3}
          side={2}
        />
      </mesh>

      {/* Bell top */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#CD7F32" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Handle */}
      <mesh position={[0, 0.7, 0]}>
        <torusGeometry args={[0.1, 0.03, 16, 32]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Clapper */}
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#8B4513" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
};

const MoonstoneCarving: React.FC<{ color: string }> = ({ color }) => {
  const meshRef = useRef<any>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.6) * 0.12;
      meshRef.current.rotation.y += 0.02;
      // Mystical pulsing glow effect via scale
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={meshRef}>
      {/* Main moonstone (half circle) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.1, 32, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#E8E8E8" metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[0.65, 0.05, 16, 32, Math.PI]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Center lotus */}
      <mesh position={[0, 0.08, -0.2]}>
        <dodecahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Decorative gems */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI;
        const x = Math.cos(angle) * 0.45;
        const z = -Math.sin(angle) * 0.45;
        return (
          <mesh key={i} position={[x, 0.06, z]}>
            <octahedronGeometry args={[0.06, 0]} />
            <meshStandardMaterial color={color} metalness={1} roughness={0} />
          </mesh>
        );
      })}
    </group>
  );
};

// Scene with lighting
const RelicScene: React.FC<{ relic: Relic }> = ({ relic }) => {
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
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-5, 3, -5]} intensity={0.5} color={rarityColor} />
      <spotLight
        position={[0, 5, 0]}
        angle={0.3}
        penumbra={0.5}
        intensity={1}
        color={rarityColor}
      />

      {/* The 3D Relic */}
      {renderRelic()}
    </>
  );
};

interface Relic3DViewerProps {
  relic: Relic;
  visible: boolean;
}

export const Relic3DViewer: React.FC<Relic3DViewerProps> = ({
  relic,
  visible,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Relic name label */}
      <View
        style={[
          styles.labelContainer,
          { borderColor: getRarityColor(relic.rarity) },
        ]}
      >
        <Text
          style={[
            styles.rarityBadge,
            { backgroundColor: getRarityColor(relic.rarity) },
          ]}
        >
          {relic.rarity.toUpperCase()}
        </Text>
        <Text style={styles.relicName}>{relic.name}</Text>
      </View>

      {/* 3D Canvas */}
      <View style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <Suspense fallback={null}>
            <RelicScene relic={relic} />
          </Suspense>
        </Canvas>
      </View>

      {/* Distance indicator */}
      <View style={styles.distanceContainer}>
        <Text style={styles.distanceText}>{relic.distance}m away</Text>
        <Text style={styles.pointsText}>+{relic.points} XP</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    height: '35%',
    alignItems: 'center',
  },
  labelContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  rarityBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  canvasContainer: {
    width: '100%',
    height: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  distanceContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default Relic3DViewer;
