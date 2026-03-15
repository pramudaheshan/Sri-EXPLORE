// ==========================================
// SRI-SAFESPOT - Tourist Safety Dashboard
// Firebase real-time safety module for tourists
// ==========================================
// @ts-nocheck

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  RefreshControl,
  Platform,
  Alert,
  Vibration,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import {
  Shield,
  AlertTriangle,
  MapPin,
  Clock,
  Users,
  ChevronRight,
  Map,
  CheckCircle,
  AlertCircle,
  Siren,
} from 'lucide-react-native';

import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import {
  subscribeToIncidents,
  FirestoreIncident,
  INCIDENT_CATEGORIES,
} from '../../services/incidentService';
import { registerForPushNotifications } from '../../services/notificationService';
import {
  startBackgroundLocationTracking,
  isBackgroundTrackingActive,
} from '../../services/backgroundLocationTask';

const { width, height } = Dimensions.get('window');

// ==========================================
// TYPES
// ==========================================

interface LocationState {
  latitude: number;
  longitude: number;
  heading?: number;
}

// ==========================================
// CONSTANTS
// ==========================================

const EMERGENCY_NUMBERS = [
  { label: 'Police', number: '119', icon: <Shield size={20} color={COLORS.info} /> },
  { label: 'Ambulance', number: '110', icon: <Siren size={20} color={COLORS.critical} /> },
  { label: 'Fire', number: '111', icon: <AlertTriangle size={20} color={COLORS.warning} /> },
  { label: 'Tourist Police', number: '1912', icon: <Users size={20} color={COLORS.success} /> },
];

