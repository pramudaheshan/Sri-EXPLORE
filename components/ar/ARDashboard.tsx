import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { Asset } from 'expo-asset';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useARScans } from '../../hooks/useFirebase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================
interface UserStats {
  totalScans: number;
  totalXP: number;
  totalHotspots: number;
  streakDays: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
}

interface RecentScan {
  id: string;
  relicName: string;
  relicId: string;
  timestamp: Date;
  xpEarned: number;
  hotspotsExplored: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface ARDashboardProps {
  onStartScan: () => void;
  onViewHistory: () => void;
  onViewSettings: () => void;
  onSelectRelicHunter?: () => void;
  onSelectARGallery?: () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
const calculateLevel = (
  totalXP: number,
): { level: number; currentXP: number; nextLevelXP: number } => {
  // Simple leveling system: Level = floor(XP / 100) + 1
  // Each level requires 100 more XP than the last
  const level = Math.floor(totalXP / 100) + 1;
  const currentXP = totalXP % 100;
  const nextLevelXP = 100;

  return { level, currentXP, nextLevelXP };
};

const getLevelTitle = (level: number): string => {
  if (level < 5) return 'Novice Explorer';
  if (level < 10) return 'Relic Seeker';
  if (level < 20) return 'Artifact Hunter';
  if (level < 30) return 'History Scholar';
  if (level < 50) return 'Master Archaeologist';
  return 'Legendary Curator';
};

const formatDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
export const ARDashboard: React.FC<ARDashboardProps> = ({
  onStartScan,
  onViewHistory,
  onViewSettings,
  onSelectRelicHunter,
  onSelectARGallery,
}) => {
  const { user } = useAuth();
  const { scans, loading } = useARScans(user?.uid);

  // Background image for AR Dashboard
  const backgroundImage = require('../../assets/images/sri-ar-bg.png');
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        await Asset.loadAsync([backgroundImage]);
      } catch (e) {
        console.warn('Failed to preload AR background image', e);
      }
      if (isMounted) setAssetsLoaded(true);
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const [userStats, setUserStats] = useState<UserStats>({
    totalScans: 0,
    totalXP: 0,
    totalHotspots: 0,
    streakDays: 0,
    level: 1,
    currentLevelXP: 0,
    nextLevelXP: 100,
  });

  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  // Helper: normalize scans to ensure timestamp exists and is a Date
  const normalizeScans = (
    scans: any[],
  ): (RecentScan & { timestamp: Date })[] => {
    return scans.map((scan) => ({
      ...scan,
      timestamp: scan.timestamp
        ? scan.timestamp instanceof Date
          ? scan.timestamp
          : new Date(scan.timestamp)
        : new Date(0),
    }));
  };

  // Calculate stats from Firebase data
  useEffect(() => {
    if (!scans || scans.length === 0) {
      return;
    }

    // Normalize scans to ensure timestamp is present and is a Date
    const normalizedScans = normalizeScans(scans);

    // Calculate totals
    const totalScans = normalizedScans.length;
    const totalXP = normalizedScans.reduce(
      (sum, scan) => sum + (scan.xpEarned || 0),
      0,
    );
    const totalHotspots = normalizedScans.reduce(
      (sum, scan) => sum + (scan.hotspotsExplored || 0),
      0,
    );

    // Calculate streak (consecutive days with scans)
    const sortedScans = [...normalizedScans].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    let streakDays = 0;
    let lastDate: Date | null = null;

    for (const scan of sortedScans) {
      const scanDate = new Date(scan.timestamp);
      scanDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        // First scan - check if it's today or yesterday
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (
          scanDate.getTime() === today.getTime() ||
          scanDate.getTime() === yesterday.getTime()
        ) {
          streakDays = 1;
          lastDate = scanDate;
        } else {
          break; // Streak broken
        }
      } else {
        const dayDiff = Math.floor(
          (lastDate.getTime() - scanDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (dayDiff === 1) {
          streakDays++;
          lastDate = scanDate;
        } else if (dayDiff === 0) {
          // Same day, continue
          continue;
        } else {
          break; // Streak broken
        }
      }
    }

    // Calculate level
    const { level, currentXP, nextLevelXP } = calculateLevel(totalXP);

    setUserStats({
      totalScans,
      totalXP,
      totalHotspots,
      streakDays,
      level,
      currentLevelXP: currentXP,
      nextLevelXP,
    });

    // Get recent scans (last 5)
    const recent = sortedScans.slice(0, 5).map((scan) => ({
      id: scan.id || '',
      relicName: scan.relicName || 'Unknown Relic',
      relicId: scan.relicId || '',
      timestamp: scan.timestamp,
      xpEarned: scan.xpEarned || 0,
      hotspotsExplored: scan.hotspotsExplored || 0,
      location: scan.location,
    }));

    setRecentScans(recent);
  }, [scans]);

  // Get user display name
  const userName =
    user?.displayName || user?.email?.split('@')[0] || 'Explorer';

  if (loading || !assetsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading your adventure...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0, 0, 0, 0.53)', 'rgba(0, 0, 0, 0.89)']}
        style={styles.bgOverlay}
      />

      <SafeAreaView style={styles.safeAreaContent}>
        <StatusBar barStyle="light-content" />

        <ScrollView
          style={[styles.scrollView, styles.scrollAboveOverlay]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>
                Sri<Text style={{ color: '#FFD700' }}>AR</Text>
              </Text>
              <Text style={styles.headerSubtitle}>
                Explore Sri Lanka's Heritage
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={onViewSettings}
            >
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* User Profile Card */}
          <View style={styles.profileCard}>
            <BlurView intensity={40} tint="dark" style={styles.profileBlur}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['#ffd900d2', '#ffd900d2']}
                    style={styles.avatarGradient}
                  >
                    <Ionicons name="person" size={40} color="#000000" />
                  </LinearGradient>
                  {/* Level badge overlays the avatar (top-right) - rendered as sibling so it sits above */}
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelNumber}>{userStats.level}</Text>
                  </View>
                </View>

