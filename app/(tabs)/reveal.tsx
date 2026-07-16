// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { ScanInterface } from '../../components/reveal';
import { RevealDashboard } from '../../components/reveal';
import { ScanHistory } from '../../components/reveal';
import { RelicDetailView } from '../../components/reveal';
import { ScanCompletionCard } from '../../components/reveal/sri-reveal/ScanCompletionCard';
import { SriLankanMapScreen } from '../../components/reveal';
import { useAuth, useARScans } from '../../hooks/useFirebase';
import { useIsFocused } from '@react-navigation/native';
import { ARScan } from '../../services/firebaseService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// VIEW MODES & TYPES
// ============================================
type ViewMode =
  | 'dashboard'
  | 'scanning'
  | 'relic-hunter'
  | 'scan-history'
  | 'relic-detail'
  | 'map-progress';

interface RelicData {
  relicId: string;
  relicName: string;
  description?: string;
  model3dUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  hotspots?: Array<{
    id: string;
    name: string;
    description: string;
    position: { x: number; y: number; z: number };
  }>;
  xpReward?: number;
  difficulty?: string;
  tags?: string[];
}

// ============================================
// SRI-AR - Main AR Component (Simplified)
// ============================================
interface SriARProps {
  onViewingChange?: (isViewing: boolean) => void;
  relicData?: RelicData | null;
}