const getCategoryColor = (category: string): string => {
  const cat = INCIDENT_CATEGORIES.find(c => c.value === category);
  return cat?.color ?? COLORS.warning;
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function SafeSpotScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  // Firebase state
  const [recentReports, setRecentReports] = useState<FirestoreIncident[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [firestoreLoading, setFirestoreLoading] = useState(true);

  // Location state
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locationName, setLocationName] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    initializeAnimations();
    setupSafetyPermissions();
    // Subscribe to Firebase incidents in real-time
    const unsubscribe = subscribeToIncidents((incidents) => {
      setRecentReports(incidents.slice(0, 5));
      setTotalReports(incidents.length);
      setFirestoreLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Request all permissions and start background tracking
  const setupSafetyPermissions = async () => {
    try {
      // Step 1: Foreground location — phone shows its own permission dialog
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') return;

      // Get current location for hub display
      getLocation();

      // Step 2: Push notification permission — phone shows its own dialog
      await registerForPushNotifications();

      // Step 3: Background location ("Always Allow") — phone shows its own dialog
      const alreadyTracking = await isBackgroundTrackingActive();
      if (!alreadyTracking) {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus === 'granted') {
          await startBackgroundLocationTracking();
        }
      }
    } catch (e) {
      console.warn('[SafeSpot] Permission setup error:', e);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const [place] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (place) setLocationName([place.street, place.city].filter(Boolean).join(', ') || 'Sri Lanka');
    } catch (e) {
      console.error('Location error:', e);
    }
  };
  
  // Entry animations
  const initializeAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Pulse animation for radar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    Vibration.vibrate(50);
    await getLocation();
    setRefreshing(false);
  };
  
  // ==========================================
  // ACTIONS
  // ==========================================
  
  const handleSOSPress = () => {
    Vibration.vibrate([0, 100, 50, 100, 50, 100]);
    Alert.alert(
      '🚨 Emergency SOS',
      'Select emergency service to call:',
      [
        { text: 'Police (119)', onPress: () => Linking.openURL('tel:119') },
        { text: 'Ambulance (110)', onPress: () => Linking.openURL('tel:110') },
        { text: 'Tourist Police (1912)', onPress: () => Linking.openURL('tel:1912') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };
  
  const handleNavigateToMap = () => {
    router.push('/safety-map');
  };

  const handleReportIncident = () => {
    router.push('/report-incident' as any);
  };
  
  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================
  
  const renderHeader = () => (
    <LinearGradient
      colors={['rgba(0,0,0,0.8)', 'transparent']}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Shield size={28} color={COLORS.primary} />
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.radarDot} />
            </Animated.View>
          </View>
          <View>
            <Text style={styles.headerTitle}>SriSafeSpot</Text>
            <Text style={styles.headerSubtitle}>Tourist Safety Platform</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.sosHeaderButton} onPress={handleSOSPress}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.sosHeaderGradient}
          >
            <Siren size={18} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // Recent Community Reports from Firebase
  const renderRecentReports = () => (
    <Animated.View
      style={[
        styles.resultsSection,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <BlurView intensity={40} tint="dark" style={styles.statCard}>
          <AlertTriangle size={20} color={COLORS.warning} />
          <Text style={styles.statNumber}>{totalReports}</Text>
          <Text style={styles.statLabel}>Total Reports</Text>
        </BlurView>
        <BlurView intensity={40} tint="dark" style={styles.statCard}>
          <MapPin size={20} color={COLORS.primary} />
          <Text style={styles.statNumber}>{recentReports.length}</Text>
          <Text style={styles.statLabel}>Recent Alerts</Text>
        </BlurView>
        <BlurView intensity={40} tint="dark" style={styles.statCard}>
          <CheckCircle size={20} color={COLORS.success} />
          <Text style={styles.statNumber}>Live</Text>
          <Text style={styles.statLabel}>Real-time</Text>
        </BlurView>
      </View>

      {/* Navigation Buttons */}
      <TouchableOpacity style={styles.mapNavBtn} onPress={handleNavigateToMap} activeOpacity={0.85}>
        <LinearGradient colors={['rgba(32,178,170,0.25)', 'rgba(32,178,170,0.12)']} style={styles.mapNavGradient}>
          <View style={styles.mapNavLeft}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.mapNavIcon}>
              <Map size={22} color={COLORS.white} />
            </LinearGradient>
            <View>
              <Text style={styles.mapNavTitle}>View Safety Map</Text>
              <Text style={styles.mapNavSubtitle}>See live heatmap & danger zones</Text>
            </View>
          </View>
          <ChevronRight size={20} color={COLORS.primary} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Recent Reports List */}
      <BlurView intensity={40} tint="dark" style={styles.reportsCard}>
        <View style={styles.reportsHeader}>
          <AlertCircle size={18} color={COLORS.warning} />
          <Text style={styles.reportsTitle}>Recent Incident Reports</Text>
          {firestoreLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>

        {!firestoreLoading && recentReports.length === 0 && (
          <View style={styles.emptyReports}>
            <CheckCircle size={32} color={COLORS.success} />
            <Text style={styles.emptyReportsText}>No recent incidents reported</Text>
            <Text style={styles.emptyReportsSubtext}>This area appears safe</Text>
          </View>
        )}

        {recentReports.map((report) => {
          const cat = INCIDENT_CATEGORIES.find(c => c.value === report.category);
          const color = cat?.color ?? COLORS.warning;
          const ts = report.timestamp?.seconds
            ? new Date(report.timestamp.seconds * 1000)
            : new Date(report.timestamp);
          const ago = (() => {
            const diffMs = Date.now() - ts.getTime();
            const mins = Math.floor(diffMs / 60000);
            const hrs = Math.floor(diffMs / 3600000);
            if (mins < 60) return `${mins}m ago`;
            if (hrs < 24) return `${hrs}h ago`;
            return ts.toLocaleDateString();
          })();

          return (
            <View key={report.id} style={styles.reportItem}>
              <View style={[styles.reportCatDot, { backgroundColor: color }]}>
                <Text style={styles.reportCatEmoji}>{cat?.emoji ?? '📌'}</Text>
              </View>
              <View style={styles.reportItemContent}>
                <Text style={styles.reportItemTitle} numberOfLines={1}>{report.title}</Text>
                <Text style={styles.reportItemMeta}>
                  {cat?.label ?? report.category} • {ago}
                </Text>
                {report.locationName ? (
                  <Text style={styles.reportItemLocation} numberOfLines={1}>
                    📍 {report.locationName}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.reportSeverityBadge, { backgroundColor: color + '20', borderColor: color }]}>
                <Text style={[styles.reportSeverityText, { color }]}>
                  {(report.flagCount ?? 0) > 0 ? `⚑ ${report.flagCount}` : 'NEW'}
                </Text>
              </View>
            </View>
          );
        })}
      </BlurView>
    </Animated.View>
  );

  const renderQuickActions = () => (
    <Animated.View 
      style={[
        styles.actionsSection,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* ── Report Incident Banner ────────────────────────── */}
      <TouchableOpacity style={styles.reportBannerBtn} onPress={handleReportIncident} activeOpacity={0.85}>
        <LinearGradient
          colors={['rgba(239,68,68,0.18)', 'rgba(220,38,38,0.10)']}
          style={styles.reportBannerGradient}
        >
          <View style={styles.reportBannerLeft}>
            <View style={styles.reportBannerIconWrapper}>
              <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.reportBannerIcon}>
                <AlertTriangle size={20} color={COLORS.white} />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.reportBannerTitle}>Report an Incident</Text>
              <Text style={styles.reportBannerSubtitle}>Warn other tourists about unsafe areas</Text>
            </View>
          </View>
          <ChevronRight size={20} color={COLORS.critical} />
        </LinearGradient>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: SIZES.spacing.lg }]}>Emergency Contacts</Text>
      
      <View style={styles.emergencyGrid}>
        {EMERGENCY_NUMBERS.map((contact, index) => (
          <TouchableOpacity
            key={index}
            style={styles.emergencyCard}
            onPress={() => Linking.openURL(`tel:${contact.number}`)}
          >
            <BlurView intensity={40} tint="dark" style={styles.emergencyCardContent}>
              {contact.icon}
              <Text style={styles.emergencyLabel}>{contact.label}</Text>
              <Text style={styles.emergencyNumber}>{contact.number}</Text>
            </BlurView>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
  
  // Main Return
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={StyleSheet.absoluteFill}
      />
      
      {renderHeader()}
      
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Firebase Stats + Map Nav + Recent Reports */}
        {renderRecentReports()}
        
        {/* Report Incident + Emergency Contacts */}
        {renderQuickActions()}
        
        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  
  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: SIZES.spacing.lg,
    paddingBottom: SIZES.spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.md,
  },
  logoContainer: {
    position: 'relative',
  },
  radarDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.xl,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.gray[400],
    fontSize: SIZES.sm,
  },
  sosHeaderButton: {
    borderRadius: SIZES.radius.full,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  sosHeaderGradient: {
    padding: SIZES.spacing.md,
  },
  
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIZES.spacing.lg,
  },
  
  // Selector Sections
  selectorSection: {
    marginBottom: SIZES.spacing.md,
  },
  selectorCard: {
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: SIZES.spacing.md,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.spacing.md,
    gap: SIZES.spacing.sm,
  },
  selectorTitle: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
    flex: 1,
  },
  nowButton: {
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: SIZES.spacing.xs,
    backgroundColor: 'rgba(32, 178, 170, 0.2)',
    borderRadius: SIZES.radius.full,
  },
  nowButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  
  // User Type
  userTypeList: {
    gap: SIZES.spacing.sm,
    paddingRight: SIZES.spacing.md,
  },
  userTypeChip: {
    alignItems: 'center',
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: SIZES.spacing.sm,
    borderRadius: SIZES.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 75,
  },
  userTypeChipActive: {
    backgroundColor: 'rgba(32, 178, 170, 0.25)',
    borderColor: COLORS.primary,
  },
  userTypeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  userTypeLabel: {
    color: COLORS.gray[400],
    fontSize: SIZES.xs,
    textAlign: 'center',
  },
  userTypeLabelActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // Time Slots
  timeSlotList: {
    gap: SIZES.spacing.sm,
    paddingRight: SIZES.spacing.md,
  },
  timeSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.xs,
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: SIZES.spacing.sm,
    borderRadius: SIZES.radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeSlotChipActive: {
    backgroundColor: 'rgba(32, 178, 170, 0.25)',
    borderColor: COLORS.primary,
  },
  timeSlotLabel: {
    color: COLORS.gray[400],
    fontSize: SIZES.sm,
  },
  timeSlotLabelActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // Safety Card
  safetyCardSection: {
    marginBottom: SIZES.spacing.lg,
  },
  
  // Map Section
  mapSection: {
    marginBottom: SIZES.spacing.lg,
  },
  mapCard: {
    borderRadius: SIZES.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.sm,
  },
  mapTitle: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  expandMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandMapText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  mapContainer: {
    height: 200,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerScore: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  userLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(32, 178, 170, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  mapControls: {
    position: 'absolute',
    top: SIZES.spacing.md,
    right: SIZES.spacing.md,
  },
  mapControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  mapLegend: {
    position: 'absolute',
    bottom: SIZES.spacing.sm,
    left: SIZES.spacing.sm,
    flexDirection: 'row',
    gap: SIZES.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: SIZES.spacing.sm,
    paddingVertical: SIZES.spacing.xs,
    borderRadius: SIZES.radius.full,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.white,
    fontSize: SIZES.xs,
  },
  
  // Quick Actions
  actionsSection: {
    marginBottom: SIZES.spacing.lg,
  },

  // Firebase stats / recent reports
  statsRow: {
    flexDirection: 'row',
    gap: SIZES.spacing.sm,
    marginBottom: SIZES.spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: SIZES.spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.gray[400],
    fontSize: SIZES.xs,
    textAlign: 'center',
  },
  mapNavBtn: {
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(32,178,170,0.35)',
    marginBottom: SIZES.spacing.md,
    ...SHADOWS.md,
  },
  mapNavGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.spacing.md,
  },
  mapNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.md,
  },
  mapNavIcon: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapNavTitle: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  mapNavSubtitle: {
    color: COLORS.gray[400],
    fontSize: SIZES.xs,
    marginTop: 2,
  },
  reportsCard: {
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: SIZES.spacing.md,
    marginBottom: SIZES.spacing.md,
  },
  reportsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.sm,
    marginBottom: SIZES.spacing.md,
  },
  reportsTitle: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
    flex: 1,
  },
  emptyReports: {
    alignItems: 'center',
    padding: SIZES.spacing.xl,
    gap: SIZES.spacing.sm,
  },
  emptyReportsText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  emptyReportsSubtext: {
    color: COLORS.gray[400],
    fontSize: SIZES.sm,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: SIZES.spacing.sm,
  },
  reportCatDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportCatEmoji: {
    fontSize: 16,
  },
  reportItemContent: {
    flex: 1,
  },
  reportItemTitle: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  reportItemMeta: {
    color: COLORS.gray[400],
    fontSize: SIZES.xs,
    marginTop: 2,
  },
  reportItemLocation: {
    color: COLORS.gray[500],
    fontSize: SIZES.xs,
    marginTop: 1,
  },
  reportSeverityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SIZES.radius.full,
    borderWidth: 1,
  },
  reportSeverityText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  // Report Incident Banner
  reportBannerBtn: {
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    ...SHADOWS.md,
  },
  reportBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacing.lg,
    paddingVertical: SIZES.spacing.lg,
  },
  reportBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.md,
    flex: 1,
  },
  reportBannerIconWrapper: {
    borderRadius: SIZES.radius.md,
    overflow: 'hidden',
  },
  reportBannerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius.md,
  },
  reportBannerTitle: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  reportBannerSubtitle: {
    color: COLORS.gray[400],
    fontSize: SIZES.sm,
    marginTop: 2,
  },

  sectionTitle: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.spacing.md,
    marginTop: SIZES.spacing.md,
  },
  emergencyCard: {
    width: (width - SIZES.spacing.lg * 2 - SIZES.spacing.md) / 2,
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
  },
  emergencyCardContent: {
    padding: SIZES.spacing.md,
    alignItems: 'center',
    gap: SIZES.spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: SIZES.radius.lg,
  },
  emergencyLabel: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  emergencyNumber: {
    color: COLORS.primary,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  
  // ==========================================
  // SAFETY RESULTS STYLES
  // ==========================================
  resultsSection: {
    marginBottom: SIZES.spacing.lg,
    gap: SIZES.spacing.md,
  },
  loadingCard: {
    borderRadius: SIZES.radius.lg,
    padding: SIZES.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: SIZES.spacing.md,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: COLORS.gray[400],
    fontSize: SIZES.sm,
  },
  mainScoreCard: {
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: SIZES.spacing.lg,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.spacing.lg,
    gap: SIZES.spacing.md,
  },
  locationEmoji: {
    fontSize: 36,
  },
  locationName: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  locationCategory: {
    color: COLORS.gray[400],
    fontSize: SIZES.sm,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.lg,
  },
  scoreBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: '800',
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: SIZES.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
  riskInfo: {
    flex: 1,
    gap: SIZES.spacing.sm,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: SIZES.spacing.sm,
    borderRadius: SIZES.radius.full,
    borderWidth: 1,
    gap: SIZES.spacing.xs,
  },
  riskBadgeText: {
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  riskDescription: {
    color: COLORS.gray[300],
    fontSize: SIZES.sm,
    lineHeight: 20,
  },
  fullMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.spacing.lg,
    paddingVertical: SIZES.spacing.md,
    backgroundColor: 'rgba(32, 178, 170, 0.15)',
    borderRadius: SIZES.radius.md,
    gap: SIZES.spacing.sm,
  },
  fullMapBtnText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  analysisCard: {
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: SIZES.spacing.lg,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.sm,
    marginBottom: SIZES.spacing.md,
  },
  analysisTitle: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  explanationsList: {
    gap: SIZES.spacing.sm,
  },
  explanationItem: {
    padding: SIZES.spacing.md,
    borderRadius: SIZES.radius.md,
    borderLeftWidth: 3,
  },
  explanationFactor: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginBottom: 4,
  },
  explanationText: {
    color: COLORS.gray[300],
    fontSize: SIZES.sm,
    lineHeight: 20,
  },
  suggestionsCard: {
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: SIZES.spacing.lg,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.sm,
    marginBottom: SIZES.spacing.md,
  },
  suggestionsTitle: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  suggestionsList: {
    gap: SIZES.spacing.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.spacing.sm,
  },
  suggestionText: {
    flex: 1,
    color: COLORS.gray[300],
    fontSize: SIZES.sm,
    lineHeight: 20,
  },
  contextCard: {
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: SIZES.spacing.md,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  contextItem: {
    alignItems: 'center',
    gap: 4,
  },
  contextLabel: {
    color: COLORS.gray[500],
    fontSize: SIZES.xs,
  },
  contextValue: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
});