import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Calendar,
  Clock,
  MapPin,
  Star,
  Camera,
  Users,
  Car,
  Utensils,
  ChevronRight,
  Plus
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ItineraryScreen() {
  const [selectedDay, setSelectedDay] = useState(0);

  const days = [
    { day: 'Today', date: 'Dec 15', activities: 6 },
    { day: 'Tomorrow', date: 'Dec 16', activities: 4 },
    { day: 'Thu', date: 'Dec 17', activities: 5 },
    { day: 'Fri', date: 'Dec 18', activities: 3 },
  ];

  const todayActivities = [
    {
      id: 1,
      time: '09:00 AM',
      title: 'Temple of the Sacred Tooth Relic',
      type: 'Cultural',
      duration: '2 hours',
      location: 'Kandy',
      rating: 4.8,
      status: 'upcoming',
      icon: MapPin,
      color: '#20B2AA',
    },
    {
      id: 2,
      time: '11:30 AM',
      title: 'Traditional Sri Lankan Lunch',
      type: 'Dining',
      duration: '1 hour',
      location: 'The Empire Cafe',
      rating: 4.5,
      status: 'upcoming',
      icon: Utensils,
      color: '#F4A460',
    },
    {
      id: 3,
      time: '01:00 PM',
      title: 'Kandy Lake Walk',
      type: 'Leisure',
      duration: '1.5 hours',
      location: 'Kandy Lake',
      rating: 4.3,
      status: 'current',
      icon: Users,
      color: '#32CD32',
    },
    {
      id: 4,
      time: '03:00 PM',
      title: 'Royal Botanical Gardens',
      type: 'Nature',
      duration: '2 hours',
      location: 'Peradeniya',
      rating: 4.7,
      status: 'upcoming',
      icon: MapPin,
      color: '#90EE90',
    },
    {
      id: 5,
      time: '05:30 PM',
      title: 'Sunset at Ambuluwawa Tower',
      type: 'Scenic',
      duration: '1 hour',
      location: 'Gampola',
      rating: 4.9,
      status: 'upcoming',
      icon: Camera,
      color: '#FF6B6B',
    },
    {
      id: 6,
      time: '07:30 PM',
      title: 'Traditional Kandyan Dance Show',
      type: 'Cultural',
      duration: '1.5 hours',
      location: 'Kandy Cultural Centre',
      rating: 4.6,
      status: 'upcoming',
      icon: Users,
      color: '#20B2AA',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#32CD32';
      case 'current': return '#FF6B6B';
      case 'upcoming': return '#E0E0E0';
      default: return '#E0E0E0';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'current': return 'In Progress';
      case 'upcoming': return 'Upcoming';
      default: return 'Upcoming';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#20B2AA', '#48D1CC']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Your Itinerary</Text>
          <Text style={styles.headerSubtitle}>Discover Sri Lanka's wonders</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Day Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={styles.daySelectorContent}
      >
        {days.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayCard,
              selectedDay === index && styles.dayCardActive,
            ]}
            onPress={() => setSelectedDay(index)}
          >
            <Text
              style={[
                styles.dayText,
                selectedDay === index && styles.dayTextActive,
              ]}
            >
              {day.day}
            </Text>
            <Text
              style={[
                styles.dateText,
                selectedDay === index && styles.dateTextActive,
              ]}
            >
              {day.date}
            </Text>
            <View
              style={[
                styles.activityBadge,
                selectedDay === index && styles.activityBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.activityCount,
                  selectedDay === index && styles.activityCountActive,
                ]}
              >
                {day.activities}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Timeline */}
      <ScrollView style={styles.timeline} showsVerticalScrollIndicator={false}>
        <View style={styles.timelineContainer}>
          {todayActivities.map((activity, index) => (
            <View key={activity.id} style={styles.timelineItem}>
              {/* Time Line */}
              <View style={styles.timelineLeft}>
                <Text style={styles.timeText}>{activity.time}</Text>
                <View style={styles.timelineDot}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: getStatusColor(activity.status) },
                    ]}
                  />
                  {index < todayActivities.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
              </View>

              {/* Activity Card */}
              <TouchableOpacity style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: activity.color },
                    ]}
                  >
                    <activity.icon size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityType}>{activity.type}</Text>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </View>

                <View style={styles.activityDetails}>
                  <View style={styles.detailItem}>
                    <Clock size={14} color="#666" />
                    <Text style={styles.detailText}>{activity.duration}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.detailText}>{activity.location}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.detailText}>{activity.rating}</Text>
                  </View>
                </View>

                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(activity.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusText(activity.status)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Today's Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#20B2AA' }]}>
                <Clock size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>9.5 hrs</Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#32CD32' }]}>
                <MapPin size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>6 Places</Text>
              <Text style={styles.statLabel}>Locations</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#F4A460' }]}>
                <Car size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>35 km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daySelector: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  daySelectorContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dayCard: {
    minWidth: 80,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F8F9FA',
  },
  dayCardActive: {
    backgroundColor: '#20B2AA',
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#999',
    marginTop: 2,
  },
  dateTextActive: {
    color: '#FFFFFF',
  },
  activityBadge: {
    marginTop: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activityBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activityCount: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: '#666',
  },
  activityCountActive: {
    color: '#FFFFFF',
  },
  timeline: {
    flex: 1,
    padding: 20,
  },
  timelineContainer: {
    paddingBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    width: 80,
    alignItems: 'center',
    paddingTop: 4,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    marginBottom: 8,
  },
  timelineDot: {
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  timelineLine: {
    width: 2,
    height: 60,
    backgroundColor: '#E0E0E0',
    marginTop: 8,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginLeft: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  activityType: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginTop: 2,
  },
  activityDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 4,
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginTop: 2,
  },
});