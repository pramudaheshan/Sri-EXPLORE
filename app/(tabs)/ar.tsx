import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { SriARInterface } from '../../components/ar/sri-ar';
import { useAuth, useARScans } from '../../hooks/useFirebase';
import { useIsFocused } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// SRI-AR - Main AR Component (Simplified)
// ============================================
const SriAR: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const isFocused = useIsFocused();

  // Firebase hooks
  const { user } = useAuth();
  const { recordScan } = useARScans(user?.uid);

  // Get current location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  const handleScanComplete = async (data: {
    relicId: string;
    relicName: string;
    xpEarned: number;
    hotspotsExplored: number;
    totalHotspots: number;
  }) => {
    // Record to Firebase if user is logged in
    if (user && currentLocation) {
      try {
        await recordScan(
          data.relicId,
          data.relicName,
          currentLocation,
          data.xpEarned,
          data.hotspotsExplored,
          data.totalHotspots,
        );
        Alert.alert(
          '🎉 Scan Complete!',
          `You explored all ${data.totalHotspots} hotspots and earned ${data.xpEarned} XP!`,
          [{ text: 'Awesome!' }],
        );
      } catch (error) {
        console.error('Error recording scan:', error);
      }
    }
  };

  // Request camera permission if not granted
  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.sriArContainer}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.sriArContainer}>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          <Ionicons name="camera" size={48} color="#00D4AA" />
          <Text style={styles.permissionText}>Camera permission required</Text>
          <Text style={styles.permissionSubtext}>Tap to grant access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isFocused) return null; // Don't render camera if not focused

  // SriARInterface now handles scanning, loading, and viewing internally
  return (
    <View style={styles.sriArContainer}>
      <SriARInterface onScanComplete={handleScanComplete} />
    </View>
  );
};

// ============================================
// RELIC HUNTER - Coming Soon Placeholder
// ============================================
const RelicHunterComingSoon: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  return (
    <View style={styles.relicHunterContainer}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Relic Hunter</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Coming Soon Content */}
        <View style={styles.comingSoonContainer}>
          <View style={styles.iconGlow}>
            <Ionicons name="compass" size={80} color="#FFD700" />
          </View>
          <Text style={styles.relicHunterTitle}>Relic Hunter</Text>
          <Text style={styles.relicHunterSubtitle}>is coming soon</Text>
          <Text style={styles.description}>
            Discover ancient artifacts hidden around Sri Lanka using augmented
            reality. Hunt for legendary relics, collect rare treasures, and
            uncover history!
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="location" size={20} color="#00D4AA" />
              <Text style={styles.featureText}>GPS-based AR exploration</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="trophy" size={20} color="#FFD700" />
              <Text style={styles.featureText}>
                Collect legendary artifacts
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="map" size={20} color="#4DA6FF" />
              <Text style={styles.featureText}>Explore historic sites</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

// ============================================
// MORE OPTIONS MENU
// ============================================
interface MoreMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectRelicHunter: () => void;
}

const MoreMenu: React.FC<MoreMenuProps> = ({
  visible,
  onClose,
  onSelectRelicHunter,
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <BlurView intensity={80} tint="dark" style={styles.menuBlur}>
            <Text style={styles.menuTitle}>More Features</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onSelectRelicHunter();
              }}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="compass" size={24} color="#FFD700" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>Relic Hunter</Text>
                <Text style={styles.menuItemSubtitle}>Coming Soon</Text>
              </View>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonBadgeText}>SOON</Text>
              </View>
            </TouchableOpacity>

            {/* Placeholder for future features */}
            <View style={[styles.menuItem, styles.menuItemDisabled]}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="camera" size={24} color="#666" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, styles.disabledText]}>
                  AR Gallery
                </Text>
                <Text style={styles.menuItemSubtitle}>Coming Soon</Text>
              </View>
            </View>
          </BlurView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ============================================
// EDGE TAB BUTTON COMPONENT
// ============================================
const EdgeTabButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle pulse animation to draw attention
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <TouchableOpacity
      style={styles.edgeTab}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.edgeTabGlow, { opacity: glowOpacity }]} />
      <View style={styles.edgeTabContent}>
        <Ionicons name="chevron-back" size={18} color="#fff" />
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// MAIN AR SCREEN
// ============================================
export default function ARScreen() {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRelicHunter, setShowRelicHunter] = useState(false);

  if (showRelicHunter) {
    return <RelicHunterComingSoon onClose={() => setShowRelicHunter(false)} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Main AR View */}
      <SriAR />

      {/* Edge Tab Button (Right Edge - Hidden) */}
      <EdgeTabButton onPress={() => setShowMoreMenu(true)} />

      {/* More Options Menu */}
      <MoreMenu
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        onSelectRelicHunter={() => setShowRelicHunter(true)}
      />
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  safeArea: {
    flex: 1,
  },

  // Sri-AR Main Screen
  sriArContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    fontFamily: 'Poppins-Medium',
  },
  permissionButton: {
    alignItems: 'center',
    padding: 40,
    justifyContent: 'center',
    flex: 1,
  },
  permissionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  permissionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    fontFamily: 'Poppins-Regular',
  },

  // Edge Tab Button (Hidden at edge)
  edgeTab: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -30,
    width: 24,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  edgeTabGlow: {
    position: 'absolute',
    right: 0,
    width: 20,
    height: 50,
    backgroundColor: '#00D4AA',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  edgeTabContent: {
    position: 'absolute',
    right: 0,
    width: 20,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Modal & Menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuBlur: {
    padding: 20,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  disabledText: {
    color: '#666',
  },
  comingSoonBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingSoonBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },

  // Relic Hunter Coming Soon
  relicHunterContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  relicHunterTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFD700',
  },
  relicHunterSubtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 24,
    marginBottom: 32,
  },
  featureList: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
