// @ts-nocheck
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
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface HotspotData {
  id: string;
  title: string;
  description: string;
  xp: number;
  position: { x: number; y: number; z: number };
}

interface DetailCardProps {
  isVisible: boolean;
  hotspot: HotspotData | null;
  onClose: () => void;
  onComplete: (xp: number) => void;
  isCollected?: boolean;
}

export const DetailCard: React.FC<DetailCardProps> = ({
  isVisible,
  hotspot,
  onClose,
  onComplete,
  isCollected = false,
}) => {
  const translateY = useSharedValue(400); // Start off-screen
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0);
      backdropOpacity.value = withSpring(1);
      scale.value = withSpring(1);
    } else {
      translateY.value = withSpring(400);
      backdropOpacity.value = withSpring(0);
      scale.value = withSpring(0.9);
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

  // Play reward sound (optional - works without sound file)
  const playRewardSound = async () => {
    // Sound is optional - the feature works without it
    // To add sound: place a reward.mp3 file in assets/sounds/
    // and uncomment the code below:
    /*
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../../../assets/sounds/reward.mp3')
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Sound not available');
    }
    */
  };

  const handleComplete = async () => {
    if (hotspot) {
      await playRewardSound();
      onComplete(hotspot.xp);
      onClose();
    }
  };

  if (!hotspot) return null;

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
          {/* Handle for the "Pull-down" feel */}
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <View style={styles.hotspotIndicator} />
              <Text style={styles.title}>{hotspot.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={32} color="#FFD700" />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>{hotspot.description}</Text>

          {/* Fun fact or additional info */}
          <View style={styles.factContainer}>
            <Ionicons name="bulb-outline" size={18} color="#FFD700" />
            <Text style={styles.factText}>
              Tap "Got it!" to add this discovery to your collection
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.completeButton,
              isCollected ? styles.completeButtonDisabled : null,
            ]}
            onPress={handleComplete}
            disabled={!!isCollected}
            accessibilityState={{ disabled: !!isCollected }}
          >
            <Ionicons
              name={isCollected ? 'checkmark-circle' : 'sparkles'}
              size={20}
              color={isCollected ? '#FFD700' : '#000'}
            />
            <Text style={styles.buttonText}>
              {isCollected ? 'Already collected' : `Got it! +${hotspot.xp} XP`}
            </Text>
          </TouchableOpacity>
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
  handle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  hotspotIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
    marginRight: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  title: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 0,
    alignSelf: 'flex-start',
    marginTop: -4,
  },
  description: {
    color: 'white',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  factContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  factText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    flex: 1,
  },
  completeButton: {
    backgroundColor: '#FFD700',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  completeButtonDisabled: {
    backgroundColor: 'rgba(255, 215, 0, 0.35)',
    opacity: 0.82,
    shadowOpacity: 0,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#000',
  },
});

export default DetailCard;