                <View style={styles.profileInfoCentered}>
                  <Text style={styles.userName}>{userName}</Text>
                  <Text style={styles.userTitle}>
                    {getLevelTitle(userStats.level)}
                  </Text>
                </View>
              </View>

              {/* XP Progress Bar */}
              <View style={styles.xpContainer}>
                <View style={styles.xpLabelRow}>
                  <Text style={styles.xpLabel}>
                    {userStats.currentLevelXP} / {userStats.nextLevelXP} XP
                  </Text>
                  <Text style={styles.xpNextLevel}>
                    Level {userStats.level + 1}
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${(userStats.currentLevelXP / userStats.nextLevelXP) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </BlurView>
          </View>

          {/* Primary CTA - Start Scan */}
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={onStartScan}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FFD700', '#FFD700']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="camera" size={28} color="#000000" />
              <Text style={styles.ctaText}>START NEW SCAN</Text>
              <Ionicons name="arrow-forward" size={24} color="#000000" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <BlurView intensity={30} tint="dark" style={styles.statBlur}>
                  <Ionicons name="scan" size={24} color="#FFD700" />
                  <Text style={styles.statNumber}>{userStats.totalScans}</Text>
                  <Text style={styles.statLabel}>Scans</Text>
                </BlurView>
              </View>

              <View style={styles.statCard}>
                <BlurView intensity={30} tint="dark" style={styles.statBlur}>
                  <Ionicons name="star" size={24} color="#FFD700" />
                  <Text style={styles.statNumber}>{userStats.totalXP}</Text>
                  <Text style={styles.statLabel}>XP</Text>
                </BlurView>
              </View>

              <View style={styles.statCard}>
                <BlurView intensity={30} tint="dark" style={styles.statBlur}>
                  <Ionicons name="location" size={24} color="#FFD700" />
                  <Text style={styles.statNumber}>
                    {userStats.totalHotspots}
                  </Text>
                  <Text style={styles.statLabel}>Hotspots</Text>
                </BlurView>
              </View>

              <View style={styles.statCard}>
                <BlurView intensity={30} tint="dark" style={styles.statBlur}>
                  <Ionicons name="flame" size={24} color="#FFD700" />
                  <Text style={styles.statNumber}>{userStats.streakDays}</Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </BlurView>
              </View>
            </View>
          </View>

          {/* Features Grid */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featuresGrid}>
              {/* Scan History */}
              <TouchableOpacity
                style={styles.featureCard}
                onPress={onViewHistory}
                activeOpacity={0.7}
              >
                <BlurView intensity={30} tint="dark" style={styles.featureBlur}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="book" size={28} color="#FFD700" />
                  </View>
                  <Text style={styles.featureTitle}>Scan History</Text>
                  <Text style={styles.featureSubtitle}>
                    {userStats.totalScans} scans
                  </Text>
                </BlurView>
              </TouchableOpacity>

              {/* Relic Hunter */}
              <TouchableOpacity
                style={styles.featureCard}
                onPress={onSelectRelicHunter}
                activeOpacity={0.7}
              >
                <BlurView intensity={30} tint="dark" style={styles.featureBlur}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="compass" size={28} color="#FFD700" />
                  </View>
                  <Text style={styles.featureTitle}>Relic Hunter</Text>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>SOON</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>

              {/* AR Gallery */}
              <TouchableOpacity
                style={[styles.featureCard, styles.featureDisabled]}
                onPress={onSelectARGallery}
                activeOpacity={0.7}
              >
                <BlurView intensity={30} tint="dark" style={styles.featureBlur}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="images" size={28} color="#666" />
                  </View>
                  <Text style={[styles.featureTitle, styles.disabledText]}>
                    AR Gallery
                  </Text>
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>SOON</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>

              {/* Settings */}
              <TouchableOpacity
                style={styles.featureCard}
                onPress={onViewSettings}
                activeOpacity={0.7}
              >
                <BlurView intensity={30} tint="dark" style={styles.featureBlur}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="settings" size={28} color="#4DA6FF" />
                  </View>
                  <Text style={styles.featureTitle}>Settings</Text>
                  <Text style={styles.featureSubtitle}>Preferences</Text>
                </BlurView>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Scans */}
          {recentScans.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Scans</Text>
                <TouchableOpacity onPress={onViewHistory}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {recentScans.map((scan) => (
                <View key={scan.id} style={styles.scanItem}>
                  <BlurView intensity={20} tint="dark" style={styles.scanBlur}>
                    <View style={styles.scanIcon}>
                      <Ionicons name="cube" size={24} color="#FFD700" />
                    </View>
                    <View style={styles.scanInfo}>
                      <Text style={styles.scanName}>{scan.relicName}</Text>
                      <Text style={styles.scanMeta}>
                        {formatDate(scan.timestamp)} • {scan.xpEarned} XP
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="rgba(255, 255, 255, 0.4)"
                    />
                  </BlurView>
                </View>
              ))}
            </View>
          )}

          {/* Empty State for New Users */}
          {recentScans.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name="scan-outline"
                  size={64}
                  color="rgba(255, 255, 255, 0.3)"
                />
              </View>
              <Text style={styles.emptyTitle}>Start Your Journey</Text>
              <Text style={styles.emptyText}>
                Scan your first relic to begin exploring Sri Lanka's rich
                cultural heritage
              </Text>
            </View>
          )}

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 16,
    fontFamily: 'Poppins-Regular',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Poppins-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile Card
  profileCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'visible', // allow badge to render outside the card
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileBlur: {
    padding: 24, // add a bit more top padding so the avatar + badge has space
  },
  profileHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 12,
    position: 'relative',
    overflow: 'visible',
  },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  profileInfo: {
    flex: 1,
  },
  profileInfoCentered: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  userTitle: {
    fontSize: 13,
    color: '#FFD700',
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },
  levelBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    minWidth: 30,
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 15,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 6,
  },
  levelNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },

  // XP Progress
  xpContainer: {
    marginTop: 8,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Medium',
  },
  xpNextLevel: {
    fontSize: 12,
    color: '#FFD700',
    fontFamily: 'Poppins-Medium',
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

  // Stats Grid
  statsSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statBlur: {
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
    fontFamily: 'Poppins-Bold',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },

  // Primary CTA
  primaryCTA: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
    fontFamily: 'Poppins-Bold',
  },

  // Features Grid
  featuresSection: {
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureDisabled: {
    opacity: 0.6,
  },
  featureBlur: {
    padding: 16,
    minHeight: 120,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  featureSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Regular',
  },
  disabledText: {
    color: '#666',
  },
  comingSoonBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },

  // Recent Scans
  recentSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  scanItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  scanBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  scanIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scanInfo: {
    flex: 1,
  },
  scanName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
    fontFamily: 'Poppins-SemiBold',
  },
  scanMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Regular',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Poppins-SemiBold',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },

  // Bottom Padding
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  bgOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1, // keep low so UI appears above
  },

  safeAreaContent: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 20,
    elevation: 20,
  },

  scrollAboveOverlay: {
    zIndex: 21,
    elevation: 21,
  },

  bottomPadding: {
    height: 40,
  },
});

export default ARDashboard;
