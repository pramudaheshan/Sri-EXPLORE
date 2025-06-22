import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather] = useState({ temp: '28°C', condition: 'Sunny' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    { icon: Calendar, title: "Today's Plan", color: '#20B2AA', badge: 2 },
    { icon: Camera, title: 'AR Scan', color: '#32CD32', badge: null },
    { icon: Shield, title: 'Safety', color: '#F4A460', badge: 1 },
    { icon: Trophy, title: 'Achievements', color: '#FF6B6B', badge: 2 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#20B2AA', '#48D1CC']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>
              Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}!
            </Text>
            <Text style={styles.username}>Alex Smith</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.weatherContainer}>
          <View style={styles.weatherItem}>
            <Clock size={16} color="#FFFFFF" />
            <Text style={styles.weatherText}>
              {currentTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.weatherItem}>
            <Thermometer size={16} color="#FFFFFF" />
            <Text style={styles.weatherText}>{weather.temp}</Text>
          </View>
          <View style={styles.weatherItem}>
            <MapPin size={16} color="#FFFFFF" />
            <Text style={styles.weatherText}>Kandy, Sri Lanka</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity key={index} style={styles.quickActionCard}>
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: action.color },
                  ]}
                >
                  <action.icon size={24} color="#FFFFFF" />
                  {action.badge && (
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>{action.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Highlights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Highlights</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={styles.highlightCard}>
              <LinearGradient
                colors={['#32CD32', '#90EE90']}
                style={styles.highlightGradient}
              >
                <Trophy size={32} color="#FFFFFF" />
                <Text style={styles.highlightTitle}>New Badge!</Text>
                <Text style={styles.highlightSubtitle}>Temple Explorer</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.highlightCard}>
              <LinearGradient
                colors={['#FF6B6B', '#FFB3B3']}
                style={styles.highlightGradient}
              >
                <Camera size={32} color="#FFFFFF" />
                <Text style={styles.highlightTitle}>3 AR Scans</Text>
                <Text style={styles.highlightSubtitle}>Today</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.highlightCard}>
              <LinearGradient
                colors={['#F4A460', '#DEB887']}
                style={styles.highlightGradient}
              >
                <Navigation size={32} color="#FFFFFF" />
                <Text style={styles.highlightTitle}>5.2 km</Text>
                <Text style={styles.highlightSubtitle}>Explored</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Nearby Landmarks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Landmarks</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View Map</Text>
            </TouchableOpacity>
          </View>

          {nearbyLandmarks.map((landmark) => (
            <TouchableOpacity key={landmark.id} style={styles.landmarkCard}>
              <Image
                source={{ uri: landmark.image }}
                style={styles.landmarkImage}
              />
              <View style={styles.landmarkInfo}>
                <Text style={styles.landmarkName}>{landmark.name}</Text>
                <View style={styles.landmarkDetails}>
                  <View style={styles.landmarkMeta}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.landmarkDistance}>
                      {landmark.distance}
                    </Text>
                  </View>
                  <View style={styles.landmarkMeta}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.landmarkRating}>{landmark.rating}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <View
                style={[styles.activityIcon, { backgroundColor: '#32CD32' }]}
              >
                <Camera size={16} color="#FFFFFF" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Scanned Buddha Statue</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View
                style={[styles.activityIcon, { backgroundColor: '#20B2AA' }]}
              >
                <Trophy size={16} color="#FFFFFF" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>
                  Earned "Cultural Explorer" badge
                </Text>
                <Text style={styles.activityTime}>5 hours ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View
                style={[styles.activityIcon, { backgroundColor: '#F4A460' }]}
              >
                <Shield size={16} color="#FFFFFF" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Safety alert reported</Text>
                <Text style={styles.activityTime}>Yesterday</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}


export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#113438', // Deep teal background
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    backgroundColor: 'linear-gradient(180deg, #134545 60%, #113438 100%)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greeting: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff', // Gold accent text
    opacity: 0.95,
    letterSpacing: 0.5,
  },
  username: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#f9faf9', // Off-white for username
  },
  notificationButton: {
    position: 'relative',
    width: 46,
    height: 46,
    backgroundColor: 'rgba(227,201,122,0.14)', // Subtle gold glassy
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    backgroundColor: '#ffffff',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#113438',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: '#113438',
  },
  weatherContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: 'rgba(44,122,117,0.12)', // Emerald glassy
    borderRadius: 18,
    paddingVertical: 8,
    marginTop: 10,
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 7,
  },
  weatherText: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: '#f9faf9',
    marginLeft: 7,
    opacity: 0.93,
  },
  content: {
    padding: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  seeAllText: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: '#2c7a75', // Emerald accent
    textDecorationLine: 'underline',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 72) / 2,
    backgroundColor: 'rgba(227,201,122,0.10)', // Gold glassy card
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.11,
    shadowRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(44,122,117,0.18)', // Emerald border
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(44,122,117,0.16)', // Emerald glassy
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#2c7a75',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 9,
    position: 'relative',
  },
  actionBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 21,
    height: 21,
    backgroundColor: '#0fd7ef', // Cyan accent
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f9faf9',
  },
  actionBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    color: '#113438',
  },
  quickActionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: '#f9faf9',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  highlightCard: {
    width: 160,
    height: 120,
    borderRadius: 20,
    marginRight: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(44,122,117,0.10)',
    shadowColor: '#2c7a75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1.2,
    borderColor: '#ffffff',
  },
  highlightGradient: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginTop: 8,
    letterSpacing: 0.2,
  },
  highlightSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#f9faf9',
    opacity: 0.89,
    marginTop: 2,
  },
  landmarkCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(44,122,117,0.07)',
    borderRadius: 18,
    padding: 17,
    marginBottom: 16,
    shadowColor: '#2c7a75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(227,201,122,0.17)',
  },
  landmarkImage: {
    width: 84,
    height: 84,
    borderRadius: 14,
    marginRight: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  landmarkInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  landmarkName: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  landmarkDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  landmarkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  landmarkDistance: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#f9faf9',
    marginLeft: 5,
    opacity: 0.85,
  },
  landmarkRating: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#ffffff',
    marginLeft: 5,
  },
  activityList: {
    backgroundColor: 'rgba(44,122,117,0.11)',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#2c7a75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 7,
    borderWidth: 1.2,
    borderColor: '#ffffff',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(227,201,122,0.15)',
  },
  activityIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    backgroundColor: 'rgba(227,201,122,0.17)',
    borderWidth: 1.4,
    borderColor: '#2c7a75',
    shadowColor: '#113438',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#ffffff',
  },
  activityTime: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#f9faf9',
    marginTop: 2,
    opacity: 0.85,
  },
});
