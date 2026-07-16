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
  Modal,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MapView, { Marker, Heatmap, PROVIDER_GOOGLE, Region, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  ArrowLeft,
  TriangleAlert as AlertTriangle,
  Shield,
  MapPin,
  Target,
  Navigation,
  X,
  Clock,
  Layers,
  ThermometerSun,
  CloudLightning,
  AlertCircle,
  Flag,
  Search,
  Lock,
  Phone,
  Check,
} from 'lucide-react-native';
import { SAFE_PLACES } from '../../data/safetyData';
import { COLORS } from '../../constants/theme';
import {
  subscribeToIncidents,
  computeHeatmapPoints,
  flagIncidentReport,
  haversineMeters,
  FirestoreIncident,
  getEmergencyContact,
  saveEmergencyContact,
  EmergencyContact,
  getCurrentUserId,
} from '../../services/incidentService';
import { auth } from '../../services/firebase';
import {
  sendDangerZoneAlert,
  sendWeatherAlert,
  setupNotificationListeners,
} from '../../services/notificationService';

const { width, height } = Dimensions.get('window');
const SAFE_TOP = Platform.OS === 'ios' ? 54 : 36;

// Module-level so it can be used as useState initial value (avoids null on first render)
const INITIAL_REGION: Region = {
  latitude:      7.8731,
  longitude:     80.7718,
  latitudeDelta: 3.5,
  longitudeDelta: 3.5,
};

// Dark map style (Google Maps Night style)
const DARK_MAP_STYLE = [
  { elementType: 'geometry',        stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill',stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke',stylers:[{ color: '#1a3646' }] },
  { featureType: 'road',            elementType: 'geometry',       stylers: [{ color: '#1e293b' }] },
  { featureType: 'road',            elementType: 'geometry.stroke',stylers: [{ color: '#0f2d40' }] },
  { featureType: 'road.highway',    elementType: 'geometry',       stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway',    elementType: 'geometry.stroke',stylers: [{ color: '#1f2b3e' }] },
  { featureType: 'water',           elementType: 'geometry',       stylers: [{ color: '#0e2340' }] },
  { featureType: 'water',           elementType: 'labels.text.fill',stylers:[{ color: '#4e6d70' }] },
  { featureType: 'poi',             elementType: 'geometry',       stylers: [{ color: '#162535' }] },
  { featureType: 'transit',         elementType: 'geometry',       stylers: [{ color: '#162535' }] },
  { featureType: 'administrative',  elementType: 'geometry.stroke',stylers: [{ color: '#334155' }] },
];


const CAT: Record<string, { label: string; color: string; emoji: string; severityLabel: string }> = {
  robbery:          { label: 'Robbery / Theft',  color: '#EF4444', emoji: '🔓', severityLabel: 'HIGH'   },
  harassment:       { label: 'Harassment',        color: '#F97316', emoji: '⚠️', severityLabel: 'MEDIUM' },
  accident:         { label: 'Accident',          color: '#F59E0B', emoji: '🚗', severityLabel: 'MEDIUM' },
  unsafe_area:      { label: 'Unsafe Area',       color: '#8B5CF6', emoji: '🚧', severityLabel: 'MEDIUM' },
  scam:             { label: 'Scam / Fraud',      color: '#EC4899', emoji: '💸', severityLabel: 'LOW'    },
  natural_disaster: { label: 'Natural Disaster',  color: '#3B82F6', emoji: '🌊', severityLabel: 'HIGH'   },
  other:            { label: 'Other',             color: '#6B7280', emoji: '📌', severityLabel: 'LOW'    },
};

// Lucide icon for each category — used in the map pin markers
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  robbery:          Lock,
  harassment:       AlertCircle,
  accident:         AlertTriangle,
  unsafe_area:      Flag,
  scam:             AlertCircle,
  natural_disaster: CloudLightning,
  other:            MapPin,
};

