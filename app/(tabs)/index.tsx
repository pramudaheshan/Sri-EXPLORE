import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { auth } from '../../firebaseConfig';
import {
  Bell,
  MapPin,
  Star,
  Calendar,
  Camera,
  Shield,
  Trophy,
  Navigation,
  Clock,
  Thermometer,
  ChevronRight,
  Compass,
  Sparkles,
  User,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Background image
const backgroundImage = require('../../assets/images/home.png');

// Theme colors - Matching onboarding page style
const COLORS = {
  primary: '#0D3B2E',
  secondary: '#1A7B5F',
  teal: '#20B2AA', // TripTuner accent
  green: '#32CD32', // AR accent
  coral: '#FF6B6B', // SafeSpot accent
  gold: '#FFD700', // Rewards/Trophy
  white: '#FFFFFF',
  offWhite: '#F0F4F3',
  gray: '#B8C4C2',
  darkGray: '#6B7D79',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  glassLight: 'rgba(255, 255, 255, 0.05)',
};

export default function HomeScreen() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather] = useState({ temp: '28°C', condition: 'Sunny' });
  const user = auth.currentUser;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Preload background image to avoid first-load delay
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  useEffect(() => {
    let isMounted = true;
    async function loadAssets() {
      try {
        await Asset.loadAsync([backgroundImage]);
      } catch (e) {
        console.warn('Asset preload failed', e);
      }
      if (isMounted) setAssetsLoaded(true);
    }
    loadAssets();
    return () => {
      isMounted = false;
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const nearbyLandmarks = [
    {
      id: 1,
      name: 'Temple of the Sacred Tooth Relic',
      distance: '2.1 km',
      rating: 4.8,
      image:
        'https://images.pexels.com/photos/1108701/pexels-photo-1108701.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      id: 2,
      name: 'Sigiriya Rock Fortress',
      distance: '45 km',
      rating: 4.9,
      image:
        'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      id: 3,
      name: 'Polonnaruwa Ancient City',
      distance: '68 km',
      rating: 4.7,
      image:
        'https://images.pexels.com/photos/1127119/pexels-photo-1127119.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
  ];

  const quickActions = [
    {
      icon: Calendar,
      title: "Today's Plan",
      subtitle: 'View Schedule',
      color: COLORS.teal,
      route: 'itinerary',
    },
    {
      icon: Camera,
      title: 'AR Explore',
      subtitle: 'Scan & Discover',
      color: COLORS.gold,
      badge: null,
      route: 'ar',
    },
    {
      icon: Shield,
      title: 'SafeSpot',
      subtitle: 'Stay Protected',
      color: COLORS.coral,
      route: 'safety',
    },
    {
      icon: Trophy,
      title: 'Rewards',
      subtitle: '3 New Badges',
      color: COLORS.gold,
      route: 'profile',
    },
  ];

  const recentActivity = [
    {
      icon: Camera,
      title: 'Scanned Buddha Statue',
      time: '2 hours ago',
      color: COLORS.green,
    },
    {
      icon: Trophy,
      title: 'Earned "Cultural Explorer"',
      time: '5 hours ago',
      color: COLORS.gold,
    },
    {
      icon: Shield,
      title: 'Safety alert viewed',
      time: 'Yesterday',
      color: COLORS.coral,
    },
  ];

  if (!assetsLoaded) {
    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.loadingContainer}
      >
        <Text style={styles.loadingTitle}>Sri Explore</Text>
        <ActivityIndicator
          size="large"
          color={COLORS.teal}
          style={{ marginTop: 16 }}
        />
      </LinearGradient>
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
            'rgba(0, 0, 0, 0.8)',
            'rgba(0, 0, 0, 0.17)',
            'rgba(0, 0, 0, 0.56)',
          ]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Header - Glassmorphism */}
          <View style={styles.header}>
            {/* Top Row */}
            <View style={styles.headerTop}>
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <View style={styles.usernameRow}>
                  <Text style={styles.username}>
                    {user?.displayName || 'Explorer'}
                  </Text>
                  <Sparkles
                    size={16}
                    color={COLORS.teal}
                    style={{ marginLeft: 6 }}
                  />
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.notificationButton}>
                  <BlurView
                    intensity={30}
                    tint="light"
                    style={styles.notificationBlur}
                  >
                    <Bell size={20} color={COLORS.teal} />
                    <View style={styles.notificationBadge}>
                      <Text style={styles.badgeText}>3</Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={() => router.push('/profile')}
                >
                  <BlurView
                    intensity={30}
                    tint="light"
                    style={styles.profileBlur}
                  >
                    <User size={20} color={COLORS.offWhite} />
                  </BlurView>
                </TouchableOpacity>
              </View>
            </View>

            {/* Location & Weather Card - Glass */}
            <View style={styles.infoCard}>
              <BlurView intensity={40} tint="light" style={styles.infoCardBlur}>
                <View style={styles.infoItem}>
                  <View
                    style={[
                      styles.infoIconContainer,
                      { backgroundColor: `${COLORS.teal}15` },
                    ]}
                  >
                    <MapPin size={14} color={COLORS.teal} />
                  </View>
                  <Text style={styles.infoText}>Kandy, Sri Lanka</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <View
                    style={[
                      styles.infoIconContainer,
                      { backgroundColor: `${COLORS.coral}15` },
                    ]}
                  >
                    <Thermometer size={14} color={COLORS.coral} />
                  </View>
                  <Text style={styles.infoText}>{weather.temp}</Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <View
                    style={[
                      styles.infoIconContainer,
                      { backgroundColor: `${COLORS.green}15` },
                    ]}
                  >
                    <Clock size={14} color={COLORS.green} />
                  </View>
                  <Text style={styles.infoText}>
                    {currentTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </BlurView>
            </View>

            {/* Featured Banner - Glass */}
            <TouchableOpacity style={styles.featuredBanner}>
              <BlurView intensity={35} tint="light" style={styles.featuredBlur}>
                <View style={styles.featuredContent}>
                  <View
                    style={[
                      styles.featuredIconContainer,
                      { backgroundColor: `${COLORS.teal}20` },
                    ]}
                  >
                    <Compass size={24} color={COLORS.teal} />
                  </View>
                  <View style={styles.featuredText}>
                    <Text style={styles.featuredTitle}>Discover Sri Lanka</Text>
                    <Text style={styles.featuredSubtitle}>
                      Explore 50+ hidden gems nearby
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={COLORS.gray} />
              </BlurView>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Quick Actions Grid - Glass Cards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickActionCard}
                    onPress={() =>
                      router.push(
                        `/${action.route === 'index' ? '' : action.route}` as any,
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <BlurView
                      intensity={25}
                      tint="light"
                      style={styles.quickActionBlur}
                    >
                      <View
                        style={[
                          styles.quickActionIcon,
                          { backgroundColor: `${action.color}20` },
                        ]}
                      >
                        <action.icon size={24} color={action.color} />
                      </View>
                      <Text style={styles.quickActionTitle}>
                        {action.title}
                      </Text>
                      <Text style={styles.quickActionSubtitle}>
                        {action.subtitle}
                      </Text>
                    </BlurView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Today's Highlights - Glass Cards */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Highlights</Text>
                <TouchableOpacity style={styles.seeAllButton}>
                  <Text style={styles.seeAllText}>See All</Text>
                  <ChevronRight size={14} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity style={styles.highlightCard}>
                  <BlurView
                    intensity={30}
                    tint="light"
                    style={styles.highlightBlur}
                  >
                    <View
                      style={[
                        styles.highlightIconBg,
                        { backgroundColor: `${COLORS.gold}20` },
                      ]}
                    >
                      <Trophy size={24} color={COLORS.gold} />
                    </View>
                    <Text style={styles.highlightTitle}>New Badge!</Text>
                    <Text style={styles.highlightSubtitle}>
                      Temple Explorer
                    </Text>
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity style={styles.highlightCard}>
                  <BlurView
                    intensity={30}
                    tint="light"
                    style={styles.highlightBlur}
                  >
                    <View
                      style={[
                        styles.highlightIconBg,
                        { backgroundColor: `${COLORS.green}20` },
                      ]}
                    >
                      <Camera size={24} color={COLORS.green} />
                    </View>
                    <Text style={styles.highlightTitle}>3 AR Scans</Text>
                    <Text style={styles.highlightSubtitle}>Today</Text>
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity style={styles.highlightCard}>
                  <BlurView
                    intensity={30}
                    tint="light"
                    style={styles.highlightBlur}
                  >
                    <View
                      style={[
                        styles.highlightIconBg,
                        { backgroundColor: `${COLORS.teal}20` },
                      ]}
                    >
                      <Navigation size={24} color={COLORS.teal} />
                    </View>
                    <Text style={styles.highlightTitle}>5.2 km</Text>
                    <Text style={styles.highlightSubtitle}>Explored</Text>
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity style={styles.highlightCard}>
                  <BlurView
                    intensity={30}
                    tint="light"
                    style={styles.highlightBlur}
                  >
                    <View
                      style={[
                        styles.highlightIconBg,
                        { backgroundColor: `${COLORS.teal}20` },
                      ]}
                    >
                      <Star size={24} color={COLORS.teal} />
                    </View>
                    <Text style={styles.highlightTitle}>4.8 Rating</Text>
                    <Text style={styles.highlightSubtitle}>Your Reviews</Text>
                  </BlurView>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Nearby Landmarks - Glass Cards */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Nearby Landmarks</Text>
                <TouchableOpacity style={styles.seeAllButton}>
                  <Text style={styles.seeAllText}>View Map</Text>
                  <ChevronRight size={14} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              {nearbyLandmarks.map((landmark) => (
                <TouchableOpacity key={landmark.id} style={styles.landmarkCard}>
                  <Image
                    source={{ uri: landmark.image }}
                    style={styles.landmarkImage}
                  />
                  <View style={styles.landmarkOverlay}>
                    <BlurView
                      intensity={50}
                      tint="dark"
                      style={styles.landmarkBlur}
                    >
                      <View style={styles.landmarkInfo}>
                        <Text style={styles.landmarkName} numberOfLines={1}>
                          {landmark.name}
                        </Text>
                        <View style={styles.landmarkDetails}>
                          <View style={styles.landmarkMeta}>
                            <MapPin size={12} color={COLORS.offWhite} />
                            <Text style={styles.landmarkDistance}>
                              {landmark.distance}
                            </Text>
                          </View>
                          <View style={styles.landmarkMeta}>
                            <Star
                              size={12}
                              color={COLORS.gold}
                              fill={COLORS.gold}
                            />
                            <Text style={styles.landmarkRating}>
                              {landmark.rating}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Activity - Glass List */}
            <View style={[styles.section, { marginBottom: 100 }]}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.activityList}>
                <BlurView
                  intensity={25}
                  tint="light"
                  style={styles.activityBlur}
                >
                  {recentActivity.map((activity, index) => (
                    <View
                      key={index}
                      style={[
                        styles.activityItem,
                        index === recentActivity.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.activityIcon,
                          { backgroundColor: `${activity.color}20` },
                        ]}
                      >
                        <activity.icon size={16} color={activity.color} />
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityTitle}>
                          {activity.title}
                        </Text>
                        <Text style={styles.activityTime}>{activity.time}</Text>
                      </View>
                      <ChevronRight size={16} color={COLORS.darkGray} />
                    </View>
                  ))}
                </BlurView>
              </View>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.offWhite,
    marginBottom: 12,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: COLORS.gray,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: COLORS.offWhite,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  notificationBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    backgroundColor: 'rgba(180, 100, 100, 0.8)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    color: COLORS.offWhite,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  profileBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  infoCardBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  infoIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.glassLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: COLORS.offWhite,
    opacity: 0.9,
  },
  infoDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.glassBorder,
  },
  featuredBanner: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featuredIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.glassLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featuredText: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.offWhite,
    marginBottom: 1,
  },
  featuredSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: COLORS.gray,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 26,
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  quickActionCard: {
    width: (width - 52) / 2,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  quickActionBlur: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  actionBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(180, 100, 100, 0.7)',
    borderWidth: 1.5,
    borderColor: COLORS.glassBorder,
  },
  actionBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    color: COLORS.offWhite,
  },
  quickActionTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.offWhite,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 2,
  },
  highlightCard: {
    width: 130,
    height: 150,
    borderRadius: 18,
    marginRight: 12,
    overflow: 'hidden',
  },
  highlightBlur: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  highlightIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.glassLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  highlightTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.offWhite,
    textAlign: 'center',
  },
  highlightSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 2,
  },
  landmarkCard: {
    height: 130,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  landmarkImage: {
    width: '100%',
    height: '100%',
  },
  landmarkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  landmarkBlur: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(13, 59, 46, 0.6)',
  },
  landmarkInfo: {
    flex: 1,
  },
  landmarkName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: COLORS.offWhite,
    marginBottom: 4,
  },
  landmarkDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  landmarkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  landmarkDistance: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: COLORS.gray,
    marginLeft: 4,
  },
  landmarkRating: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: COLORS.gray,
    marginLeft: 4,
  },
  activityList: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  activityBlur: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: COLORS.offWhite,
  },
  activityTime: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: COLORS.gray,
    marginTop: 1,
  },
});
