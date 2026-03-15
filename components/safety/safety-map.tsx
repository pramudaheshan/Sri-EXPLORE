// @ts-nocheck
// ==========================================
// SriSafeSpot - Safety Map Screen
// Apple Maps-inspired glassmorphism UI
// real-time Firebase incident visualization
// ==========================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  Animated,
  PanResponder,
  ActivityIndicator,
  Platform,
  Linking,
  Keyboard,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
  Search,
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
const SAFE_TOP = Platform.OS === 'ios' ? 54 : 36;

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
  const geofenceAlerted = useRef<number>(0); // stores timestamp of last alert (ms)

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchText, setSearchText]           = useState('');
  const [isSearching, setIsSearching]         = useState(false);

  // ── Bottom sheet (Apple Maps style) ─────────────────────────────────────
  const SHEET_PEEK   = 96;    // just handle visible
  const SHEET_MID    = 220;   // search + chips (default)
  const SHEET_FULL_H = 390;   // full sheet height
  const sheetY       = useRef(new Animated.Value(SHEET_FULL_H - SHEET_MID)).current;
  const sheetOffset  = useRef(SHEET_FULL_H - SHEET_MID);

  const snapSheet = useCallback((to: 'peek' | 'mid' | 'full') => {
    const targets = { peek: SHEET_FULL_H - SHEET_PEEK, mid: SHEET_FULL_H - SHEET_MID, full: 0 };
    sheetOffset.current = targets[to];
    Animated.spring(sheetY, { toValue: targets[to], useNativeDriver: true, tension: 65, friction: 12 }).start();
  }, []);

  const sheetPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 4,
    onPanResponderMove: (_, gs) => {
      const next = Math.max(0, Math.min(SHEET_FULL_H - SHEET_PEEK, sheetOffset.current + gs.dy));
      sheetY.setValue(next);
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.vy < -0.5 || gs.dy < -50)      snapSheet('full');
      else if (gs.vy > 0.5 || gs.dy > 50)   snapSheet('peek');
      else                                    snapSheet('mid');
    },
  }), [snapSheet]);

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
          fetchWeatherAlerts(loc.coords.latitude, loc.coords.longitude);
        } else {
          fetchWeatherAlerts(); // fallback to Sri Lanka centre
        }
      } catch { fetchWeatherAlerts(); } finally { setIsLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const cleanup = setupNotificationListeners();
    const unsub   = subscribeToIncidents(setIncidents);
    // weather is fetched inside the location effect with real coords
    return () => { unsub(); cleanup(); };
  }, []);

  useEffect(() => {
    if (!userLocation || !heatmapPoints.length) return;
    const now = Date.now();
    const COOLDOWN_MS = 30 * 60 * 1000; // 30-minute cooldown between alerts
    if (now - geofenceAlerted.current < COOLDOWN_MS) return;
    const hotZones = heatmapPoints.filter(p => p.weight >= 0.7);
    for (const zone of hotZones) {
      if (haversineKm(
        userLocation.coords.latitude, userLocation.coords.longitude,
        zone.latitude, zone.longitude) <= 1.0) {
        geofenceAlerted.current = now;
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

  const fetchWeatherAlerts = useCallback(async (lat = 7.8731, lon = 80.7718) => {
    try {
      const KEY = '411b16aa04a3b329e0f4ef991f513476';
      const res  = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}`);
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

  const onMarkerPress = useCallback((report: FirestoreIncident) => {
    setSelectedReport(report);
    snapSheet('mid');
  }, [snapSheet]);

  const dismissIncident = useCallback(() => {
    setSelectedReport(null);
    snapSheet('mid');
  }, [snapSheet]);

  // ── Search: geocode via Nominatim (free, Sri Lanka) ───────────────────────
  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return;
    Keyboard.dismiss();
    setIsSearching(true);
    try {
      const q = encodeURIComponent(searchText.trim() + ', Sri Lanka');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        { headers: { 'User-Agent': 'SriSafeSpot/1.0' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        mapRef.current?.animateToRegion({
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }, 800);
      } else {
        Alert.alert('Not Found', 'Location not found. Try a different search term.');
      }
    } catch {
      Alert.alert('Search Error', 'Check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchText]);

  // ── SOS: emergency contacts ───────────────────────────────────────────────
  const handleSOS = useCallback(() => {
    Alert.alert('🚨 Emergency Services', 'Select a service to call:', [
      { text: '🚓  Police (119)',    onPress: () => Linking.openURL('tel:119') },
      { text: '🚑  Ambulance (110)', onPress: () => Linking.openURL('tel:110') },
      { text: '🚒  Fire (111)',      onPress: () => Linking.openURL('tel:111') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const regularIncidents = useMemo(() => incidents.filter(r => r.category !== 'natural_disaster'), [incidents]);
  const disasters        = useMemo(() => incidents.filter(r => r.category === 'natural_disaster'),  [incidents]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={S.loadingContainer}>
        <Shield size={40} color={COLORS.primary} />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 16 }} />
        <Text style={S.loadingText}>Loading safety map…</Text>
      </View>
    );
  }

  // ── Incident sheet content ────────────────────────────────────────────────
  const renderIncidentSheet = () => {
    if (!selectedReport) return null;
    const cfg = CAT[selectedReport.category] ?? CAT.other;
    return (
      <View style={S.sheetBody}>
        {/* back + badges */}
        <View style={S.incidentTopRow}>
          <TouchableOpacity onPress={dismissIncident} style={S.incidentBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={17} color="#0F172A" />
          </TouchableOpacity>
          <View style={[S.catBadge, { backgroundColor: cfg.color + '22', borderColor: cfg.color }]}>
            <Text style={S.catEmoji}>{cfg.emoji}</Text>
            <Text style={[S.catLabel, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
          </View>
          <View style={[S.sevBadge, {
            backgroundColor: cfg.severityLabel === 'HIGH' ? '#FEE2E2'
              : cfg.severityLabel === 'MEDIUM' ? '#FEF3C7' : '#F0FDF4',
          }]}>
            <Text style={[S.sevText, {
              color: cfg.severityLabel === 'HIGH' ? '#DC2626'
                : cfg.severityLabel === 'MEDIUM' ? '#D97706' : '#16A34A',
            }]}>{cfg.severityLabel}</Text>
          </View>
        </View>

        <Text style={S.incidentTitle}>
          {selectedReport.title || cfg.label + ' Incident'}
        </Text>

        <View style={S.incidentMeta}>
          <View style={S.metaChip}>
            <Clock size={12} color="#94A3B8" />
            <Text style={S.metaText}>{getReportAge(selectedReport.timestamp)}</Text>
          </View>
          <View style={S.metaChip}>
            <MapPin size={12} color="#94A3B8" />
            <Text style={S.metaText}>
              {selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)}
            </Text>
          </View>
        </View>

        {selectedReport.description ? (
          <Text style={S.incidentDesc} numberOfLines={3}>{selectedReport.description}</Text>
        ) : null}

        <View style={S.incidentActions}>
          <TouchableOpacity style={S.actionPrimary} onPress={() => {
            mapRef.current?.animateToRegion({
              latitude: selectedReport.latitude, longitude: selectedReport.longitude,
              latitudeDelta: 0.01, longitudeDelta: 0.01,
            }, 500);
            dismissIncident();
          }}>
            <Target size={14} color={COLORS.primary} />
            <Text style={[S.actionText, { color: COLORS.primary }]}>Focus Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.actionDanger} onPress={() => {
            flagIncidentReport(selectedReport.id)
              .then(() => { Alert.alert('Flagged', 'Report flagged. Thank you.'); dismissIncident(); })
              .catch(() => Alert.alert('Error', 'Could not flag this report.'));
          }}>
            <Flag size={14} color="#EF4444" />
            <Text style={[S.actionText, { color: '#EF4444' }]}>Flag as False</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Default sheet content ─────────────────────────────────────────────────
  const renderDefaultSheet = () => (
    <View style={S.sheetBody}>
      {/* Search bar */}
      <View style={S.searchRow}>
        <BlurView intensity={70} tint="light" style={S.searchBlur}>
          <Search size={15} color="#94A3B8" />
          <TextInput
            style={S.searchInput}
            placeholder="Search location…"
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {isSearching
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : searchText.length > 0
              ? <TouchableOpacity onPress={() => setSearchText('')}><X size={13} color="#94A3B8" /></TouchableOpacity>
              : null}
        </BlurView>
      </View>

      {/* Layer chips */}
      <View style={S.chipsRow}>
        {[
          { label: 'Heatmap',   active: showHeatmap,    onPress: () => setShowHeatmap(v => !v),   color: '#EF4444' },
          { label: 'Incidents', active: showIncidents,  onPress: () => setShowIncidents(v => !v), color: '#F97316' },
          { label: 'Disasters', active: showDisasters,  onPress: () => setShowDisasters(v => !v), color: '#3B82F6' },
          { label: 'Safe',      active: showSafePlaces, onPress: () => setShowSafePlaces(v => !v),color: COLORS.success },
          { label: mapType === 'standard' ? 'Satellite' : 'Standard',
            active: mapType === 'satellite',
            onPress: () => setMapType(t => t === 'standard' ? 'satellite' : 'standard'),
            color: '#8B5CF6' },
        ].map(chip => (
          <TouchableOpacity
            key={chip.label}
            onPress={chip.onPress}
            style={[S.chip, chip.active && { backgroundColor: chip.color, borderColor: chip.color }]}
          >
            <Text style={[S.chipText, chip.active && { color: '#FFF' }]}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <Text style={S.statsLine}>
        {regularIncidents.length > 0 || disasters.length > 0
          ? `${regularIncidents.length} incident${regularIncidents.length !== 1 ? 's' : ''}  •  ${disasters.length} disaster${disasters.length !== 1 ? 's' : ''}  •  Sri Lanka`
          : 'No incidents reported nearby'}
      </Text>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={S.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ══ FULLSCREEN MAP ══════════════════════════════════════════════════ */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        mapType={mapType}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onRegionChangeComplete={setCurrentRegion}
      >
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

        {showIncidents && regularIncidents.map(report => {
          const cfg = CAT[report.category] ?? CAT.other;
          return (
            <Marker
              key={report.id}
              coordinate={{ latitude: report.latitude, longitude: report.longitude }}
              onPress={() => onMarkerPress(report)}
              zIndex={10}
            >
              <View style={[S.marker, { backgroundColor: cfg.color }]}>
                <Text style={S.markerEmoji}>{cfg.emoji}</Text>
              </View>
            </Marker>
          );
        })}

        {showDisasters && disasters.map(report => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            onPress={() => onMarkerPress(report)}
            zIndex={11}
          >
            <View style={[S.marker, { backgroundColor: '#2563EB' }]}>
              <Text style={S.markerEmoji}>🌊</Text>
            </View>
          </Marker>
        ))}

        {showSafePlaces && SAFE_PLACES.map(place => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.name}
            description={place.address}
            zIndex={5}
          >
            <View style={S.safeMarker}><Shield size={11} color="#FFF" /></View>
          </Marker>
        ))}

        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude }}
            anchor={{ x: 0.5, y: 0.5 }} flat tracksViewChanges={false} zIndex={20}
          >
            <View style={S.userLocWrap}>
              <Animated.View style={[S.userPulse, {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({ inputRange: [1, 2], outputRange: [0.5, 0] }),
              }]} />
              <View style={S.userDot} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ══ BACK BUTTON (top-left glass pill) ═══════════════════════════════ */}
      <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
        <BlurView intensity={80} tint="light" style={S.backBtnBlur}>
          <ArrowLeft size={18} color="#0F172A" />
        </BlurView>
      </TouchableOpacity>

      {/* ══ WEATHER ALERT (top-center pill, only when active) ════════════════ */}
      {weatherAlert && (
        <View style={S.weatherPill}>
          <BlurView intensity={85} tint="dark" style={S.weatherBlur}>
            <CloudLightning size={13} color="#93C5FD" />
            <Text style={S.weatherText} numberOfLines={1}>{weatherAlert}</Text>
          </BlurView>
        </View>
      )}

      {/* ══ RIGHT-SIDE FLOATING CONTROLS (above sheet) ══════════════════════ */}
      <View style={S.rightControls}>
        {/* Locate me */}
        <TouchableOpacity style={S.glassCircle} onPress={centerOnUser} activeOpacity={0.8}>
          <BlurView intensity={80} tint="light" style={S.glassCircleBlur}>
            <Target size={18} color="#1E293B" />
          </BlurView>
        </TouchableOpacity>

        {/* SOS */}
        <TouchableOpacity onPress={handleSOS} activeOpacity={0.85}>
          <LinearGradient colors={['#FF8C00', '#FF4757']} style={S.sosFab}>
            <Text style={S.sosEmoji}>🚨</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Report Incident */}
        <TouchableOpacity onPress={() => router.push('/report-incident')} activeOpacity={0.85}>
          <LinearGradient colors={['#EF4444', '#DC2626']} style={S.reportFab}>
            <AlertTriangle size={22} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ══ BOTTOM SHEET (Apple Maps swipeable) ═════════════════════════════ */}
      <Animated.View style={[S.sheet, { transform: [{ translateY: sheetY }] }]}>
        {/* Handle — pan area */}
        <View {...sheetPan.panHandlers} style={S.handleArea}>
          <View style={S.handle} />
        </View>

        {/* Content */}
        {selectedReport ? renderIncidentSheet() : renderDefaultSheet()}
      </Animated.View>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const SHEET_FULL_H_STYLE = 390;

const S = StyleSheet.create({
  // ── Container / Loading ─────────────────────────────────────────────────
  container:        { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText:      { color: '#334155', marginTop: 12, fontSize: 15, fontFamily: 'Poppins-Medium' },

  // ── Back button ──────────────────────────────────────────────────────────
  backBtn: {
    position: 'absolute',
    top: SAFE_TOP,
    left: 16,
    width: 42, height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  backBtnBlur: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 21,
  },

  // ── Weather pill ─────────────────────────────────────────────────────────
  weatherPill: {
    position: 'absolute',
    top: SAFE_TOP,
    alignSelf: 'center',
    left: 70, right: 70,
    borderRadius: 22, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 6, elevation: 5,
  },
  weatherBlur: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 9, gap: 6,
    borderRadius: 22,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  weatherText: { flex: 1, color: '#BFDBFE', fontSize: 11, fontFamily: 'Poppins-Medium' },

  // ── Right controls ───────────────────────────────────────────────────────
  rightControls: {
    position: 'absolute',
    right: 16,
    bottom: 252,  // SHEET_MID (220) + 32 — floats just above default sheet
    gap: 10, alignItems: 'center',
  },
  glassCircle: {
    width: 44, height: 44, borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  glassCircleBlur: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 22,
  },
  sosFab: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF8C00', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
  },
  sosEmoji: { fontSize: 20 },
  reportFab: {
    width: 58, height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },

  // ── Bottom Sheet ─────────────────────────────────────────────────────────
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: SHEET_FULL_H_STYLE,
    backgroundColor: 'rgba(250,250,255,0.93)',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  handleArea: {
    width: '100%', paddingTop: 10, paddingBottom: 6,
    alignItems: 'center',
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 2,
  },
  sheetBody: { paddingHorizontal: 18, paddingTop: 4 },

  // ── Search bar ───────────────────────────────────────────────────────────
  searchRow: {
    borderRadius: 28, overflow: 'hidden', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  searchBlur: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    borderRadius: 28, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
  },
  searchInput: {
    flex: 1, color: '#0F172A', fontSize: 15,
    fontFamily: 'Poppins-Regular', paddingVertical: 0,
  },

  // ── Layer chips ──────────────────────────────────────────────────────────
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 13, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  chipText: {
    fontSize: 12, fontFamily: 'Poppins-Medium', color: '#334155',
  },
  statsLine: {
    color: '#94A3B8', fontSize: 12, fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },

  // ── Incident sheet ────────────────────────────────────────────────────────
  incidentTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  incidentBack: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 16, borderWidth: 1,
  },
  catEmoji:  { fontSize: 13 },
  catLabel:  { fontSize: 10, fontFamily: 'Poppins-Bold' },
  sevBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sevText:   { fontSize: 10, fontFamily: 'Poppins-Bold' },
  incidentTitle: {
    color: '#0F172A', fontSize: 17, fontFamily: 'Poppins-Bold', marginBottom: 8,
  },
  incidentMeta: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  metaChip:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:  { color: '#94A3B8', fontSize: 11, fontFamily: 'Poppins-Regular' },
  incidentDesc: {
    color: '#475569', fontSize: 13, fontFamily: 'Poppins-Regular',
    lineHeight: 20, marginBottom: 14,
  },
  incidentActions: { flexDirection: 'row', gap: 10 },
  actionPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 14,
    backgroundColor: 'rgba(32,178,170,0.08)', borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  actionDanger: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: '#EF444430',
  },
  actionText: { fontSize: 13, fontFamily: 'Poppins-SemiBold' },

  // ── Map markers ──────────────────────────────────────────────────────────
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

  // ── User location ────────────────────────────────────────────────────────
  userLocWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  userPulse: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  userDot: {
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: COLORS.primary, borderWidth: 3, borderColor: '#FFF',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 6,
  },
});
