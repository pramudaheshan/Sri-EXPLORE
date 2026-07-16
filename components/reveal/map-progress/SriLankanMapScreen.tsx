/**
 * Example Implementation: Sri Lankan Map Progress screen
 * Shows how to integrate the map progress components and hook
 */

import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../hooks/useFirebase';
import { useMapProgress } from '../../../hooks/useMapProgress';
import { SriLankanMapProgress } from './SriLankanMapProgress';
import {
  DistrictProgress,
  LocationScanData,
  SriLankanDistrict,
} from '../../../types/mapProgress';

/**
 * Main Sri Lankan Map Progress Screen
 * Displays overall progress and district breakdown
 */
export const SriLankanMapScreen: React.FC<{
  onClose?: () => void;
  onStartExploring?: (district: DistrictProgress) => void;
}> = ({ onClose, onStartExploring }) => {
  const { user } = useAuth();
  const { mapProgress, loading, error, addScan, refreshProgress } =
    useMapProgress(user?.uid);

  const handleRefresh = async () => {
    await refreshProgress();
    Alert.alert('Progress Updated', 'Map progress refreshed successfully');
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refreshProgress}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!mapProgress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Sri Lankan Map</Text>
          <Text style={styles.headerSubtitle}>
            Track your exploration progress
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleRefresh} style={styles.headerButton}>
            <Ionicons name="refresh" size={24} color="#FFD700" />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#FFD700" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map Progress Component */}
      <SriLankanMapProgress
        progressData={mapProgress}
        showDetailedView={true}
      />
    </SafeAreaView>
  );
};

// ============================================
// COMPONENT USAGE EXAMPLES
// ============================================

/**
 * Example 1: Integrating into RevealDashboard
 *
 * In RevealDashboard.tsx, add a new button to navigate to map progress:
 *
 * <TouchableOpacity onPress={() => navigation.navigate('MapProgress')}>
 *   <Text>View Map Progress</Text>
 * </TouchableOpacity>
 */

/**
 * Example 2: Mock scan completion
 *
 * Call this after a real scan finishes:
 *
 * const handleScanComplete = async (scanResult) => {
 *   const locationScan: LocationScanData = {
 *     scanId: `scan_${Date.now()}`,
 *     userId: user?.uid || '',
 *     relicId: scanResult.relicId,
 *     relicName: scanResult.relicName,
 *     districtId: SriLankanDistrict.KANDY,
 *     latitude: scanResult.latitude,
 *     longitude: scanResult.longitude,
 *     timestamp: new Date(),
 *     xpEarned: 100,
 *     hotspotsFound: 2,
 *   };
 *
 *   await addScan(locationScan);
 *   await refreshProgress();
 * };
 */

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Poppins-Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },

  // Error/Loading
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    marginVertical: 16,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
});

export default SriLankanMapScreen;
