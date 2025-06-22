import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Trophy, Star, MapPin, Camera, Settings, Download, Globe, Bell, Shield, CircleHelp as HelpCircle, LogOut, CreditCard as Edit, Award, Target, Zap } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const userStats = {
    name: 'Alex Smith',
    level: 'Explorer',
    points: 2450,
    badges: 12,
    placesVisited: 28,
    arScans: 45,
    joinDate: 'March 2024',
  };

  const badges = [
    { id: 1, name: 'Temple Explorer', icon: Trophy, color: '#20B2AA', earned: true },
    { id: 2, name: 'AR Master', icon: Camera, color: '#32CD32', earned: true },
    { id: 3, name: 'Safety Guardian', icon: Shield, color: '#F4A460', earned: true },
    { id: 4, name: 'Cultural Enthusiast', icon: Star, color: '#FF6B6B', earned: true },
    { id: 5, name: 'Adventure Seeker', icon: Target, color: '#9B59B6', earned: false },
    { id: 6, name: 'Local Expert', icon: MapPin, color: '#E67E22', earned: false },
  ];

  const achievements = [
    { title: 'First AR Scan', description: 'Scanned your first artifact', date: '2 days ago', icon: Camera },
    { title: 'Temple Visitor', description: 'Visited 5 temples', date: '1 week ago', icon: Trophy },
    { title: 'Safety Reporter', description: 'Reported a safety concern', date: '2 weeks ago', icon: Shield },
  ];

  const downloadedContent = [
    { name: 'Buddha Statue 3D Model', size: '12.5 MB', date: 'Yesterday' },
    { name: 'Sigiriya Audio Guide', size: '8.2 MB', date: '3 days ago' },
    { name: 'Temple Bell Sound', size: '4.1 MB', date: '1 week ago' },
  ];

  const menuItems = [
    { title: 'Edit Profile', icon: Edit, action: () => Alert.alert('Edit Profile', 'Profile editing would open here') },
    { title: 'Download Manager', icon: Download, action: () => Alert.alert('Downloads', 'Download manager would open here') },
    { title: 'Language Settings', icon: Globe, action: () => Alert.alert('Language', 'Language settings would open here') },
    { title: 'Privacy & Security', icon: Shield, action: () => Alert.alert('Privacy', 'Privacy settings would open here') },
    { title: 'Help & Support', icon: HelpCircle, action: () => Alert.alert('Help', 'Help center would open here') },
    { title: 'Settings', icon: Settings, action: () => Alert.alert('Settings', 'General settings would open here') },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => Alert.alert('Logged Out', 'You have been logged out') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#20B2AA', '#48D1CC']} style={styles.header}>
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <User size={40} color="#FFFFFF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userStats.name}</Text>
            <Text style={styles.userLevel}>{userStats.level}</Text>
            <Text style={styles.joinDate}>Joined {userStats.joinDate}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Edit size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.badges}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.placesVisited}</Text>
            <Text style={styles.statLabel}>Places</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.arScans}</Text>
            <Text style={styles.statLabel}>AR Scans</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Level Progress */}
      <View style={styles.section}>
        <View style={styles.levelContainer}>
          <View style={styles.levelHeader}>
            <Award size={24} color="#20B2AA" />
            <Text style={styles.levelTitle}>Explorer Level</Text>
            <Text style={styles.levelPoints}>2450 / 3000 XP</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '82%' }]} />
          </View>
          <Text style={styles.progressText}>550 XP to reach Adventure Master</Text>
        </View>
      </View>

      {/* Badges */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Badges & Achievements</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.badgesGrid}>
          {badges.slice(0, 6).map((badge) => (
            <View key={badge.id} style={[styles.badgeItem, !badge.earned && styles.badgeItemLocked]}>
              <View style={[styles.badgeIcon, { backgroundColor: badge.earned ? badge.color : '#E0E0E0' }]}>
                <badge.icon size={20} color={badge.earned ? '#FFFFFF' : '#999'} />
              </View>
              <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>
                {badge.name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Achievements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        <View style={styles.achievementsList}>
          {achievements.map((achievement, index) => (
            <View key={index} style={styles.achievementItem}>
              <View style={styles.achievementIcon}>
                <achievement.icon size={20} color="#20B2AA" />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
                <Text style={styles.achievementDate}>{achievement.date}</Text>
              </View>
              <Zap size={16} color="#FFD700" />
            </View>
          ))}
        </View>
      </View>

      {/* Quick Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Settings</Text>
        <View style={styles.settingsContainer}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Bell size={20} color="#666" />
              <Text style={styles.settingText}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E0E0E0', true: '#20B2AA' }}
              thumbColor={'#FFFFFF'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MapPin size={20} color="#666" />
              <Text style={styles.settingText}>Location Services</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: '#E0E0E0', true: '#20B2AA' }}
              thumbColor={'#FFFFFF'}
            />
          </View>
        </View>
      </View>

      {/* Downloaded Content */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Downloaded Content</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Manage</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.downloadsList}>
          {downloadedContent.map((item, index) => (
            <View key={index} style={styles.downloadItem}>
              <Download size={20} color="#20B2AA" />
              <View style={styles.downloadInfo}>
                <Text style={styles.downloadName}>{item.name}</Text>
                <Text style={styles.downloadDetails}>{item.size} • {item.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More Options</Text>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.action}>
              <View style={styles.menuItemLeft}>
                <item.icon size={20} color="#666" />
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Logout */}
          <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
            <View style={styles.menuItemLeft}>
              <LogOut size={20} color="#FF6B6B" />
              <Text style={styles.logoutText}>Logout</Text>
            </View>
          </TouchableOpacity>
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
    paddingBottom: 30,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  userLevel: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  joinDate: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  editButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#20B2AA',
  },
  levelContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  levelPoints: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: (width - 60) / 3,
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeItemLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: '#999',
  },
  achievementsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  achievementIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#E8F8F5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  achievementDescription: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginTop: 2,
  },
  achievementDate: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: '#999',
    marginTop: 2,
  },
  settingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginLeft: 12,
  },
  downloadsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  downloadInfo: {
    marginLeft: 12,
    flex: 1,
  },
  downloadName: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  downloadDetails: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginTop: 2,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginLeft: 12,
  },
  logoutItem: {
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#FF6B6B',
    marginLeft: 12,
  },
});