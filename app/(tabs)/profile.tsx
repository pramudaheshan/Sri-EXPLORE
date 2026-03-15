import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Switch,
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import {
  User,
  Trophy,
  Star,
  MapPin,
  Camera,
  Settings,
  Download,
  Globe,
  Bell,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  CreditCard as Edit,
  Award,
  Target,
  Zap,
  ChevronRight,
} from 'lucide-react-native';
import {
  useAuth,
  useUserProfile,
  useAchievements,
  useARScans,
} from '../../hooks/useFirebase';

const { width } = Dimensions.get('window');

// Background image
const backgroundImage = require('../../assets/images/profile.png');

// Theme colors - Matching onboarding page style
const COLORS = {
  primary: '#0d3b2e',
  secondary: '#1A7B5F',
  teal: '#20B2AA',
  green: '#32CD32',
  coral: '#FF6B6B',
  gold: '#FFD700',
  white: '#FFFFFF',
  offWhite: '#F0F4F3',
  gray: '#B8C4C2',
  darkGray: '#6B7D79',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  glassLight: 'rgba(255, 255, 255, 0.05)',
};

// Helper function to format date
const formatDate = (timestamp: any): string => {
  if (!timestamp) return 'Recently';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

// Helper to format join date
const formatJoinDate = (timestamp: any): string => {
  if (!timestamp) return 'Recently';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Badge definitions
const BADGE_DEFINITIONS = [
  {
    id: 'temple_explorer',
    name: 'Temple Explorer',
    icon: Trophy,
    color: COLORS.teal,
  },
  { id: 'ar_master', name: 'AR Master', icon: Camera, color: COLORS.green },
  {
    id: 'safety_guardian',
    name: 'Safety Guardian',
    icon: Shield,
    color: COLORS.coral,
  },
  {
    id: 'first_ar_scan',
    name: 'First AR Scan',
    icon: Star,
    color: COLORS.gold,
  },
  { id: 'points_1000', name: 'Rising Star', icon: Target, color: '#9B59B6' },
  { id: 'local_expert', name: 'Local Expert', icon: MapPin, color: '#E67E22' },
];

// Level thresholds
const LEVEL_THRESHOLDS = [
  { name: 'Beginner Explorer', minPoints: 0, nextLevel: 500 },
  { name: 'Junior Explorer', minPoints: 500, nextLevel: 1500 },
  { name: 'Explorer', minPoints: 1500, nextLevel: 3000 },
  { name: 'Senior Explorer', minPoints: 3000, nextLevel: 5000 },
  { name: 'Expert Explorer', minPoints: 5000, nextLevel: 10000 },
  { name: 'Master Explorer', minPoints: 10000, nextLevel: 20000 },
  { name: 'Legendary Explorer', minPoints: 20000, nextLevel: 50000 },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  // Firebase hooks
  const { user, loading: authLoading } = useAuth();
  const {
    profile,
    loading: profileLoading,
    refresh: refreshProfile,
  } = useUserProfile(user?.uid);
  const { achievements, loading: achievementsLoading } = useAchievements(
    user?.uid,
  );
  const { scans } = useARScans(user?.uid);

  const loading = authLoading || profileLoading;

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual profile refresh triggered');
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate level progress
  const getCurrentLevelInfo = () => {
    const points = profile?.points || 0;
    const currentLevel = LEVEL_THRESHOLDS.filter(
      (l) => points >= l.minPoints,
    ).pop();
    const nextLevel = LEVEL_THRESHOLDS.find((l) => points < l.minPoints);

    if (!currentLevel)
      return {
        level: 'Beginner Explorer',
        progress: 0,
        nextLevelName: 'Junior Explorer',
        pointsToNext: 500,
      };

    const progressInLevel = points - currentLevel.minPoints;
    const levelRange =
      (nextLevel?.minPoints || currentLevel.nextLevel) - currentLevel.minPoints;
    const progress = Math.min((progressInLevel / levelRange) * 100, 100);
    const pointsToNext =
      (nextLevel?.minPoints || currentLevel.nextLevel) - points;

    return {
      level: currentLevel.name,
      progress,
      nextLevelName: nextLevel?.name || 'Max Level',
      pointsToNext: Math.max(0, pointsToNext),
    };
  };

  const levelInfo = getCurrentLevelInfo();

  // Get badges with earned status
  const getBadgesWithStatus = () => {
    const earnedTypes = achievements.map((a) => a.type);
    return BADGE_DEFINITIONS.map((badge) => ({
      ...badge,
      earned: earnedTypes.includes(badge.id),
    }));
  };

  const badges = getBadgesWithStatus();

  const menuItems = [
    {
      title: 'Edit Profile',
      icon: Edit,
      action: () =>
        Alert.alert('Edit Profile', 'Profile editing would open here'),
    },
    {
      title: 'Download Manager',
      icon: Download,
      action: () =>
        Alert.alert('Downloads', 'Download manager would open here'),
    },
    {
      title: 'Language Settings',
      icon: Globe,
      action: () =>
        Alert.alert('Language', 'Language settings would open here'),
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      action: () => Alert.alert('Privacy', 'Privacy settings would open here'),
    },
    {
      title: 'Help & Support',
      icon: HelpCircle,
      action: () => Alert.alert('Help', 'Help center would open here'),
    },
    {
      title: 'Settings',
      icon: Settings,
      action: () => Alert.alert('Settings', 'General settings would open here'),
    },
  ];

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/auth');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0.8)',
            'rgba(0, 0, 0, 0.75)',
            'rgba(0, 0, 0, 0.8)',
          ]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.notLoggedInContainer}>
          <View style={styles.notLoggedInCardWrapper}>
            <BlurView
              intensity={30}
              tint="light"
              style={styles.notLoggedInCard}
            >
              <View
                style={[
                  styles.notLoggedInIconBg,
                  { backgroundColor: `${COLORS.teal}20` },
                ]}
              >
                <User size={50} color={COLORS.teal} />
              </View>
              <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
              <Text style={styles.notLoggedInText}>
                Sign in to track your progress and earn achievements
              </Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/auth')}
              >
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.teal]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={backgroundImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark overlay for readability */}
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0.77)',
            'rgba(0, 0, 0, 0.59)',
            'rgba(0, 0, 0, 0.48)',
          ]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B6B"
            />
          }
        >
          {/* Header - Glassmorphism */}
          <View style={styles.header}>
            <View style={styles.profileCardWrapper}>
              <BlurView intensity={35} tint="light" style={styles.profileCard}>
                <View style={styles.profileInfo}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: `${COLORS.teal}20` },
                    ]}
                  >
                    <User size={36} color={COLORS.teal} />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {profile?.displayName || user.displayName || 'Explorer'}
                    </Text>
                    <Text style={styles.userLevel}>{levelInfo.level}</Text>
                    <Text style={styles.joinDate}>
                      Joined {formatJoinDate(profile?.joinDate)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.editButton}>
                    <Edit size={18} color={COLORS.teal} />
                  </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{profile?.points || 0}</Text>
                    <Text style={styles.statLabel}>Points</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{achievements.length}</Text>
                    <Text style={styles.statLabel}>Badges</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {profile?.placesVisited || 0}
                    </Text>
                    <Text style={styles.statLabel}>Places</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {profile?.arScans || 0}
                    </Text>
                    <Text style={styles.statLabel}>AR Scans</Text>
                  </View>
                </View>
              </BlurView>
            </View>
          </View>

          <View style={styles.content}>
            {/* Level Progress */}
            <View style={styles.section}>
              <View style={styles.glassCardWrapper}>
                <BlurView
                  intensity={25}
                  tint="light"
                  style={styles.levelContainer}
                >
                  <View style={styles.levelHeader}>
                    <View
                      style={[
                        styles.levelIconBg,
                        { backgroundColor: `${COLORS.teal}20` },
                      ]}
                    >
                      <Award size={20} color={COLORS.teal} />
                    </View>
                    <Text style={styles.levelTitle}>{levelInfo.level}</Text>
                    <Text style={styles.levelPoints}>
                      {profile?.points || 0} XP
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={[COLORS.secondary, COLORS.teal]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.progressFill,
                        { width: `${levelInfo.progress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {levelInfo.pointsToNext > 0
                      ? `${levelInfo.pointsToNext} XP to reach ${levelInfo.nextLevelName}`
                      : 'Maximum level reached!'}
                  </Text>
                </BlurView>
              </View>
            </View>

            {/* Badges */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Badges & Achievements</Text>
                <TouchableOpacity style={styles.seeAllButton}>
                  <Text style={styles.seeAllText}>View All</Text>
                  <ChevronRight size={14} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              <View style={styles.badgesGrid}>
                {badges.slice(0, 6).map((badge) => (
                  <TouchableOpacity key={badge.id} style={styles.badgeCard}>
                    <BlurView
                      intensity={25}
                      tint="light"
                      style={styles.badgeBlur}
                    >
                      <View
                        style={[
                          styles.badgeIcon,
                          {
                            backgroundColor: badge.earned
                              ? `${badge.color}20`
                              : COLORS.glassLight,
                          },
                        ]}
                      >
                        <badge.icon
                          size={22}
                          color={badge.earned ? badge.color : COLORS.darkGray}
                        />
                      </View>
                      <Text
                        style={[
                          styles.badgeName,
                          !badge.earned && styles.badgeNameLocked,
                        ]}
                      >
                        {badge.name}
                      </Text>
                    </BlurView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recent Achievements */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Achievements</Text>
              <View style={styles.glassCardWrapper}>
                <BlurView
                  intensity={25}
                  tint="light"
                  style={styles.achievementsList}
                >
                  {achievements.length > 0 ? (
                    achievements.slice(0, 5).map((achievement, index) => (
                      <View
                        key={achievement.id || index}
                        style={[
                          styles.achievementItem,
                          index === Math.min(achievements.length - 1, 4) && {
                            borderBottomWidth: 0,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.achievementIcon,
                            { backgroundColor: `${COLORS.teal}20` },
                          ]}
                        >
                          <Trophy size={18} color={COLORS.teal} />
                        </View>
                        <View style={styles.achievementInfo}>
                          <Text style={styles.achievementTitle}>
                            {achievement.title}
                          </Text>
                          <Text style={styles.achievementDescription}>
                            {achievement.description}
                          </Text>
                          <Text style={styles.achievementDate}>
                            {formatDate(achievement.earnedAt)}
                          </Text>
                        </View>
                        <View style={styles.xpBadge}>
                          <Zap size={12} color={COLORS.gold} />
                          <Text style={styles.xpText}>
                            +{achievement.xpEarned}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Trophy size={40} color={COLORS.darkGray} />
                      <Text style={styles.emptyStateText}>
                        No achievements yet. Start exploring!
                      </Text>
                    </View>
                  )}
                </BlurView>
              </View>
            </View>

            {/* Recent AR Scans */}
            {scans.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent AR Scans</Text>
                <View style={styles.glassCardWrapper}>
                  <BlurView
                    intensity={25}
                    tint="light"
                    style={styles.achievementsList}
                  >
                    {scans.slice(0, 3).map((scan, index) => (
                      <View
                        key={scan.id || index}
                        style={[
                          styles.achievementItem,
                          index === Math.min(scans.length - 1, 2) && {
                            borderBottomWidth: 0,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.achievementIcon,
                            { backgroundColor: `${COLORS.green}20` },
                          ]}
                        >
                          <Camera size={18} color={COLORS.green} />
                        </View>
                        <View style={styles.achievementInfo}>
                          <Text style={styles.achievementTitle}>
                            {scan.relicName}
                          </Text>
                          <Text style={styles.achievementDescription}>
                            {scan.hotspotsExplored}/{scan.totalHotspots}{' '}
                            hotspots explored
                          </Text>
                          <Text style={styles.achievementDate}>
                            {formatDate(scan.completedAt)}
                          </Text>
                        </View>
                        <View style={styles.xpBadge}>
                          <Zap size={12} color={COLORS.gold} />
                          <Text style={styles.xpText}>+{scan.xpEarned}</Text>
                        </View>
                      </View>
                    ))}
                  </BlurView>
                </View>
              </View>
            )}

            {/* Quick Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Settings</Text>
              <View style={styles.glassCardWrapper}>
                <BlurView
                  intensity={25}
                  tint="light"
                  style={styles.settingsContainer}
                >
                  <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                      <View
                        style={[
                          styles.settingIconBg,
                          { backgroundColor: `${COLORS.coral}20` },
                        ]}
                      >
                        <Bell size={16} color={COLORS.coral} />
                      </View>
                      <Text style={styles.settingText}>Push Notifications</Text>
                    </View>
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={setNotificationsEnabled}
                      trackColor={{ false: COLORS.glass, true: COLORS.teal }}
                      thumbColor={COLORS.white}
                    />
                  </View>

                  <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
                    <View style={styles.settingInfo}>
                      <View
                        style={[
                          styles.settingIconBg,
                          { backgroundColor: `${COLORS.teal}20` },
                        ]}
                      >
                        <MapPin size={16} color={COLORS.teal} />
                      </View>
                      <Text style={styles.settingText}>Location Services</Text>
                    </View>
                    <Switch
                      value={locationEnabled}
                      onValueChange={setLocationEnabled}
                      trackColor={{ false: COLORS.glass, true: COLORS.teal }}
                      thumbColor={COLORS.white}
                    />
                  </View>
                </BlurView>
              </View>
            </View>

            {/* Menu Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>More Options</Text>
              <View style={styles.glassCardWrapper}>
                <BlurView
                  intensity={25}
                  tint="light"
                  style={styles.menuContainer}
                >
                  {menuItems.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.menuItem,
                        index === menuItems.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                      onPress={item.action}
                    >
                      <View style={styles.menuItemLeft}>
                        <View
                          style={[
                            styles.menuIconBg,
                            { backgroundColor: `${COLORS.teal}15` },
                          ]}
                        >
                          <item.icon size={16} color={COLORS.teal} />
                        </View>
                        <Text style={styles.menuItemText}>{item.title}</Text>
                      </View>
                      <ChevronRight size={16} color={COLORS.darkGray} />
                    </TouchableOpacity>
                  ))}
                </BlurView>
              </View>

              {/* Logout */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <BlurView intensity={25} tint="light" style={styles.logoutBlur}>
                  <View
                    style={[
                      styles.menuIconBg,
                      { backgroundColor: `${COLORS.coral}20` },
                    ]}
                  >
                    <LogOut size={16} color={COLORS.coral} />
                  </View>
                  <Text style={styles.logoutText}>Logout</Text>
                </BlurView>
              </TouchableOpacity>
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 100 }} />
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
    fontFamily: 'Poppins-Regular',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notLoggedInCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 320,
  },
  notLoggedInCard: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 32,
    alignItems: 'center',
  },
  notLoggedInIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  notLoggedInTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: COLORS.offWhite,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    marginBottom: 24,
  },
  loginButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileCard: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: COLORS.offWhite,
  },
  userLevel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: COLORS.teal,
  },
  joinDate: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: COLORS.gray,
    marginTop: 2,
  },
  editButton: {
    width: 38,
    height: 38,
    backgroundColor: COLORS.glass,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.glassBorder,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: COLORS.offWhite,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: COLORS.gray,
    marginTop: 2,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.offWhite,
    marginBottom: 14,
    opacity: 0.95,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: COLORS.gray,
  },
  glassCardWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  levelContainer: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 18,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  levelIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  levelTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.offWhite,
    marginLeft: 10,
    flex: 1,
  },
  levelPoints: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: COLORS.teal,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.glassLight,
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: COLORS.gray,
    textAlign: 'center',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  badgeCard: {
    width: (width - 60) / 3,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  badgeBlur: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  badgeName: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    color: COLORS.offWhite,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: COLORS.darkGray,
  },
  achievementsList: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 6,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.offWhite,
  },
  achievementDescription: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: COLORS.gray,
    marginTop: 2,
  },
  achievementDate: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: COLORS.darkGray,
    marginTop: 2,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.gold}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${COLORS.gold}30`,
  },
  xpText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.gold,
    marginLeft: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.gray,
    fontFamily: 'Poppins-Regular',
  },
  settingsContainer: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 6,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  settingText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: COLORS.offWhite,
    marginLeft: 12,
  },
  menuContainer: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 6,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  menuItemText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: COLORS.offWhite,
    marginLeft: 12,
  },
  logoutButton: {
    marginTop: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  logoutBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  logoutText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: COLORS.coral,
    marginLeft: 12,
  },
});
