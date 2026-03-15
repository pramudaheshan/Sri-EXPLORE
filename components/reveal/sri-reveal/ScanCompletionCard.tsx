import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ScanCompletionData {
  totalHotspots: number;
  xpEarned: number;
  relicName: string;
}

interface ScanCompletionCardProps {
  isVisible: boolean;
  data: ScanCompletionData | null;
  onClose: () => void;
}

export const ScanCompletionCard: React.FC<ScanCompletionCardProps> = ({
  isVisible,
  data,
  onClose,
}) => {
  const translateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const celebrationScale = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0);
      backdropOpacity.value = withSpring(1);
      scale.value = withSpring(1);
      celebrationScale.value = withSpring(1);
    } else {
      translateY.value = withSpring(400);
      backdropOpacity.value = withSpring(0);
      scale.value = withSpring(0.9);
      celebrationScale.value = withSpring(0);
    }
  }, [isVisible]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      backdropOpacity.value,
      [0, 1],
      [0, 0.3],
      Extrapolation.CLAMP,
    ),
  }));

  const animatedCelebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationScale.value,
  }));

  if (!data) return null;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, animatedBackdropStyle]}
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Card */}
      <Animated.View style={[styles.container, animatedCardStyle]}>
        <BlurView intensity={80} tint="dark" style={styles.blurCard}>
          {/* Celebration Icon */}
          <Animated.View style={[styles.celebrationIcon, animatedCelebrationStyle]}>
            <Ionicons name="sparkles" size={60} color="#FFD700" />
          </Animated.View>

          <View style={styles.content}>
            <Text style={styles.title}>Scan Complete!</Text>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="pin" size={24} color="#00D4AA" />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Hotspots Found</Text>
                  <Text style={styles.statValue}>{data.totalHotspots}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statItem}>
                <Ionicons name="star" size={24} color="#FFD700" />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>XP Earned</Text>
                  <Text style={styles.statValue}>+{data.xpEarned}</Text>
                </View>
              </View>
            </View>

            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>
                You explored all {data.totalHotspots} hotspots and earned{' '}
                <Text style={styles.highlightText}>{data.xpEarned} XP</Text>!
              </Text>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Continue Exploring</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 50,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 12,
    zIndex: 100,
  },
  blurCard: {
    padding: 24,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  celebrationIcon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFD700',
    marginBottom: 24,
    textAlign: 'center',
  },
  statsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    marginVertical: 12,
  },
  messageContainer: {
    marginBottom: 24,
  },
  messageText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  highlightText: {
    color: '#FFD700',
    fontWeight: '800',
  },
  continueButton: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#000',
  },
});

export default ScanCompletionCard;
