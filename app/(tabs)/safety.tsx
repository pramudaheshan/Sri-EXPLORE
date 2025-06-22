import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  TriangleAlert as AlertTriangle,
  MapPin,
  Phone,
  Plus,
  Users,
  Clock,
  Navigation,
  Eye,
  MessageCircle,
  CircleCheck as CheckCircle,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function SafetyScreen() {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const safetyAlerts = [
    {
      id: 1,
      type: 'scam',
      title: 'Tourist Scam Warning',
      location: 'Fort Railway Station',
      description:
        'Fake taxi drivers overcharging tourists. Verify meter before starting journey.',
      time: '2 hours ago',
      severity: 'medium',
      reports: 5,
      verified: true,
    },
    {
      id: 2,
      type: 'danger',
      title: 'Road Construction',
      location: 'Galle Road, Colombo 3',
      description:
        'Major road works causing traffic delays. Use alternative routes.',
      time: '4 hours ago',
      severity: 'low',
      reports: 12,
      verified: true,
    },
    {
      id: 3,
      type: 'theft',
      title: 'Pickpocketing Alert',
      location: 'Pettah Market Area',
      description:
        'Increased pickpocketing incidents reported. Keep valuables secure.',
      time: '6 hours ago',
      severity: 'high',
      reports: 8,
      verified: false,
    },
    {
      id: 4,
      type: 'weather',
      title: 'Heavy Rain Warning',
      location: 'Central Province',
      description: 'Monsoon rains expected. Avoid travel to hill country.',
      time: '8 hours ago',
      severity: 'high',
      reports: 15,
      verified: true,
    },
  ];

  const emergencyContacts = [
    { name: 'Police Emergency', number: '119', icon: Shield },
    { name: 'Tourist Police', number: '1912', icon: Users },
    { name: 'Fire & Rescue', number: '110', icon: AlertTriangle },
    { name: 'Medical Emergency', number: '1990', icon: Phone },
  ];

  const filters = [
    { key: 'all', label: 'All Alerts', count: safetyAlerts.length },
    {
      key: 'scam',
      label: 'Scams',
      count: safetyAlerts.filter((a) => a.type === 'scam').length,
    },
    {
      key: 'danger',
      label: 'Dangers',
      count: safetyAlerts.filter((a) => a.type === 'danger').length,
    },
    {
      key: 'theft',
      label: 'Theft',
      count: safetyAlerts.filter((a) => a.type === 'theft').length,
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#FF6B6B';
      case 'medium':
        return '#F4A460';
      case 'low':
        return '#32CD32';
      default:
        return '#666';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'scam':
        return AlertTriangle;
      case 'danger':
        return Shield;
      case 'theft':
        return Eye;
      case 'weather':
        return Navigation;
      default:
        return Shield;
    }
  };

  const filteredAlerts =
    selectedFilter === 'all'
      ? safetyAlerts
      : safetyAlerts.filter((alert) => alert.type === selectedFilter);

  const reportIncident = () => {
    Alert.alert('Report Incident', 'Choose reporting method:', [
      {
        text: 'Quick Report',
        onPress: () =>
          Alert.alert('Quick Report', 'Quick report form would open here'),
      },
      {
        text: 'Detailed Report',
        onPress: () =>
          Alert.alert(
            'Detailed Report',
            'Detailed report form would open here'
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const callEmergency = (number: string, name: string) => {
    Alert.alert('Emergency Call', `Call ${name} at ${number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call',
        onPress: () => Alert.alert('Calling', `Dialing ${number}...`),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.header}>
        <View style={styles.headerContent}>
          <Shield size={32} color="#FFFFFF" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Sri-SafeSpot</Text>
            <Text style={styles.headerSubtitle}>Stay safe, stay informed</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.reportButton} onPress={reportIncident}>
          <Plus size={24} color="#FFFFFF" />
          <Text style={styles.reportButtonText}>Report</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Safety Status */}
      <View style={styles.statusContainer}>
        <LinearGradient
          colors={['#32CD32', '#90EE90']}
          style={styles.statusCard}
        >
          <CheckCircle size={24} color="#FFFFFF" />
          <Text style={styles.statusTitle}>You're in a Safe Area</Text>
          <Text style={styles.statusLocation}>Kandy City Center</Text>
        </LinearGradient>
      </View>

      {/* Emergency Contacts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <View style={styles.emergencyGrid}>
          {emergencyContacts.map((contact, index) => (
            <TouchableOpacity
              key={index}
              style={styles.emergencyCard}
              onPress={() => callEmergency(contact.number, contact.name)}
            >
              <View style={styles.emergencyIcon}>
                <contact.icon size={24} color="#FF6B6B" />
              </View>
              <Text style={styles.emergencyName}>{contact.name}</Text>
              <Text style={styles.emergencyNumber}>{contact.number}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Alert Filters */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Alerts</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedFilter === filter.key && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter.key && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
              <View
                style={[
                  styles.filterBadge,
                  selectedFilter === filter.key && styles.filterBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterBadgeText,
                    selectedFilter === filter.key &&
                      styles.filterBadgeTextActive,
                  ]}
                >
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Safety Alerts List */}
      <View style={styles.alertsList}>
        {filteredAlerts.map((alert) => {
          const IconComponent = getTypeIcon(alert.type);
          return (
            <TouchableOpacity key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <View
                  style={[
                    styles.alertIcon,
                    { backgroundColor: getSeverityColor(alert.severity) },
                  ]}
                >
                  <IconComponent size={20} color="#FFFFFF" />
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <View style={styles.alertMeta}>
                    <MapPin size={12} color="#666" />
                    <Text style={styles.alertLocation}>{alert.location}</Text>
                  </View>
                </View>
                <View style={styles.alertTime}>
                  <Clock size={12} color="#666" />
                  <Text style={styles.alertTimeText}>{alert.time}</Text>
                </View>
              </View>

              <Text style={styles.alertDescription}>{alert.description}</Text>

              <View style={styles.alertFooter}>
                <View style={styles.alertStats}>
                  <View style={styles.statItem}>
                    <Users size={14} color="#666" />
                    <Text style={styles.statText}>{alert.reports} reports</Text>
                  </View>
                  {alert.verified && (
                    <View style={styles.verifiedBadge}>
                      <CheckCircle size={12} color="#32CD32" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.alertAction}>
                  <MessageCircle size={16} color="#20B2AA" />
                  <Text style={styles.alertActionText}>Discuss</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Map View Button */}
      <TouchableOpacity style={styles.mapButton}>
        <LinearGradient
          colors={['#20B2AA', '#48D1CC']}
          style={styles.mapButtonGradient}
        >
          <MapPin size={24} color="#FFFFFF" />
          <Text style={styles.mapButtonText}>View Safety Map</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Safety Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Tips</Text>
        <View style={styles.tipsContainer}>
          <View style={styles.tipItem}>
            <Shield size={16} color="#20B2AA" />
            <Text style={styles.tipText}>
              Always keep copies of important documents
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Eye size={16} color="#20B2AA" />
            <Text style={styles.tipText}>Stay aware of your surroundings</Text>
          </View>
          <View style={styles.tipItem}>
            <Phone size={16} color="#20B2AA" />
            <Text style={styles.tipText}>
              Keep emergency contacts readily available
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
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
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reportButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  statusContainer: {
    padding: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  statusLocation: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emergencyCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emergencyIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#FFF5F5',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyName: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  emergencyNumber: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#FF6B6B',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterButtonActive: {
    backgroundColor: '#20B2AA',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: '#666',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  alertsList: {
    paddingHorizontal: 20,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertLocation: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 4,
  },
  alertTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTimeText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 4,
  },
  alertDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#32CD32',
    marginLeft: 4,
  },
  alertAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertActionText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#20B2AA',
    marginLeft: 4,
  },
  mapButton: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  mapButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  tipsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
});