const SriAR: React.FC<SriARProps> = ({ onViewingChange, relicData }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const isFocused = useIsFocused();

  // Firebase hooks
  const { user } = useAuth();
  const { recordScan } = useARScans(user?.uid);

  console.log(
    '🔧 reveal.tsx initialized - user:',
    user?.uid,
    'recordScan available:',
    typeof recordScan,
  );

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
    console.log('🔍 handleScanComplete called with:', {
      relicId: data.relicId,
      relicName: data.relicName,
      user: user?.uid,
      hasLocation: !!currentLocation,
      recordScanType: typeof recordScan,
      recordScanDefined: !!recordScan,
    });

    // Verify recordScan is available
    if (!recordScan || typeof recordScan !== 'function') {
      console.error('❌ recordScan is not a function!', {
        recordScan,
        type: typeof recordScan,
      });
      Alert.alert(
        'Error',
        'Unable to record scan - recordScan function not available',
      );
      return;
    }

    // Verify user is logged in
    if (!user) {
      console.error('❌ User is not logged in!');
      Alert.alert('Error', 'You must be logged in to record a scan');
      return;
    }

    // Verify location is available
    if (!currentLocation) {
      console.error('❌ Current location is not available!');
      Alert.alert('Error', 'Location permission is required to record a scan');
      return;
    }

    // Record to Firebase
    try {
      const scanId = await recordScan(
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
    } catch (error: any) {
      console.error('❌ Error in handleScanComplete:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      Alert.alert(
        'Error',
        `Failed to record scan: ${error?.message || String(error)}`,
      );
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
      <View style={styles.scanInterfaceContainer}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.scanInterfaceContainer}>
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
    <View style={styles.scanInterfaceContainer}>
      <ScanInterface
        onScanComplete={handleScanComplete}
        onViewingChange={onViewingChange}
        relicData={relicData ?? undefined}
      />
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
// SETTINGS - Placeholder
// ============================================
const SettingsView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <View style={styles.relicHunterContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.comingSoonContainer}>
          <View style={styles.iconGlow}>
            <Ionicons name="settings" size={80} color="#4DA6FF" />
          </View>
          <Text style={styles.relicHunterTitle}>Settings</Text>
          <Text style={styles.description}>
            Manage your preferences, notifications, and account settings. Coming
            soon!
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

// ============================================
// MAIN AR SCREEN
// ============================================
export default function ARScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isViewing, setIsViewing] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ARScan | null>(null);
  const [allScans, setAllScans] = useState<ARScan[]>([]); // Track all scans for navigation
  const [selectedRelicData, setSelectedRelicData] = useState<
    RelicData | undefined
  >(undefined);
  const [showScanCompletion, setShowScanCompletion] = useState(false);
  const [scanCompletionData, setScanCompletionData] = useState<{
    totalHotspots: number;
    xpEarned: number;
    relicName: string;
  } | null>(null);

  // Firebase hooks
  const { user } = useAuth();
  const { recordScan } = useARScans(user?.uid);

  // Location state
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Request location on mount
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

  // Handle scan completion
  const handleScanComplete = async (data: {
    relicId: string;
    relicName: string;
    xpEarned: number;
    hotspotsExplored: number;
    totalHotspots: number;
  }) => {
    console.log('🔍 handleScanComplete called with:', {
      relicId: data.relicId,
      relicName: data.relicName,
      user: user?.uid,
      hasLocation: !!currentLocation,
      recordScanType: typeof recordScan,
      recordScanDefined: !!recordScan,
    });

    // Verify recordScan is available
    if (!recordScan || typeof recordScan !== 'function') {
      console.error('❌ recordScan is not a function!', {
        recordScan,
        type: typeof recordScan,
      });
      Alert.alert(
        'Error',
        'Unable to record scan - recordScan function not available',
      );
      return;
    }

    // Verify user is logged in
    if (!user) {
      console.error('❌ User is not logged in!');
      Alert.alert('Error', 'You must be logged in to record a scan');
      return;
    }

    // Verify location is available
    if (!currentLocation) {
      console.error('❌ Current location is not available!');
      Alert.alert('Error', 'Location permission is required to record a scan');
      return;
    }

    // Record to Firebase
    try {
      const scanId = await recordScan(
        data.relicId,
        data.relicName,
        currentLocation,
        data.xpEarned,
        data.hotspotsExplored,
        data.totalHotspots,
      );

      // Show scan completion card instead of alert
      setScanCompletionData({
        totalHotspots: data.totalHotspots,
        xpEarned: data.xpEarned,
        relicName: data.relicName,
      });
      setShowScanCompletion(true);
    } catch (error: any) {
      console.error('❌ Error in handleScanComplete:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      Alert.alert(
        'Error',
        `Failed to record scan: ${error?.message || String(error)}`,
      );
    }
  };

  // Handle back navigation from scanning to dashboard
  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setSelectedScan(null);
    setSelectedRelicData(undefined);
  };

  // Handle opening scan history
  const handleOpenScanHistory = () => {
    setViewMode('scan-history');
  };

  // Handle opening map progress
  const handleMapProgress = () => {
    setViewMode('map-progress');
  };

  // Handle selecting a relic from history
  const handleSelectRelic = (scan: ARScan, scans?: ARScan[]) => {
    setSelectedScan(scan);
    if (scans && scans.length > 0) {
      setAllScans(scans);
      console.log(
        `[RELIC-DETAIL] Received ${scans.length} scans for navigation`,
      );
    }
    setViewMode('relic-detail');
  };

  // View in AR behavior removed — scanning is started via dashboard or other flows.

  // Render based on view mode
  if (viewMode === 'relic-hunter') {
    return <RelicHunterComingSoon onClose={handleBackToDashboard} />;
  }

  if (viewMode === 'scan-history') {
    return (
      <ScanHistory
        onBack={handleBackToDashboard}
        onSelectRelic={handleSelectRelic}
      />
    );
  }

  if (viewMode === 'relic-detail' && selectedScan) {
    return (
      <RelicDetailView
        scan={selectedScan}
        onBack={() => setViewMode('scan-history')}
        allScans={allScans.length > 0 ? allScans : undefined}
      />
    );
  }

  if (viewMode === 'map-progress') {
    return <SriLankanMapScreen onClose={handleBackToDashboard} />;
  }

  if (viewMode === 'scanning') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Back Button (Top-left) - only show when not viewing 3D model */}
        {!isViewing && (
          <SafeAreaView style={styles.scanOverlay}>
            <TouchableOpacity
              style={styles.backToHomeButton}
              onPress={handleBackToDashboard}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
        )}

        {/* Main AR View */}
        <ScanInterface
          onViewingChange={setIsViewing}
          relicData={selectedRelicData}
          onScanComplete={handleScanComplete}
        />

        {/* Scan Completion Card - appears on top of SceneCanvas */}
        <ScanCompletionCard
          isVisible={showScanCompletion}
          data={scanCompletionData}
          onClose={() => {
            setShowScanCompletion(false);
            setScanCompletionData(null);
          }}
        />
      </View>
    );
  }

  // Default: Dashboard view
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <RevealDashboard
        onStartScan={() => {
          setSelectedRelicData(undefined); // Clear any previous relic data
          setViewMode('scanning');
        }}
        onViewHistory={handleOpenScanHistory}
        onSelectMapProgress={handleMapProgress}
        onViewSettings={() => {
          Alert.alert('Settings', 'This feature is under development');
        }}
        onSelectRelicHunter={() => setViewMode('relic-hunter')}
        onSelectARGallery={() => {
          Alert.alert('AR Gallery', 'This feature is coming soon!');
        }}
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
  scanInterfaceContainer: {
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

  // Back to Home Button (in scanning mode)
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  backToHomeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
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
