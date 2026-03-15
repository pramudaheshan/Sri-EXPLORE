/**
 * Example Implementation: Sri Lankan Map Progress screen
 * Shows how to integrate the map progress components and hook
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../../hooks/useFirebase';
import { useMapProgress } from '../../../hooks/useMapProgress';
import { SriLankanMapProgress } from './SriLankanMapProgress';
import {
  DistrictProgress,
  DistrictAchievement,
  LocationScanData,
  SriLankanDistrict,
  DISTRICT_INFO_MAP,
} from '../../../types/mapProgress';

interface DistrictDetailModalProps {
  visible: boolean;
  district: DistrictProgress | null;
  onClose: () => void;
  onStartExploring: (district: DistrictProgress) => void;
}

/**
 * Detail Modal for a selected district
 * Shows comprehensive information about that district
 */
const DistrictDetailModal: React.FC<DistrictDetailModalProps> = ({
  visible,
  district,
  onClose,
  onStartExploring,
}) => {
  if (!district) return null;

  const districtInfo = DISTRICT_INFO_MAP[district.districtId];
  const remainingHotspots =
    district.totalHotspotsInDistrict - district.hotspotsExplored;
  const nextMilestone = Math.ceil((district.coveragePercentage + 10) / 10) * 10;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <BlurView intensity={90} style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{district.districtName}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentInner}
          >
            {/* Province & Location */}
            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <Ionicons name="location" size={20} color="#FFD700" />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Province</Text>
                  <Text style={styles.infoValue}>{districtInfo?.province}</Text>
                </View>
              </View>
            </View>

            {/* Coordinates */}
            {districtInfo && (
              <View style={styles.infoSection}>
                <View style={styles.infoCard}>
                  <Ionicons name="map" size={20} color="#FFD700" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Coordinates</Text>
                    <Text style={styles.infoValue}>
                      {districtInfo.centerLatitude.toFixed(4)},{' '}
                      {districtInfo.centerLongitude.toFixed(4)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Progress Card */}
            <View style={styles.progressCard}>
              <Text style={styles.cardTitle}>Coverage Progress</Text>
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressLabel}>Coverage</Text>
                  <Text style={styles.progressValue}>
                    {Math.round(district.coveragePercentage)}%
                  </Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressLabel}>Scans</Text>
                  <Text style={styles.progressValue}>
                    {district.scansCompleted}
                  </Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressLabel}>XP Earned</Text>
                  <Text style={styles.progressValue}>{district.xpEarned}</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, district.coveragePercentage)}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Hotspots Info */}
              <View style={styles.hotspotsInfo}>
                <Ionicons name="pin" size={18} color="#FFD700" />
                <Text style={styles.hotspotsText}>
                  {district.hotspotsExplored} of{' '}
                  {district.totalHotspotsInDistrict} hotspots explored
                </Text>
              </View>

              {remainingHotspots > 0 && (
                <Text style={styles.remainingText}>
                  {remainingHotspots} hotspots remaining
                </Text>
              )}
            </View>

            {/* Achievements Section */}
            {district.achievements && district.achievements.length > 0 && (
              <View style={styles.achievementsCard}>
                <Text style={styles.cardTitle}>Achievements Unlocked</Text>
                {district.achievements.map(
                  (achievement: DistrictAchievement) => (
                    <View key={achievement.id} style={styles.achievementItem}>
                      <View
                        style={[
                          styles.achievementIcon,
                          { backgroundColor: 'rgba(255, 215, 0, 0.2)' },
                        ]}
                      >
                        <Ionicons
                          name={achievement.icon as any}
                          size={20}
                          color="#FFD700"
                        />
                      </View>
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementName}>
                          {achievement.name}
                        </Text>
                        <Text style={styles.achievementDesc}>
                          {achievement.description}
                        </Text>
                      </View>
                    </View>
                  ),
                )}
              </View>
            )}

            {/* Next Milestone */}
            {district.coveragePercentage < 100 && (
              <View style={styles.milestoneCard}>
                <Text style={styles.cardTitle}>Next Milestone</Text>
                <View style={styles.milestoneContent}>
                  <Ionicons name="flag" size={24} color="#FFD700" />
                  <View style={styles.milestoneText}>
                    <Text style={styles.milestoneValue}>{nextMilestone}%</Text>
                    <Text style={styles.milestoneLabel}>
                      Explore{' '}
                      {Math.ceil(
                        ((nextMilestone - district.coveragePercentage) / 10) *
                          10,
                      )}{' '}
                      more hotspots
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Completion Badge */}
            {district.coveragePercentage === 100 && (
              <View
                style={[
                  styles.completionCard,
                  { backgroundColor: 'rgba(0, 200, 83, 0.2)' },
                ]}
              >
                <Ionicons
                  name="checkmark-done-circle"
                  size={32}
                  color="#00C853"
                />
                <Text style={[styles.completionText, { color: '#00C853' }]}>
                  District Fully Explored!
                </Text>
                <Text style={styles.completionSubtext}>
                  You've unlocked the Badge of Mastery
                </Text>
              </View>
            )}
          </ScrollView>

          {/* CTA Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
            {district.coveragePercentage < 100 && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => onStartExploring(district)}
              >
                <Ionicons name="compass" size={20} color="#000" />
                <Text style={styles.primaryButtonText}>Continue Exploring</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </BlurView>
    </Modal>
  );
};

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
  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictProgress | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const handleDistrictPress = (district: DistrictProgress) => {
    setSelectedDistrict(district);
    setDetailModalVisible(true);
  };

  const handleStartExploring = (district: DistrictProgress) => {
    setDetailModalVisible(false);
    if (onStartExploring) {
      onStartExploring(district);
    } else {
      Alert.alert(
        'Start Exploring',
        `Ready to explore ${district.districtName}?\n\nThis will launch the relic scanner.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Scan',
            onPress: () => {
              // Trigger scan start
              console.log(`Starting scan in ${district.districtName}`);
            },
          },
        ],
      );
    }
  };

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
        onDistrictPress={handleDistrictPress}
        showDetailedView={true}
      />

      {/* District Detail Modal */}
      <DistrictDetailModal
        visible={detailModalVisible}
        district={selectedDistrict}
        onClose={() => setDetailModalVisible(false)}
        onStartExploring={handleStartExploring}
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // Info Section
  infoSection: {
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Regular',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
    fontFamily: 'Poppins-SemiBold',
  },

  // Progress Card
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Regular',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
    marginTop: 4,
    fontFamily: 'Poppins-Bold',
  },

  progressBarContainer: {
    marginVertical: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },

  hotspotsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hotspotsText: {
    fontSize: 13,
    color: '#fff',
    fontFamily: 'Poppins-Regular',
  },
  remainingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    fontFamily: 'Poppins-Regular',
  },

  // Achievements
  achievementsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  achievementDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },

  // Milestone
  milestoneCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  milestoneContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestoneText: {
    flex: 1,
  },
  milestoneValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD700',
    fontFamily: 'Poppins-Bold',
  },
  milestoneLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },

  // Completion
  completionCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.3)',
  },
  completionText: {
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 8,
    fontFamily: 'Poppins-SemiBold',
  },
  completionSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Regular',
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#FFD700',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Poppins-SemiBold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
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
