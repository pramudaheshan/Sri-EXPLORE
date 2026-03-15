// ==========================================
// SriSafeSpot - Safety Map Screen
// Professional density-based heatmap with
// real-time Firebase incident visualization
// ==========================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  Animated,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Heatmap, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  ArrowLeft,
  TriangleAlert as AlertTriangle,
  Shield,
  MapPin,
  Target,
  X,
  Clock,
  Layers,
  ThermometerSun,
  CloudLightning,
  AlertCircle,
  Flag,
} from 'lucide-react-native';
import { SAFE_PLACES } from '../../data/safetyData';
import { COLORS } from '../../constants/theme';
import {
  subscribeToIncidents,
  computeHeatmapPoints,
  flagIncidentReport,
  FirestoreIncident,
} from '../../services/incidentService';
import {
  sendDangerZoneAlert,
  sendWeatherAlert,
  setupNotificationListeners,
} from '../../services/notificationService';

const { width, height } = Dimensions.get('window');

// Haversine in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Category config
const CAT: Record<string, { label: string; color: string; emoji: string; severityLabel: string }> = {
  robbery:          { label: 'Robbery / Theft',  color: '#EF4444', emoji: '🔓', severityLabel: 'HIGH'   },
  harassment:       { label: 'Harassment',        color: '#F97316', emoji: '⚠️', severityLabel: 'MEDIUM' },
  accident:         { label: 'Accident',          color: '#F59E0B', emoji: '🚗', severityLabel: 'MEDIUM' },
  unsafe_area:      { label: 'Unsafe Area',       color: '#8B5CF6', emoji: '🚧', severityLabel: 'MEDIUM' },
  scam:             { label: 'Scam / Fraud',      color: '#EC4899', emoji: '💸', severityLabel: 'LOW'    },
  natural_disaster: { label: 'Natural Disaster',  color: '#3B82F6', emoji: '🌊', severityLabel: 'HIGH'   },
  other:            { label: 'Other',             color: '#6B7280', emoji: '📌', severityLabel: 'LOW'    },
};

