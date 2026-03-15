import { Tabs, useRouter, usePathname } from 'expo-router';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import {
  Chrome as Home,
  Calendar,
  Camera,
  Shield,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Asset } from 'expo-asset';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;

// Background images to preload
const backgroundImages = [
  require('../../assets/images/home.png'),
  require('../../assets/images/profile.png'),
];

const COLORS = {
  teal: '#20B2AA',
  green: '#32CD32',
  coral: '#FF6B6B',
  gold: '#FFD700',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  white: '#FFFFFF',
};

const NAV_ITEMS = [
  {
    name: 'index',
    title: 'Home',
    icon: Home,
    color: COLORS.white,
    description: 'Dashboard & Overview',
  },
  {
    name: 'itinerary',
    title: 'Sri-TripTuner',
    icon: Calendar,
    color: COLORS.teal,
    description: 'Plan your journey',
  },
  {
    name: 'reveal',
    title: 'Sri-Reveal',
    icon: Camera,
    color: COLORS.gold,
    description: 'Gamified Exploration',
  },
  {
    name: 'safety',
    title: 'Sri-SafeSpot',
    icon: Shield,
    color: COLORS.coral,
    description: 'Safety & Alerts',
  },
];

function SidebarNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const toggleSidebar = () => {
    const toValue = isOpen ? -SIDEBAR_WIDTH : 0;
    const overlayValue = isOpen ? 0 : 1;

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: overlayValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setIsOpen(!isOpen);
  };

  const navigateTo = (route: string) => {
    router.push(`/${route === 'index' ? '' : route}` as any);
    toggleSidebar();
  };

  const currentRoute = pathname.replace('/', '') || 'index';
  const activeItem = NAV_ITEMS.find((item) => item.name === currentRoute);
  const activeColor = activeItem?.color ?? COLORS.gold;

  return (
    <>
      {/* Menu Toggle Button */}
      <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
        <BlurView intensity={40} tint="dark" style={styles.menuButtonBlur}>
          <Menu size={22} color={activeColor} />
        </BlurView>
      </TouchableOpacity>

      {/* Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayAnim,
            pointerEvents: isOpen ? 'auto' : 'none',
          },
        ]}
      >
        <Pressable style={styles.overlayPressable} onPress={toggleSidebar} />
      </Animated.View>

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <BlurView intensity={60} tint="dark" style={styles.sidebarBlur}>
          {/* Header */}
          <View style={styles.sidebarHeader}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>Sri</Text>
              <Text style={styles.logoTextAccent}>EXPLORE</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={toggleSidebar}
            >
              <X size={20} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Navigation Items */}
          <View style={styles.navSection}>
            <Text style={styles.navSectionTitle}>NAVIGATION</Text>
            {NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => navigateTo(item.name)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.navIconBg,
                      isActive && { backgroundColor: `${item.color}25` },
                    ]}
                  >
                    <Icon size={20} color={isActive ? item.color : '#666'} />
                  </View>
                  <View style={styles.navTextContainer}>
                    <Text
                      style={[
                        styles.navLabel,
                        isActive && { color: item.color },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.navDescription}>
                      {item.description}
                    </Text>
                  </View>
                  {isActive && (
                    <View
                      style={[
                        styles.activeIndicator,
                        { backgroundColor: item.color },
                      ]}
                    />
                  )}
                  <ChevronRight
                    size={16}
                    color={isActive ? item.color : '#444'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.sidebarFooter}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerText}>Discover Sri Lanka</Text>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </BlurView>
      </Animated.View>
    </>
  );
}

export default function TabLayout() {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    const preloadImages = async () => {
      try {
        const imageAssets = backgroundImages.map((image) =>
          Asset.fromModule(image).downloadAsync(),
        );
        await Promise.all(imageAssets);
        setImagesLoaded(true);
      } catch (error) {
        console.error('Error preloading images:', error);
        setImagesLoaded(true); // Continue even if preload fails
      }
    };
    preloadImages();
  }, []);

  if (!imagesLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="itinerary" />
        <Tabs.Screen name="reveal" />
        <Tabs.Screen name="safety" />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
      <SidebarNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#888',
  },
  menuButton: {
    position: 'absolute',
    top: '45%',
    left: 0,
    width: 40,
    height: 56,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
    backgroundColor: 'rgba(20, 20, 20, 0.31)',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: 'rgba(32, 178, 171, 0.07)',
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  overlayPressable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    height: SCREEN_HEIGHT,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  sidebarBlur: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  },
  logoTextAccent: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: COLORS.teal,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navSection: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 12,
  },
  navSectionTitle: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    color: '#555',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginLeft: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  navIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginRight: 14,
  },
  navTextContainer: {
    flex: 1,
  },
  navLabel: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#aaa',
    marginBottom: 2,
  },
  navDescription: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#555',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    width: 3,
    height: 24,
    borderRadius: 2,
    transform: [{ translateY: -12 }],
  },
  sidebarFooter: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#444',
  },
});
