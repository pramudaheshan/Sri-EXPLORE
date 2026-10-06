// @ts-nocheck

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  ImageBackground,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  ChevronLeft,
  Calendar,
  Camera,
  Shield,
} from 'lucide-react-native';
import { Asset } from 'expo-asset';

const { width, height } = Dimensions.get('window');

// Define images as constants for preloading
const images = [
  require('../assets/images/Sri-TripTuner-ON.jpeg'),
  require('../assets/images/Sri-AR-ON.png'),
  require('../assets/images/Sri-SafeSpot-ON.png'),
];

const onboardingData = [
  {
    image: images[0],
    icon: Calendar,
    title: 'GET PERSONALIZED TRAVEL PLANS CRAFTED BY AI',
    description:
      'Tailored to your interests and preferences for the perfect Sri Lankan adventure.',
    accentColor: '#20B2AA',
  },
  {
    image: images[1],
    icon: Camera,
    title: 'SCAN QR CODES AT HISTORICAL SITES',
    description:
      'To unlock immersive 3D artifacts and stories that bring Sri Lankan heritage to life.',
    accentColor: '#FFD700',
  },
  {
    image: images[2],
    icon: Shield,
    title: 'STAY SAFE WITH REAL-TIME ALERTS',
    description:
      'About danger zones, scam areas, and community-driven safety reports from fellow travelers.',
    accentColor: '#FF6B6B',
  },
];

// Preload images function
const preloadImages = async () => {
  const imageAssets = images.map((image) =>
    Asset.fromModule(image).downloadAsync(),
  );
  await Promise.all(imageAssets);
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Preload images on mount
  useEffect(() => {
    const loadImages = async () => {
      try {
        await preloadImages();
        setImagesLoaded(true);
        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Error preloading images:', error);
        setImagesLoaded(true); // Still show images even if preload fails
      }
    };
    loadImages();
  }, []);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    } else {
      router.replace('/auth');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({
        x: prevIndex * width,
        animated: true,
      });
    }
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  // Show loading screen while images preload
  if (!imagesLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20B2AA" />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Back to Splash Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace('/splash')}
      >
        <ChevronLeft size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {onboardingData.map((item, index) => (
          <ImageBackground
            key={index}
            source={item.image}
            style={styles.slide}
            resizeMode="cover"
          >
            {/* Top gradient overlay for text readability */}
            <LinearGradient
              colors={[
                'rgba(0, 0, 0, 0.85)',
                'rgba(0, 0, 0, 0.46)',
                'transparent',
              ]}
              locations={[0, 0.3, 0.6]}
              style={styles.textOverlay}
            />

            {/* Content */}
            <View style={styles.content}>
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  { shadowColor: item.accentColor },
                ]}
              >
                <item.icon size={32} color={item.accentColor} strokeWidth={2} />
              </View>

              {/* Title (Bold) */}
              <Text style={styles.title}>{item.title}</Text>

              {/* Description */}
              <Text style={styles.description}>{item.description}</Text>
            </View>
          </ImageBackground>
        ))}
      </ScrollView>

      {/* Pagination Dots - Overlaid on image */}
      <View style={styles.paginationContainer}>
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Get Started Button - Overlaid on image */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => router.replace('/auth')}
        >
          <LinearGradient
            colors={['#1A7B5F', '#20B2AA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.getStartedGradient}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <ArrowRight size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D3B2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width,
    height,
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: 'absolute',
    top: 120,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  getStartedButton: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  getStartedGradient: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
});