function getReportAge(timestamp: any): string {
  let ts: Date;
  if (timestamp?.seconds) ts = new Date(timestamp.seconds * 1000);
  else if (timestamp?.toDate) ts = timestamp.toDate();
  else ts = new Date(timestamp);
  const diffMins = Math.floor((Date.now() - ts.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return ts.toLocaleDateString();
}

export default function SafetyMapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── State ──────────────────────────────────────────────────────────────────
  const [userLocation, setUserLocation]       = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading]             = useState(true);
  const [mapType, setMapType]                 = useState<'standard' | 'satellite'>('standard');
  const [currentRegion, setCurrentRegion]     = useState<Region | null>(null);

  // Layer toggles
  const [showHeatmap, setShowHeatmap]         = useState(true);
  const [showIncidents, setShowIncidents]     = useState(true);
  const [showDisasters, setShowDisasters]     = useState(true);
  const [showSafePlaces, setShowSafePlaces]   = useState(false);

  const [incidents, setIncidents]             = useState<FirestoreIncident[]>([]);
  const [selectedReport, setSelectedReport]   = useState<FirestoreIncident | null>(null);
  const [showModal, setShowModal]             = useState(false);
  const [weatherAlert, setWeatherAlert]       = useState<string | null>(null);
  const geofenceAlerted                       = useRef(false);

  // ── Memoized heatmap points ──────────────────────────────────────────────
  const heatmapPoints = useMemo(() => computeHeatmapPoints(incidents), [incidents]);

  // ── Heatmap radius in pixels, representing MIN_DANGER_RADIUS_METERS ────────
  // metersPerPixel = latitudeDelta × 111,000 / screenHeight
  // radiusPixels   = MIN_DANGER_RADIUS_METERS / metersPerPixel
  // Clamped to [40, 200] for rendering performance.
  const MIN_DANGER_RADIUS_METERS = 200;
  const heatmapRadius = useMemo(() => {
    const delta = currentRegion?.latitudeDelta ?? 3.5;
    const metersPerPixel = (delta * 111_000) / height;
    const radiusPixels = Math.round(MIN_DANGER_RADIUS_METERS / metersPerPixel);
    return Math.max(40, Math.min(200, radiusPixels));
  }, [currentRegion?.latitudeDelta]);


  const initialRegion: Region = {
    latitude: 7.8731, longitude: 80.7718,
    latitudeDelta: 3.5, longitudeDelta: 3.5,
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation(loc);
          mapRef.current?.animateToRegion({
            latitude: loc.coords.latitude, longitude: loc.coords.longitude,
            latitudeDelta: 0.15, longitudeDelta: 0.15,
          }, 1000);
        }
      } catch { /* silent */ } finally { setIsLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const cleanup = setupNotificationListeners();
    const unsub   = subscribeToIncidents(setIncidents);
    fetchWeatherAlerts();
    return () => { unsub(); cleanup(); };
  }, []);

  useEffect(() => {
    if (!userLocation || !heatmapPoints.length || geofenceAlerted.current) return;
    const hotZones = heatmapPoints.filter(p => p.weight >= 0.7);
    for (const zone of hotZones) {
      if (haversineKm(
        userLocation.coords.latitude, userLocation.coords.longitude,
        zone.latitude, zone.longitude) <= 1.0) {
        geofenceAlerted.current = true;
        sendDangerZoneAlert();
        break;
      }
    }
  }, [userLocation, heatmapPoints]);

  // Pulse animation
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 2, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);

  const fetchWeatherAlerts = useCallback(async () => {
    try {
      const KEY = '411b16aa04a3b329e0f4ef991f513476';
      const res  = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=7.8731&lon=80.7718&appid=${KEY}`);
      if (!res.ok) return;
      const data = await res.json();
      const cond = data.weather?.[0]?.main ?? '';
      if (['Thunderstorm', 'Squall', 'Tornado', 'Hurricane', 'Extreme'].includes(cond)) {
        setWeatherAlert(`⛈️ ${cond} conditions across Sri Lanka`);
        sendWeatherAlert(cond);
      }
    } catch { /* silent */ }
  }, []);

  const centerOnUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      }, 500);
    }
  }, [userLocation]);

  const regularIncidents = useMemo(() => incidents.filter(r => r.category !== 'natural_disaster'), [incidents]);
  const disasters        = useMemo(() => incidents.filter(r => r.category === 'natural_disaster'),  [incidents]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading safety map...</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── MAP ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        mapType={mapType}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onRegionChangeComplete={setCurrentRegion}
      >

        {/* ── HEATMAP ── true density layer (requires native build, not Expo Go) */}
        {showHeatmap && heatmapPoints.length > 0 && (
          <Heatmap
            points={heatmapPoints}
            radius={heatmapRadius}
            opacity={0.8}
            gradient={{
              colors: ['#00ff00', '#ffff00', '#ff9900', '#ff0000'],
              startPoints: [0.2, 0.4, 0.7, 1.0],
              colorMapSize: 512,
            }}
          />
        )}

        {/* ── INCIDENT MARKERS ── */}
        {showIncidents && regularIncidents.map(report => {
          const cfg = CAT[report.category] ?? CAT.other;
          return (
            <Marker
              key={report.id}
              coordinate={{ latitude: report.latitude, longitude: report.longitude }}
              onPress={() => { setSelectedReport(report); setShowModal(true); }}
              zIndex={10}
            >
              <View style={[styles.marker, { backgroundColor: cfg.color }]}>
                <Text style={styles.markerEmoji}>{cfg.emoji}</Text>
              </View>
            </Marker>
          );
        })}

        {/* ── DISASTER MARKERS ── */}
        {showDisasters && disasters.map(report => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            onPress={() => { setSelectedReport(report); setShowModal(true); }}
            zIndex={11}
          >
            <View style={[styles.marker, { backgroundColor: '#2563EB', borderWidth: 2.5 }]}>
              <Text style={styles.markerEmoji}>🌊</Text>
            </View>
          </Marker>
        ))}

        {/* ── SAFE PLACES ── */}
        {showSafePlaces && SAFE_PLACES.map(place => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.name}
            description={place.address}
            zIndex={5}
          >
            <View style={styles.safeMarker}>
              <Shield size={11} color="#FFF" />
            </View>
          </Marker>
        ))}

        {/* ── USER LOCATION ── */}
        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            tracksViewChanges={false}
            zIndex={20}
          >
            <View style={styles.userLocContainer}>
              <Animated.View style={[styles.userLocPulse, {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({ inputRange: [1, 2], outputRange: [0.5, 0] }),
              }]} />
              <View style={styles.userLocDot} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <View style={styles.iconBtnInner}>
            <ArrowLeft size={22} color="#1E293B" />
          </View>
        </TouchableOpacity>

        <View style={styles.titleBar}>
          <Shield size={15} color={COLORS.primary} />
          <Text style={styles.titleText}>SriSafeSpot Map</Text>
          {incidents.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{incidents.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── WEATHER BANNER ── */}
      {weatherAlert && (
        <View style={styles.weatherBanner}>
          <LinearGradient colors={['#1E3A5F', '#1E4080']} style={styles.weatherGrad}>
            <CloudLightning size={16} color="#93C5FD" />
            <Text style={styles.weatherText}>{weatherAlert}</Text>
          </LinearGradient>
        </View>
      )}

      {/* ── RIGHT CONTROLS ── */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.iconBtn} onPress={centerOnUser}>
          <View style={styles.iconBtnInner}><Target size={20} color="#1E293B" /></View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, showHeatmap && styles.iconBtnOn]}
          onPress={() => setShowHeatmap(v => !v)}>
          <View style={styles.iconBtnInner}>
            <ThermometerSun size={20} color={showHeatmap ? '#EF4444' : '#1E293B'} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, showIncidents && styles.iconBtnOn]}
          onPress={() => setShowIncidents(v => !v)}>
          <View style={styles.iconBtnInner}>
            <AlertTriangle size={20} color={showIncidents ? '#F97316' : '#1E293B'} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, showDisasters && styles.iconBtnOn]}
          onPress={() => setShowDisasters(v => !v)}>
          <View style={styles.iconBtnInner}>
            <AlertCircle size={20} color={showDisasters ? '#3B82F6' : '#1E293B'} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, showSafePlaces && styles.iconBtnOn]}
          onPress={() => setShowSafePlaces(v => !v)}>
          <View style={styles.iconBtnInner}>
            <Shield size={20} color={showSafePlaces ? COLORS.success : '#1E293B'} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setMapType(t => t === 'standard' ? 'satellite' : 'standard')}>
          <View style={styles.iconBtnInner}><Layers size={20} color="#1E293B" /></View>
        </TouchableOpacity>
      </View>

      {/* ── BOTTOM PANEL: Legend + Stats ── */}
      <View style={styles.bottomPanel}>
        {/* Gradient legend bar */}
        <View style={styles.legendRow}>
          <Text style={styles.legendTitle}>Risk Level</Text>
          <View style={styles.legendBarWrap}>
            <LinearGradient
              colors={['rgba(255,230,0,0.5)', '#FF8C00', '#FF3200', '#8B0000']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.legendBar}
            />
            <View style={styles.legendEndLabels}>
              <Text style={styles.legendEndText}>Low</Text>
              <Text style={styles.legendEndText}>High</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.statText}>{regularIncidents.length} incidents</Text>
          </View>
          <View style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.statText}>{disasters.length} disasters</Text>
          </View>
          {showSafePlaces && (
            <View style={styles.statChip}>
              <View style={[styles.statDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.statText}>{SAFE_PLACES.length} safe</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── INCIDENT DETAIL MODAL ── */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            {selectedReport && (() => {
              const cfg = CAT[selectedReport.category] ?? CAT.other;
              return (
                <>
                  <View style={styles.sheetHandle} />

                  {/* Badge + close */}
                  <View style={styles.modalTopRow}>
                    <View style={[styles.catBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}>
                      <Text style={styles.catEmoji}>{cfg.emoji}</Text>
                      <Text style={[styles.catLabel, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.severityBadge, {
                      backgroundColor: cfg.severityLabel === 'HIGH' ? '#FEE2E2' : cfg.severityLabel === 'MEDIUM' ? '#FEF3C7' : '#F0FDF4'
                    }]}>
                      <Text style={[styles.severityText, {
                        color: cfg.severityLabel === 'HIGH' ? '#DC2626' : cfg.severityLabel === 'MEDIUM' ? '#D97706' : '#16A34A'
                      }]}>{cfg.severityLabel}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowModal(false)}>
                      <X size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  {/* Title */}
                  <Text style={styles.modalTitle}>
                    {selectedReport.title || cfg.label + ' Incident'}
                  </Text>

                  {/* Meta */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Clock size={13} color="#94A3B8" />
                      <Text style={styles.metaText}>{getReportAge(selectedReport.timestamp)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MapPin size={13} color="#94A3B8" />
                      <Text style={styles.metaText}>
                        {selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  {selectedReport.description ? (
                    <Text style={styles.modalDesc}>{selectedReport.description}</Text>
                  ) : null}

                  {/* Warning */}
                  <View style={styles.warningBox}>
                    <AlertCircle size={14} color="#F59E0B" />
                    <Text style={styles.warningText}>
                      User-submitted report. Verify with official sources before acting.
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        mapRef.current?.animateToRegion({
                          latitude: selectedReport.latitude, longitude: selectedReport.longitude,
                          latitudeDelta: 0.01, longitudeDelta: 0.01,
                        }, 500);
                        setShowModal(false);
                      }}
                    >
                      <Target size={15} color={COLORS.primary} />
                      <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Focus on Map</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnRed]}
                      onPress={() => {
                        flagIncidentReport(selectedReport.id)
                          .then(() => { Alert.alert('Flagged', 'Report flagged. Thank you.'); setShowModal(false); })
                          .catch(() => Alert.alert('Error', 'Could not flag this report.'));
                      }}
                    >
                      <Flag size={15} color="#EF4444" />
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Flag as False</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText:      { color: '#334155', marginTop: 12, fontSize: 15, fontFamily: 'Poppins-Medium' },
  map:              { ...StyleSheet.absoluteFillObject },

  // Header
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  titleBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  titleText:      { flex: 1, color: '#0F172A', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
  countBadge:     { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText: { color: '#FFF', fontSize: 11, fontFamily: 'Poppins-Bold' },

  // Icon button
  iconBtn: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  iconBtnInner: {
    width: 44, height: 44,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  iconBtnOn: { borderWidth: 2, borderColor: COLORS.primary },

  // Controls
  controls: {
    position: 'absolute',
    right: 14,
    top: Platform.OS === 'ios' ? 112 : 94,
    gap: 10,
  },

  // Weather
  weatherBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 112 : 94,
    left: 14, right: 72,
    borderRadius: 12, overflow: 'hidden',
  },
  weatherGrad: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  weatherText: { flex: 1, color: '#BFDBFE', fontSize: 12, fontFamily: 'Poppins-Medium' },

  // Markers
  marker: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  markerEmoji: { fontSize: 15 },
  safeMarker: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.success,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },

  // User location
  userLocContainer: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  userLocPulse: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
  },
  userLocDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.primary, borderWidth: 3, borderColor: '#FFF',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 6,
  },

  // Bottom panel
  bottomPanel: {
    position: 'absolute', bottom: 24, left: 14, right: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  legendRow:      { gap: 6 },
  legendTitle:    { color: '#1E293B', fontSize: 12, fontFamily: 'Poppins-SemiBold' },
  legendBarWrap:  { gap: 3 },
  legendBar:      { height: 10, borderRadius: 5 },
  legendEndLabels:{ flexDirection: 'row', justifyContent: 'space-between' },
  legendEndText:  { color: '#64748B', fontSize: 10, fontFamily: 'Poppins-Regular' },
  divider:        { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
  statsRow:       { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  statChip:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDot:        { width: 8, height: 8, borderRadius: 4 },
  statText:       { color: '#475569', fontSize: 12, fontFamily: 'Poppins-Regular' },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#E2E8F0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  catEmoji:      { fontSize: 14 },
  catLabel:      { fontSize: 10, fontFamily: 'Poppins-Bold' },
  severityBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  severityText:  { fontSize: 11, fontFamily: 'Poppins-Bold' },
  modalTitle:    { color: '#0F172A', fontSize: 18, fontFamily: 'Poppins-Bold', marginBottom: 8 },
  metaRow:       { flexDirection: 'row', gap: 16, marginBottom: 10 },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:      { color: '#94A3B8', fontSize: 12, fontFamily: 'Poppins-Regular' },
  modalDesc: {
    color: '#334155', fontSize: 14, fontFamily: 'Poppins-Regular',
    lineHeight: 22, marginBottom: 12,
  },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A',
  },
  warningText: { flex: 1, color: '#92400E', fontSize: 12, fontFamily: 'Poppins-Regular', lineHeight: 18 },
  actionRow:   { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  actionBtnRed:  { backgroundColor: '#FEF2F2', borderColor: '#EF444430' },
  actionBtnText: { fontSize: 13, fontFamily: 'Poppins-SemiBold' },
});