// Safe place type labels — for the popup card
const SAFE_TYPE_LABEL: Record<string, string> = {
  hospital:       '🏥 Hospital',
  police:         '🚓 Tourist Police',
  embassy:        '🏛️ Embassy / High Commission',
  airport:        '✈️ Airport',
  tourist_center: 'ℹ️ Tourist Info Centre',
  hotel:          '🏨 Hotel',
  pharmacy:       '💊 Pharmacy',
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
  const { pick, mapStyle, savedTitle, savedDesc, savedCat } = useLocalSearchParams<{ pick?: string; mapStyle?: string; savedTitle?: string; savedDesc?: string; savedCat?: string }>();
  const isPickMode = pick === '1';
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Pick mode state ───────────────────────────────────────────────────────
  const [pickedCoord, setPickedCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // ── State ──────────────────────────────────────────────────────────────────
  const [userLocation, setUserLocation]       = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading]             = useState(true);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'dark'>(
    (mapStyle === 'satellite' || mapStyle === 'dark') ? mapStyle : 'standard'
  );
  const [currentRegion, setCurrentRegion]     = useState<Region>(INITIAL_REGION);
  // mapReady: heatmap only mounts after Google Maps SDK is fully initialised
  // to prevent the invisible-on-first-open bug.
  const [mapReady, setMapReady]               = useState(false);

  // Layer toggles — stable boolean states, updated via functional form only
  const [showHeatmap,    setShowHeatmap]    = useState(true);
  const [showIncidents,  setShowIncidents]  = useState(true);
  const [showDisasters,  setShowDisasters]  = useState(true);
  const [showSafePlaces, setShowSafePlaces] = useState(false);

  // Stable toggle callbacks — prevent new function refs on every render
  const toggleHeatmap    = useCallback(() => setShowHeatmap(v => !v),    []);
  const toggleIncidents  = useCallback(() => setShowIncidents(v => !v),  []);
  const toggleDisasters  = useCallback(() => setShowDisasters(v => !v),  []);
  const toggleSafePlaces = useCallback(() => setShowSafePlaces(v => !v), []);

  const [incidents, setIncidents]             = useState<FirestoreIncident[]>([]);
  const [selectedReport, setSelectedReport]   = useState<FirestoreIncident | null>(null);
  const [selectedPlace, setSelectedPlace]     = useState<typeof SAFE_PLACES[0] | null>(null);
  const [popupPos, setPopupPos]               = useState<{ x: number; y: number } | null>(null);
  const [showModal, setShowModal]             = useState(false);
  const [weatherAlert, setWeatherAlert]       = useState<string | null>(null);
  const geofenceAlerted = useRef<number>(0); // stores timestamp of last alert (ms)

  // Emergency contact
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactNameInput, setContactNameInput] = useState('');
  const [contactPhoneInput, setContactPhoneInput] = useState('');
  const [savingContact, setSavingContact]       = useState(false);

  const currentUserId = useMemo(() => auth.currentUser?.uid ?? null, []);

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchText, setSearchText]           = useState('');
  const [isSearching, setIsSearching]         = useState(false);
  const [suggestions, setSuggestions]         = useState<{ display_name: string; lat: string; lon: string; }[]>([]);
  const [searchFocused, setSearchFocused]     = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bottom sheet (Apple Maps style) ─────────────────────────────────────
  // Sheet height fills from bottom edge to just below Dynamic Island / status bar
  const SHEET_H_TOTAL = height - SAFE_TOP - 12;
  const SHEET_PEEK    = 62;   // tiny handle + search bar = only pill visible
  const SHEET_MID     = 260;  // search + layers + stats
  // Initial state = peek (search bar pill visible, like Apple Maps)
  const sheetY       = useRef(new Animated.Value(SHEET_H_TOTAL - SHEET_PEEK)).current;
  const sheetOffset  = useRef(SHEET_H_TOTAL - SHEET_PEEK);

  const snapSheet = useCallback((to: 'peek' | 'mid' | 'full') => {
    const targets = {
      peek: SHEET_H_TOTAL - SHEET_PEEK,   // only search pill visible
      mid:  SHEET_H_TOTAL - SHEET_MID,    // search + content
      full: 0,                             // full sheet
    };
    sheetOffset.current = targets[to];
    Animated.spring(sheetY, { toValue: targets[to], useNativeDriver: true, tension: 68, friction: 13 }).start();
  }, []);

  const sheetPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 6,
    onPanResponderMove: (_, gs) => {
      // Dismiss keyboard the moment user starts dragging down
      if (gs.dy > 0) Keyboard.dismiss();
      // Clamp: never go below peek, never above full
      const next = Math.max(0, Math.min(SHEET_H_TOTAL - SHEET_PEEK, sheetOffset.current + gs.dy));
      sheetY.setValue(next);
    },
    onPanResponderRelease: (_, gs) => {
      const currentY = sheetOffset.current;          // where sheet was before this gesture
      const peekY    = SHEET_H_TOTAL - SHEET_PEEK;   // large Y = only pill showing
      const midY     = SHEET_H_TOTAL - SHEET_MID;    // medium Y = mid content visible

      const swipingUp   = gs.vy < -0.3 || gs.dy < -30;
      const swipingDown = gs.vy >  0.3 || gs.dy >  30;

      if (swipingUp) {
        // peek → mid (first swipe up), mid → full (second swipe up)
        if (currentY >= midY + 40) snapSheet('mid');
        else                        snapSheet('full');
      } else if (swipingDown) {
        // full → mid (first swipe down), mid → peek (second swipe down)
        if (currentY < midY - 40) snapSheet('mid');
        else                       snapSheet('peek');
      } else {
        // Slow drag with no clear velocity — snap to nearest position
        const distPeek = Math.abs(currentY - peekY);
        const distMid  = Math.abs(currentY - midY);
        const distFull = Math.abs(currentY);
        if (distPeek <= distMid && distPeek <= distFull) snapSheet('peek');
        else if (distMid <= distFull)                     snapSheet('mid');
        else                                              snapSheet('full');
      }
    },
  }), [snapSheet]);

  // ── Memoized heatmap points ──────────────────────────────────────────────
  const heatmapPoints = useMemo(() => computeHeatmapPoints(incidents), [incidents]);

  // ── Layer opacity scales with the maximum density weight ─────────────────
  //
  //  The heatmap library always normalises weights internally (max → 1.0).
  //  This means a lone report (weight 0.25) looks as bright as a hotspot
  //  unless we also scale the LAYER opacity downward for low-density data.
  //
  //  Weights:  0.25 (1 report) → 0.50 (2) → 0.75 (3) → 1.0 (4+)
  //  Opacity:  0.32            → 0.50      → 0.67      → 0.82
  //
  const heatmapOpacity = useMemo((): number => {
    if (!heatmapPoints.length) return 0;
    const maxW = heatmapPoints.reduce((m, p) => Math.max(m, p.weight), 0);
    // Linear map: 0.25→0.32, 1.0→0.82
    return 0.32 + Math.max(0, maxW - 0.25) * 0.667;
  }, [heatmapPoints]);

  // ── Heatmap radius (small value = less dramatic scaling on zoom out) ─────
  const HEATMAP_RADIUS = 35;



  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation(loc);
          // Pre-set currentRegion to city-zoom before the MapView mounts.
          // animateToRegion is triggered later (see isLoading effect below).
          setCurrentRegion({
            latitude: loc.coords.latitude, longitude: loc.coords.longitude,
            latitudeDelta: 0.15, longitudeDelta: 0.15,
          });
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
    return () => { unsub(); cleanup(); };
  }, []);

  // Load saved emergency contact
  useEffect(() => {
    if (!currentUserId) return;
    getEmergencyContact(currentUserId).then(c => {
      if (c) {
        setEmergencyContact(c);
        setContactNameInput(c.name);
        setContactPhoneInput(c.phone);
      }
    }).catch(() => {});
  }, [currentUserId]);

  // Fly map to user location once the MapView is actually mounted.
  // isLoading=false means the loading screen dismissed and MapView is in the tree.
  // A 200 ms delay gives the native MapView time to finish initializing.
  useEffect(() => {
    if (isLoading || !userLocation) return;
    const t = setTimeout(() => {
      mapRef.current?.animateToRegion({
        latitude:      userLocation.coords.latitude,
        longitude:     userLocation.coords.longitude,
        latitudeDelta: 0.15, longitudeDelta: 0.15,
      }, 800);
    }, 200);
    return () => clearTimeout(t);
  }, [isLoading]); // intentionally only on isLoading — fires once when map appears

  useEffect(() => {
    if (!userLocation || !heatmapPoints.length || isPickMode) return;
    const now = Date.now();
    const COOLDOWN_MS = 30 * 60 * 1000;
    if (now - geofenceAlerted.current < COOLDOWN_MS) return;
    const hotZones = heatmapPoints.filter(p => p.weight >= 0.8);
    for (const zone of hotZones) {
      if (haversineMeters(
        userLocation.coords.latitude, userLocation.coords.longitude,
        zone.latitude, zone.longitude) <= 1000) {
        geofenceAlerted.current = now;
        sendDangerZoneAlert();
        break;
      }
    }
  }, [userLocation, heatmapPoints, isPickMode]);

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

  // ── Search: Photon autocomplete (POI + place aware) ──────────────────────
  //
  // Photon returns OSM POIs ranked by relevance for the query.
  // We do NOT filter by name-contains because many POIs in OSM are stored
  // as e.g. name="Divisional Hospital", city="Dompe" — the typed word appears
  // in the city field, not the name field. Filtering by name alone drops them.
  //
  // Instead: build a display label = "name + city" and show all results,
  // just deduplicated. Photon's own ranking keeps the most relevant on top.
  //
  const fetchSuggestions = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) { setSuggestions([]); return; }
    setIsSearching(true);
    try {
      const q   = encodeURIComponent(trimmed);
      // Sri Lanka bounding box keeps results within the country
      const url = `https://photon.komoot.io/api/?q=${q}&limit=20&bbox=79.6,5.9,81.9,9.8`;
      const res  = await fetch(url, { headers: { 'User-Agent': 'SriSafeSpot/1.0' } });
      const json = await res.json();
      const features: any[] = json.features ?? [];

      const seen    = new Set<string>();
      const results: any[] = [];

      for (const f of features) {
        const p    = f.properties ?? {};
        const name = (p.name ?? '').trim();
        if (!name) continue;

        // Build a full display title. If the OSM name already contains the city
        // (e.g. "Dompe Divisional Hospital") use it as-is. Otherwise prefix the
        // city so user sees context: "Divisional Hospital · Dompe".
        const city    = p.city || p.town || p.village || p.municipality || '';
        const lower   = trimmed.toLowerCase();
        const nameHasQuery = name.toLowerCase().includes(lower);
        const cityHasQuery = city.toLowerCase().includes(lower);

        // Skip results where neither name nor city contains the query at all
        if (!nameHasQuery && !cityHasQuery) continue;

        // Display label: if name already contains city info, just use name;
        // otherwise show "Name · City" so user knows where it is.
        const displayTitle = (nameHasQuery || !city)
          ? name
          : `${name} · ${city}`;

        // Dedup by display title
        const key = displayTitle.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const [lon, lat]  = f.geometry?.coordinates ?? [0, 0];
        const subtitleParts = [city, p.state].filter(Boolean);
        // If we prepended city to title, don't repeat it in subtitle
        const subtitle = nameHasQuery ? subtitleParts.join(', ') : (p.state ?? '');

        results.push({
          display_name: displayTitle,
          lat:      String(lat),
          lon:      String(lon),
          _name:    displayTitle,
          _subtitle: subtitle,
        });
      }

      setSuggestions(results.slice(0, 7));
    } catch { setSuggestions([]); }
    finally { setIsSearching(false); }
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchSuggestions(text), 250);
  }, [fetchSuggestions]);

  const selectSuggestion = useCallback((item: { display_name: string; lat: string; lon: string; _name?: string }) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setSearchText(item._name ?? item.display_name.split(',')[0]);
    setSuggestions([]);
    Keyboard.dismiss();
    setSearchFocused(false);
    snapSheet('mid');
    mapRef.current?.animateToRegion({
      latitude: lat, longitude: lon,
      latitudeDelta: 0.08, longitudeDelta: 0.08,
    }, 800);
    // In pick mode, also drop a pin at the searched location
    if (isPickMode) {
      setPickedCoord({ latitude: lat, longitude: lon });
    }
  }, [snapSheet, isPickMode]);

  const clearSearch = useCallback(() => {
    setSearchText('');
    setSuggestions([]);
  }, []);

  // ── Pick mode: confirm selected location ──────────────────────────────────
  const handlePickConfirm = useCallback(async () => {
    if (!pickedCoord) return;
    setIsReverseGeocoding(true);
    const formParams = [
      savedTitle ? `&savedTitle=${savedTitle}` : '',
      savedDesc  ? `&savedDesc=${savedDesc}`   : '',
      savedCat   ? `&savedCat=${savedCat}`     : '',
    ].join('');
    try {
      const resp = await fetch(
        `https://photon.komoot.io/reverse?lat=${pickedCoord.latitude}&lon=${pickedCoord.longitude}`
      );
      const json = await resp.json();
      const props = json?.features?.[0]?.properties ?? {};
      const addr = [props.name, props.city, props.country].filter(Boolean).join(', ')
        || `${pickedCoord.latitude.toFixed(5)}, ${pickedCoord.longitude.toFixed(5)}`;
      router.replace(
        `/report-incident?pickedLat=${pickedCoord.latitude}&pickedLng=${pickedCoord.longitude}&pickedAddr=${encodeURIComponent(addr)}&mapStyle=${mapType}${formParams}`
      );
    } catch {
      router.replace(
        `/report-incident?pickedLat=${pickedCoord.latitude}&pickedLng=${pickedCoord.longitude}&pickedAddr=${encodeURIComponent(`${pickedCoord.latitude.toFixed(5)}, ${pickedCoord.longitude.toFixed(5)}`)}&mapStyle=${mapType}${formParams}`
      );
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [pickedCoord, router, mapType, savedTitle, savedDesc, savedCat]);

  // ── SOS: emergency contacts ───────────────────────────────────────────────
  const handleSOS = useCallback(() => {
    const options: any[] = [
      { text: '🚓  Police (119)',          onPress: () => Linking.openURL('tel:119') },
      { text: '🏖️  Tourist Police (1912)', onPress: () => Linking.openURL('tel:1912') },
      { text: '🚑  Ambulance (110)',        onPress: () => Linking.openURL('tel:110') },
      { text: '🚒  Fire & Rescue (111)',    onPress: () => Linking.openURL('tel:111') },
    ];
    if (emergencyContact) {
      options.push({
        text: `👤  ${emergencyContact.name} (${emergencyContact.phone})`,
        onPress: () => Linking.openURL('tel:' + emergencyContact.phone),
      });
    }
    options.push({
      text: emergencyContact ? '✏️  Edit Emergency Contact' : '➕  Add Emergency Contact',
      onPress: () => setShowContactModal(true),
    });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('🚨 Emergency Services', 'Select a service to call:', options);
  }, [emergencyContact]);

  const regularIncidents = useMemo(() => incidents.filter(r => r.category !== 'natural_disaster'), [incidents]);
  const disasters        = useMemo(() => incidents.filter(r => r.category === 'natural_disaster'),  [incidents]);

  // User's own reports (for the button count)
  const userReportCount = useMemo(
    () => currentUserId ? incidents.filter(r => r.userId === currentUserId).length : 0,
    [incidents, currentUserId]
  );

  // Risk level counts from heatmap weights
  const riskCounts = useMemo(() => {
    const low = heatmapPoints.filter(p => p.weight <= 0.25).length;
    const med = heatmapPoints.filter(p => p.weight > 0.25 && p.weight <= 0.50).length;
    const hi  = heatmapPoints.filter(p => p.weight > 0.50 && p.weight <= 0.75).length;
    const crit= heatmapPoints.filter(p => p.weight > 0.75).length;
    return { low, med, hi, crit, total: heatmapPoints.length };
  }, [heatmapPoints]);

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

  // ── Incident detail (inside sheet) ───────────────────────────────────────
  const renderIncidentContent = () => {
    if (!selectedReport) return null;
    const cfg = CAT[selectedReport.category] ?? CAT.other;
    return (
      <View style={S.sheetContent}>
        <View style={S.incidentTopRow}>
          <TouchableOpacity onPress={dismissIncident} style={S.backCircle}>
            <ArrowLeft size={16} color="#FFF" />
          </TouchableOpacity>
          <View style={[S.catPill, { borderColor: cfg.color + '80', backgroundColor: cfg.color + '22' }]}>
            <Text style={S.catEmoji}>{cfg.emoji}</Text>
            <Text style={[S.catLabel, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
          </View>
          <View style={[S.sevPill, {
            backgroundColor: cfg.severityLabel === 'HIGH' ? '#7F1D1D88'
              : cfg.severityLabel === 'MEDIUM' ? '#78350F88' : '#14532D88',
          }]}>
            <Text style={[S.sevLabel, {
              color: cfg.severityLabel === 'HIGH' ? '#FCA5A5'
                : cfg.severityLabel === 'MEDIUM' ? '#FCD34D' : '#86EFAC',
            }]}>{cfg.severityLabel}</Text>
          </View>
        </View>
        <Text style={S.incidentTitle}>{selectedReport.title || cfg.label + ' Incident'}</Text>
        <View style={S.metaRow}>
          <View style={S.metaChip}>
            <Clock size={12} color="#94A3B8" />
            <Text style={S.metaText}>{getReportAge(selectedReport.timestamp)}</Text>
          </View>
          <View style={S.metaChip}>
            <MapPin size={12} color="#94A3B8" />
            <Text style={S.metaText}>{selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)}</Text>
          </View>
        </View>
        {selectedReport.description ? (
          <Text style={S.incidentDesc} numberOfLines={3}>{selectedReport.description}</Text>
        ) : null}
        {selectedReport.imageUrl ? (
          <Image source={{ uri: selectedReport.imageUrl }} style={S.incidentImage} resizeMode="cover" />
        ) : null}
        <View style={S.actionRow}>
          <TouchableOpacity style={S.actionBtn} onPress={() => {
            mapRef.current?.animateToRegion({
              latitude: selectedReport.latitude, longitude: selectedReport.longitude,
              latitudeDelta: 0.01, longitudeDelta: 0.01,
            }, 500);
            dismissIncident();
          }}>
            <Target size={14} color={COLORS.primary} />
            <Text style={[S.actionText, { color: COLORS.primary }]}>Focus</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.actionBtn, { borderColor: '#EF444430' }]} onPress={() => {
            flagIncidentReport(selectedReport.id)
              .then(() => { Alert.alert('Flagged', 'Thank you.'); dismissIncident(); })
              .catch(() => Alert.alert('Error', 'Could not flag.'));
          }}>
            <Flag size={14} color="#EF4444" />
            <Text style={[S.actionText, { color: '#EF4444' }]}>Flag</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Default sheet content ─────────────────────────────────────────────────
  const renderDefaultContent = () => (
    <View style={S.sheetContent}>
      {/* Search bar */}
      <View style={[S.searchBar, searchFocused && S.searchBarFocused]}>
        <Search size={16} color={searchFocused ? COLORS.primary : '#8E8E93'} />
        <TextInput
          style={S.searchInput}
          placeholder="Search location…"
          placeholderTextColor="#636366"
          value={searchText}
          onChangeText={handleSearch}
          returnKeyType="search"
          onFocus={() => { setSearchFocused(true); snapSheet('full'); }}
          onBlur={() => { setSearchFocused(false); if (!searchText) snapSheet('mid'); }}
          onSubmitEditing={() => { if (suggestions.length > 0) selectSuggestion(suggestions[0]); }}
        />
        {isSearching
          ? <ActivityIndicator size="small" color={COLORS.primary} />
          : searchText.length > 0
            ? <TouchableOpacity onPress={clearSearch}><X size={14} color="#8E8E93" /></TouchableOpacity>
            : null}
      </View>

      {/* Suggestions list */}
      {searchFocused && suggestions.length > 0 ? (
        <View style={S.suggestionList}>
          {suggestions.map((item, i) => {
            const title    = item._name ?? item.display_name;
            const subtitle = item._subtitle ?? '';
            return (
              <TouchableOpacity key={i} style={[S.suggestionItem, i < suggestions.length - 1 && S.suggestionBorder]}
                onPress={() => selectSuggestion(item)}>
                <MapPin size={14} color="#8E8E93" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={S.suggestionTitle} numberOfLines={1}>{title}</Text>
                  {subtitle ? <Text style={S.suggestionSub} numberOfLines={1}>{subtitle}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : searchFocused ? (
        /* When focused but no results yet — show hint */
        <Text style={S.searchHint}>Type a place name in Sri Lanka…</Text>
      ) : (
        <>
          {/* Divider */}
          <View style={S.divider} />

          {/* Layer toggles row */}
          <Text style={S.sectionLabel}>LAYERS</Text>
          <View style={S.layerRow}>
            {[
              { icon: <ThermometerSun size={17} color={showHeatmap    ? '#FF6B6B' : '#8E8E93'} />, label: 'Heatmap',   active: showHeatmap,    toggle: toggleHeatmap    },
              { icon: <AlertTriangle  size={17} color={showIncidents  ? '#F97316' : '#8E8E93'} />, label: 'Incidents', active: showIncidents,  toggle: toggleIncidents  },
              { icon: <AlertCircle   size={17} color={showDisasters   ? '#3B82F6' : '#8E8E93'} />, label: 'Disasters', active: showDisasters,  toggle: toggleDisasters  },
              { icon: <Shield        size={17} color={showSafePlaces  ? COLORS.success : '#8E8E93'} />, label: 'Safe', active: showSafePlaces, toggle: toggleSafePlaces },
            ].map(item => (
              <TouchableOpacity key={item.label} style={[S.layerBtn, item.active && S.layerBtnOn]} onPress={item.toggle}>
                {item.icon}
                <Text style={[S.layerLabel, item.active && S.layerLabelOn]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Map style row */}
          <Text style={[S.sectionLabel, { marginTop: 10 }]}>MAP STYLE</Text>
          <View style={S.layerRow}>
            {([
              { label: 'Standard',  value: 'standard'  as const, color: '#94A3B8' },
              { label: 'Satellite', value: 'satellite' as const, color: '#A78BFA' },
              { label: 'Dark',      value: 'dark'      as const, color: '#38BDF8' },
            ] as const).map(item => (
              <TouchableOpacity
                key={item.label}
                style={[S.layerBtn, mapType === item.value && S.layerBtnOn]}
                onPress={() => setMapType(item.value)}>
                <Layers size={17} color={mapType === item.value ? item.color : '#8E8E93'} />
                <Text style={[S.layerLabel, mapType === item.value && { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={S.divider} />

          {/* ── Submitted Reports button ── */}
          <TouchableOpacity
            style={S.reportsBtn}
            activeOpacity={0.8}
            onPress={() => { snapSheet('peek'); router.push('/report-history'); }}>
            <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={S.reportsBtnTint} />
            <View style={S.reportsBtnInner}>
              <View style={S.reportsBadge}>
                <Text style={S.reportsBadgeText}>{userReportCount}</Text>
              </View>
              <Text style={S.reportsBtnLabel}>Submitted Reports</Text>
            </View>
            <Text style={S.reportsBtnChevron}>›</Text>
          </TouchableOpacity>

          {/* ── Heatmap Colour Legend ── */}
          <View style={S.riskSection}>
            <Text style={S.sectionLabel}>HEATMAP COLOUR GUIDE</Text>
            {/* Gradient bar matching the actual heatmap colours */}
            <LinearGradient
              colors={['#2ecc71', '#f1c40f', '#ff4005', '#ff0000']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: 10, borderRadius: 5, marginBottom: 10 }}
            />
            <View style={S.riskLegend}>
              {[
                { color: '#2ecc71', label: '1 incident\n(Stay Aware)' },
                { color: '#f1c40f', label: '2 nearby\n(Be Cautious)' },
                { color: '#ff4005', label: '3 nearby\n(Limit Exposure)' },
                { color: '#ff0000', label: '4+ nearby\n(Avoid Area)' },
              ].map(({ color, label }) => (
                <View key={label} style={S.riskItem}>
                  <View style={[S.riskDot, { backgroundColor: color }]} />
                  <Text style={S.riskText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Weather alert row */}
          {weatherAlert && (
            <View style={S.weatherRow}>
              <CloudLightning size={14} color="#93C5FD" />
              <Text style={S.weatherText}>{weatherAlert}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={S.container}>
      <StatusBar barStyle={mapType === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* ══ FULLSCREEN MAP ══════════════════════════════════════════════════ */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        mapType={mapType === 'dark' ? 'standard' : mapType}
        customMapStyle={mapType === 'dark' ? DARK_MAP_STYLE : undefined}
        userInterfaceStyle={mapType === 'dark' ? 'dark' : 'light'}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        onMapReady={() => setMapReady(true)}
        onRegionChangeComplete={setCurrentRegion}
        onPress={isPickMode ? (e: MapPressEvent) => setPickedCoord(e.nativeEvent.coordinate) : undefined}
      >
        {/* ── HEATMAP LAYER ─────────────────────────────────────────────────── */}
        {mapReady && showHeatmap && heatmapPoints.length > 0 && (
          <Heatmap
            key="safespot-heatmap"
            points={heatmapPoints}
            radius={HEATMAP_RADIUS}
            opacity={heatmapOpacity}
            gradient={{
              colors:       ['rgba(0,0,0,0)', '#2ecc71', '#f1c40f', '#ff4005', '#ff0000'],
              startPoints:  [0.0,              0.05,      0.30,      0.55,      0.65],
              colorMapSize: 256,
            }}
          />
        )}
        {showIncidents && regularIncidents.map(report => {
          const cfg     = CAT[report.category] ?? CAT.other;
          const CatIcon = ICON_MAP[report.category] ?? MapPin;
          return (
            <Marker
              key={report.id}
              coordinate={{ latitude: report.latitude, longitude: report.longitude }}
              onPress={() => onMarkerPress(report)}
              anchor={{ x: 0.5, y: 1.0 }}
              tracksViewChanges={false}
              zIndex={10}>
              <View style={S.pinWrap}>
                <View style={[S.pinHead, { backgroundColor: cfg.color }]}>
                  <CatIcon size={12} color="#FFF" strokeWidth={2.5} />
                </View>
                <View style={[S.pinTail, { borderTopColor: cfg.color }]} />
              </View>
            </Marker>
          );
        })}
        {showDisasters && disasters.map(report => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            onPress={() => onMarkerPress(report)}
            anchor={{ x: 0.5, y: 1.0 }}
            tracksViewChanges={false}
            zIndex={11}>
            <View style={S.pinWrap}>
              <View style={[S.pinHead, { backgroundColor: '#2563EB' }]}>
                <CloudLightning size={12} color="#FFF" strokeWidth={2.5} />
              </View>
              <View style={[S.pinTail, { borderTopColor: '#2563EB' }]} />
            </View>
          </Marker>
        ))}
        {showSafePlaces && SAFE_PLACES.map(place => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            anchor={{ x: 0.5, y: 1.0 }}
            tracksViewChanges={false}
            zIndex={5}
            onPress={() => { setSelectedPlace(place); setSelectedReport(null); }}>
            <View style={S.pinWrap}>
              <View style={[S.pinHead, { backgroundColor: '#10B981' }]}>
                <Shield size={12} color="#FFF" strokeWidth={2.5} />
              </View>
              <View style={[S.pinTail, { borderTopColor: '#10B981' }]} />
            </View>
          </Marker>
        ))}
        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude }}
            anchor={{ x: 0.5, y: 0.5 }} flat tracksViewChanges={false} zIndex={20}>
            <View style={S.userLocWrap}>
              <Animated.View style={[S.userPulse, {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({ inputRange: [1, 2], outputRange: [0.4, 0] }),
              }]} />
              <View style={S.userDot} />
            </View>
          </Marker>
        )}

        {/* ── Pick mode: draggable red pin ── */}
        {isPickMode && pickedCoord && (
          <Marker
            coordinate={pickedCoord}
            anchor={{ x: 0.5, y: 1.0 }}
            draggable
            onDragEnd={e => setPickedCoord(e.nativeEvent.coordinate)}
            tracksViewChanges={false}
            zIndex={30}>
            <View style={S.pinWrap}>
              <View style={[S.pinHead, { backgroundColor: '#EF4444', borderColor: '#FFF' }]}>
                <MapPin size={13} color="#FFF" strokeWidth={2.5} />
              </View>
              <View style={[S.pinTail, { borderTopColor: '#EF4444' }]} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ══ TOP-LEFT: Back button ════════════════════════════════════════════ */}
      <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
        <BlurView intensity={90} tint="dark" style={S.darkCircle}>
          <ArrowLeft size={17} color="#FFF" />
        </BlurView>
      </TouchableOpacity>

      {/* ══ RIGHT CONTROLS + FABs — hidden in pick mode ══════════════════════ */}
      {!isPickMode && (
        <Animated.View style={[S.rightControls, {
          bottom: SHEET_H_TOTAL + 24,
          transform: [{ translateY: sheetY }],
          opacity: sheetY.interpolate({
            inputRange: [0, 150, SHEET_H_TOTAL - SHEET_PEEK],
            outputRange: [0, 1, 1],
            extrapolate: 'clamp',
          }),
        }]}>
          {/* Locate button */}
          <View style={S.controlPill}>
            <BlurView intensity={100} tint="dark" style={S.controlPillBlur}>
              <TouchableOpacity style={S.ctrlBtn} onPress={centerOnUser}>
                <Navigation size={18} color="#FFF" />
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* SOS FAB */}
          <TouchableOpacity onPress={handleSOS} activeOpacity={0.85}>
            <LinearGradient colors={['#FF8C00', '#FF4757']} style={S.sosFab}>
              <Text style={S.sosEmoji}>🚨</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Report FAB */}
          <TouchableOpacity onPress={() => router.push(`/report-incident?mapStyle=${mapType}`)} activeOpacity={0.85}>
            <LinearGradient colors={['#EF4444', '#DC2626']} style={S.reportFab}>
              <AlertTriangle size={21} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ══ APPLE MAPS BOTTOM SHEET — hidden in pick mode ════════════════════ */}
      {!isPickMode && (
        <Animated.View {...sheetPan.panHandlers} style={[S.sheet, { height: SHEET_H_TOTAL, transform: [{ translateY: sheetY }] }]}>
          {/* BlurView gives the frosted-glass effect — fills the Animated.View fully */}
          <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFillObject} />
        {/* Tint overlay on top of blur for depth */}
        <View style={S.sheetTint} />
        {/* Drag handle */}
        <View style={S.handleZone}>
          <View style={S.handle} />
        </View>

        {selectedReport ? renderIncidentContent() : renderDefaultContent()}
      </Animated.View>
      )}

      {/* ══ PICK MODE UI ═════════════════════════════════════════════════════ */}
      {isPickMode && (
        <>
          {/* Search bar in pick mode */}
          <View style={S.pickSearchWrap}>
            <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={S.pickSearchTint} />
            <View style={[S.searchBar, searchFocused && S.searchBarFocused]}>
              <Search size={16} color={searchFocused ? '#10B981' : '#8E8E93'} />
              <TextInput
                style={S.searchInput}
                placeholder="Search location to drop pin…"
                placeholderTextColor="#636366"
                value={searchText}
                onChangeText={handleSearch}
                returnKeyType="search"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onSubmitEditing={() => { if (suggestions.length > 0) selectSuggestion(suggestions[0]); }}
              />
              {isSearching
                ? <ActivityIndicator size="small" color="#10B981" />
                : searchText.length > 0
                  ? <TouchableOpacity onPress={clearSearch}><X size={14} color="#8E8E93" /></TouchableOpacity>
                  : null}
            </View>
            {searchFocused && suggestions.length > 0 && (
              <View style={S.suggestionList}>
                {suggestions.map((item, i) => (
                  <TouchableOpacity key={i}
                    style={[S.suggestionItem, i < suggestions.length - 1 && S.suggestionBorder]}
                    onPress={() => selectSuggestion(item)}>
                    <MapPin size={14} color="#8E8E93" />
                    <Text style={S.suggestionTitle} numberOfLines={1}>
                      {item._name ?? item.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Instruction */}
          {!pickedCoord && !searchFocused && (
            <View style={S.pickHintWrap}>
              <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
              <Text style={S.pickHintText}>👆 Tap anywhere on the map to drop a pin</Text>
            </View>
          )}

          {/* Confirm bar — appears when a pin is dropped */}
          {pickedCoord && (
            <View style={S.pickConfirmBar}>
              <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View style={S.pickConfirmTint} />
              <View style={{ flex: 1 }}>
                <Text style={S.pickConfirmTitle}>Location selected</Text>
                <Text style={S.pickConfirmCoord}>
                  {pickedCoord.latitude.toFixed(5)}, {pickedCoord.longitude.toFixed(5)}
                </Text>
                <Text style={S.pickConfirmHint}>Drag the pin to fine-tune</Text>
              </View>
              <TouchableOpacity
                style={[S.pickConfirmBtn, isReverseGeocoding && { opacity: 0.6 }]}
                onPress={handlePickConfirm}
                disabled={isReverseGeocoding}
                activeOpacity={0.8}>
                {isReverseGeocoding
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <>
                      <Check size={16} color="#FFF" />
                      <Text style={S.pickConfirmBtnText}>Use Location</Text>
                    </>}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* ══ SAFE PLACE POPUP ════════════════════════════════════════════════ */}
      {selectedPlace && (
        <>
          {/* Full-screen dismiss tap area behind the card */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setSelectedPlace(null)}
          />
          <View style={S.spOverlay}>
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={S.spTint} />
            <View style={S.spHighlight} />
            {/* Close */}
            <TouchableOpacity style={S.spClose} onPress={() => setSelectedPlace(null)}>
              <X size={16} color="#CBD5E1" />
            </TouchableOpacity>
            {/* Type pill */}
            <View style={S.spTypePill}>
              <Shield size={11} color="#10B981" strokeWidth={2.5} />
              <Text style={S.spTypeText}>{SAFE_TYPE_LABEL[selectedPlace.type] ?? 'Safe Place'}</Text>
            </View>
            {/* Name */}
            <Text style={S.spName}>{selectedPlace.name}</Text>
            {/* Address */}
            {selectedPlace.address ? (
              <View style={S.spRow}>
                <MapPin size={12} color="#64748B" />
                <Text style={S.spAddr} numberOfLines={2}>{selectedPlace.address}</Text>
              </View>
            ) : null}
            {/* Phone */}
            {selectedPlace.phone ? (
              <TouchableOpacity style={S.spPhoneBtn} onPress={() => {
                Alert.alert(
                  'Call ' + selectedPlace.name + '?',
                  selectedPlace.phone,
                  [
                    { text: 'Call', onPress: () => Linking.openURL('tel:' + selectedPlace.phone) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}>
                <Phone size={14} color="#10B981" />
                <Text style={S.spPhoneText}>{selectedPlace.phone}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      )}

      {/* ══ EMERGENCY CONTACT MODAL ═════════════════════════════════════════ */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowContactModal(false)}
          />
          <View style={S.contactSheet}>
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={S.contactTint} />
            <View style={S.contactHandle} />
            <Text style={S.contactTitle}>
              {emergencyContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </Text>
            <Text style={S.contactSubtitle}>
              This contact will appear in your SOS menu for quick access.
            </Text>
            <Text style={S.inputLabel}>Name</Text>
            <View style={S.inputWrap}>
              <TextInput
                style={S.contactInput}
                placeholder="e.g. Mum, Dad, Friend…"
                placeholderTextColor="#475569"
                value={contactNameInput}
                onChangeText={setContactNameInput}
                returnKeyType="next"
                autoCapitalize="words"
              />
            </View>
            <Text style={S.inputLabel}>Phone Number</Text>
            <View style={S.inputWrap}>
              <Phone size={15} color="#10B981" />
              <TextInput
                style={[S.contactInput, { flex: 1, marginLeft: 8 }]}
                placeholder="+94 77 000 0000"
                placeholderTextColor="#475569"
                value={contactPhoneInput}
                onChangeText={setContactPhoneInput}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              style={[S.saveContactBtn, (savingContact || !contactNameInput.trim() || !contactPhoneInput.trim()) && { opacity: 0.5 }]}
              disabled={savingContact || !contactNameInput.trim() || !contactPhoneInput.trim()}
              activeOpacity={0.8}
              onPress={async () => {
                if (!currentUserId) { Alert.alert('Not signed in', 'Please sign in to save a contact.'); return; }
                setSavingContact(true);
                try {
                  const c = { name: contactNameInput.trim(), phone: contactPhoneInput.trim() };
                  await saveEmergencyContact(currentUserId, c);
                  setEmergencyContact(c);
                  setShowContactModal(false);
                } catch { Alert.alert('Error', 'Could not save contact.'); }
                finally { setSavingContact(false); }
              }}>
              {savingContact
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={S.saveContactText}>Save Contact</Text>}
            </TouchableOpacity>
            {emergencyContact && (
              <TouchableOpacity style={S.removeContactBtn} onPress={() => {
                Alert.alert('Remove Contact?', '', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: async () => {
                    if (!currentUserId) return;
                    await saveEmergencyContact(currentUserId, { name: '', phone: '' }).catch(() => {});
                    setEmergencyContact(null); setContactNameInput(''); setContactPhoneInput('');
                    setShowContactModal(false);
                  }},
                ]);
              }}>
                <Text style={S.removeContactText}>Remove Contact</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // ── Container / Loading ─────────────────────────────────────────────────
  container:        { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  loadingText:      { color: '#94A3B8', marginTop: 14, fontSize: 15, fontFamily: 'Poppins-Medium' },

  // ── Back button ──────────────────────────────────────────────────────────
  backBtn: {
    position: 'absolute', top: SAFE_TOP, left: 16,
    width: 40, height: 40, borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  darkCircle: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },

  // ── Right controls + FABs (moves with sheet via translateY) ─────────────
  rightControls: {
    position: 'absolute',
    right: 16,
    // bottom set dynamically via inline style (SHEET_H_TOTAL + 24)
    gap: 12,
    alignItems: 'center',
  },
  controlPill: {
    borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  controlPillBlur: {
    borderRadius: 24,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  ctrlBtn:  { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  ctrlSep:  { height: 0.5, marginHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  sosFab: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF8C00', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
  sosEmoji: { fontSize: 20 },
  reportFab: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55, shadowRadius: 12, elevation: 10,
  },

  // ── Bottom Sheet ─────────────────────────────────────────────────────────
  sheet: {
    position: 'absolute', bottom: 12, left: 12, right: 12,
    backgroundColor: 'transparent',
    borderRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.55, shadowRadius: 24, elevation: 30,
    overflow: 'hidden',
  },
  sheetTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,8,14,0.12)',
    borderRadius: 28,
  },
  handleZone: {
    width: '100%', paddingTop: 6, paddingBottom: 2, alignItems: 'center',
  },
  handle: {
    width: 32, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sheetContent: { paddingHorizontal: 16, paddingTop: 4 },

  // ── Search bar ───────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11,
    gap: 10, marginBottom: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  searchBarFocused: {
    borderColor: 'rgba(99,102,241,0.5)',
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  searchInput: {
    flex: 1, color: '#F1F5F9', fontSize: 15,
    fontFamily: 'Poppins-Regular', paddingVertical: 0,
  },

  // ── Suggestions ──────────────────────────────────────────────────────────
  suggestionList: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  suggestionBorder: {
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  suggestionTitle: { color: '#F1F5F9', fontSize: 14, fontFamily: 'Poppins-Medium' },
  suggestionSub:   { color: '#64748B', fontSize: 11, fontFamily: 'Poppins-Regular', marginTop: 1 },
  searchHint:      { color: '#4B5563', fontSize: 13, fontFamily: 'Poppins-Regular', textAlign: 'center', marginTop: 8 },

  // ── Divider ──────────────────────────────────────────────────────────────
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 14 },

  // ── Layer toggles ────────────────────────────────────────────────────────
  sectionLabel: {
    color: '#4B5563', fontSize: 10, fontFamily: 'Poppins-SemiBold',
    letterSpacing: 1, marginBottom: 10,
  },
  layerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  layerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  layerBtnOn: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  layerLabel:   { color: '#6B7280', fontSize: 12, fontFamily: 'Poppins-Medium' },
  layerLabelOn: { color: '#F1F5F9' },

  // ── Weather row ──────────────────────────────────────────────────────────
  weatherRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 10,
    padding: 10, marginTop: 4,
    borderWidth: 0.5, borderColor: 'rgba(59,130,246,0.3)',
  },
  weatherText: { flex: 1, color: '#93C5FD', fontSize: 12, fontFamily: 'Poppins-Medium' },

  // ── Incident detail ───────────────────────────────────────────────────────
  incidentTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  backCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 16, borderWidth: 1,
  },
  catEmoji:  { fontSize: 13 },
  catLabel:  { fontSize: 10, fontFamily: 'Poppins-Bold' },
  sevPill:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 'auto' },
  sevLabel:  { fontSize: 10, fontFamily: 'Poppins-Bold' },
  incidentTitle: {
    color: '#F1F5F9', fontSize: 17, fontFamily: 'Poppins-Bold', marginBottom: 8,
  },
  metaRow:  { flexDirection: 'row', gap: 14, marginBottom: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#64748B', fontSize: 11, fontFamily: 'Poppins-Regular' },
  incidentDesc: {
    color: '#94A3B8', fontSize: 13, fontFamily: 'Poppins-Regular',
    lineHeight: 20, marginBottom: 14,
  },
  incidentImage: {
    width: '100%', height: 160, borderRadius: 12, marginBottom: 14,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)',
  },
  actionText: { fontSize: 13, fontFamily: 'Poppins-SemiBold' },

  // ── Map markers (teardrop pin: circle head + triangular tail) ────────────
  pinWrap: {
    alignItems: 'center',
  },
  pinHead: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.40, shadowRadius: 4, elevation: 6,
  },
  pinTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },

  // ── User location ────────────────────────────────────────────────────────
  userLocWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  userPulse: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#3B82F6',
  },
  userDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#3B82F6', borderWidth: 3, borderColor: '#FFF',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 8, elevation: 6,
  },

  // ── Safe Place popup ─────────────────────────────────────────────────────
  spOverlay: {
    position: 'absolute',
    bottom: 78,
    left: 16, right: 16,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 18,
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.26)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6, shadowRadius: 28, elevation: 18,
  },
  spTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,16,34,0.15)',
  },
  spHighlight: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  spClose: {
    position: 'absolute', top: 14, right: 14,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center', alignItems: 'center',
  },
  spTypePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 9, paddingVertical: 4,
    marginBottom: 8,
  },
  spTypeText: { color: '#10B981', fontSize: 11, fontFamily: 'Poppins-SemiBold', letterSpacing: 0.6 },
  spName: { color: '#F1F5F9', fontSize: 17, fontFamily: 'Poppins-SemiBold', marginBottom: 8, paddingRight: 28 },
  spRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 12 },
  spAddr: { color: '#94A3B8', fontSize: 12, fontFamily: 'Poppins-Regular', flex: 1, lineHeight: 18 },
  spPhoneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 14, paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  spPhoneText: { color: '#10B981', fontSize: 14, fontFamily: 'Poppins-SemiBold' },

  // ── Submitted Reports button ─────────────────────────────────────────────
  reportsBtn: {
    marginHorizontal: 2, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.22)',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 4,
  },
  reportsBtnTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,185,129,0.10)' },
  reportsBtnInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportsBadge: {
    minWidth: 26, height: 26, borderRadius: 13,
    backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6,
  },
  reportsBadgeText: { color: '#FFF', fontSize: 12, fontFamily: 'Poppins-SemiBold' },
  reportsBtnLabel: { color: '#F1F5F9', fontSize: 14, fontFamily: 'Poppins-SemiBold' },
  reportsBtnChevron: { color: '#64748B', fontSize: 20, fontFamily: 'Poppins-Regular', lineHeight: 24 },

  // ── Heatmap colour legend ────────────────────────────────────────────────
  riskSection: { marginTop: 10, marginBottom: 4 },
  riskLegend: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  riskItem: { alignItems: 'center', gap: 4, flex: 1 },
  riskDot: { width: 10, height: 10, borderRadius: 5 },
  riskText: { color: '#94A3B8', fontSize: 10, fontFamily: 'Poppins-Regular', textAlign: 'center' },

  // ── Emergency contact modal ──────────────────────────────────────────────
  contactSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
    borderTopWidth: 1.2, borderColor: 'rgba(255,255,255,0.22)',
  },
  contactTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.20)' },
  contactHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center', marginBottom: 20,
  },
  contactTitle: { color: '#F1F5F9', fontSize: 18, fontFamily: 'Poppins-SemiBold', marginBottom: 4 },
  contactSubtitle: { color: '#64748B', fontSize: 13, fontFamily: 'Poppins-Regular', marginBottom: 20, lineHeight: 19 },
  inputLabel: { color: '#94A3B8', fontSize: 12, fontFamily: 'Poppins-SemiBold', letterSpacing: 0.5, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 16,
  },
  contactInput: { color: '#F1F5F9', fontSize: 15, fontFamily: 'Poppins-Regular', width: '100%' },
  saveContactBtn: {
    backgroundColor: '#10B981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 4, marginBottom: 10,
  },
  saveContactText: { color: '#FFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
  removeContactBtn: { alignItems: 'center', paddingVertical: 8 },
  removeContactText: { color: '#EF4444', fontSize: 13, fontFamily: 'Poppins-Regular' },

  // ── Pick mode ─────────────────────────────────────────────────────────────
  pickSearchWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  pickSearchTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.18)' },
  pickHintWrap: {
    position: 'absolute',
    top: SAFE_TOP + 56,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  pickHintText: { color: '#F1F5F9', fontSize: 14, fontFamily: 'Poppins-Medium' },
  pickConfirmBar: {
    position: 'absolute',
    bottom: 120,   // above the search bar
    left: 16, right: 16,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  pickConfirmTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.18)' },
  pickConfirmTitle: { color: '#F1F5F9', fontSize: 13, fontFamily: 'Poppins-SemiBold', marginBottom: 1 },
  pickConfirmCoord: { color: '#94A3B8', fontSize: 11, fontFamily: 'Poppins-Regular', marginBottom: 2 },
  pickConfirmHint: { color: '#475569', fontSize: 10, fontFamily: 'Poppins-Regular' },
  pickConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#10B981', borderRadius: 13,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  pickConfirmBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Poppins-SemiBold' },
});
