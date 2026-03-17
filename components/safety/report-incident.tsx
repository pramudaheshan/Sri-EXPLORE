// @ts-nocheck
// ==========================================
// SriSafeSpot - Report Incident Screen
// Dark glassmorphism theme matching safety-map
// GPS auto-capture + Photon address search
// No per-user limit — multiple reports allowed
// ==========================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  Animated,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  Camera,
  Navigation,
  CheckCircle,
  FileText,
  Tag,
  Image as ImageIcon,
  Clock,
  Send,
  X,
  Search,
} from 'lucide-react-native';

import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import {
  submitIncidentReport,
  INCIDENT_CATEGORIES,
  IncidentCategory,
  getCurrentUserId,
} from '../../services/incidentService';
import { storage } from '../../services/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const { width } = Dimensions.get('window');
const SAFE_TOP = Platform.OS === 'ios' ? 54 : 36;

// ── Photon place-search suggestion type ──────────────────────────────────────
interface PhotonResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function ReportIncidentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pickedLat?: string; pickedLng?: string; pickedAddr?: string; mapStyle?: string; savedTitle?: string; savedDesc?: string; savedCat?: string }>();

  // ── Form State ───────────────────────────────────────────────────────────
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]       = useState<IncidentCategory | null>(null);
  const [imageUri, setImageUri]       = useState<string | null>(null);

  // ── Location State ───────────────────────────────────────────────────────
  const [latitude, setLatitude]       = useState<number | null>(null);
  const [longitude, setLongitude]     = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locLoading, setLocLoading]   = useState(false);

  // ── Photon search ────────────────────────────────────────────────────────
  const [searchText, setSearchText]         = useState('');
  const [isSearching, setIsSearching]       = useState(false);
  const [suggestions, setSuggestions]       = useState<PhotonResult[]>([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Submit State ─────────────────────────────────────────────────────────
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  // ── Animations ───────────────────────────────────────────────────────────
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(40)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  // ── On mount: animate in + auto-capture GPS (skip if picked coords exist) ──
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();
    const hasPicked = isFinite(parseFloat(params.pickedLat ?? ''));
    if (!hasPicked) captureGPS();
  }, []);

  // ── When safety-map returns picked coordinates ───────────────────────────
  useEffect(() => {
    const lat = parseFloat(params.pickedLat ?? '');
    const lng = parseFloat(params.pickedLng ?? '');
    if (isFinite(lat) && isFinite(lng)) {
      setLatitude(lat);
      setLongitude(lng);
      setLocationName(params.pickedAddr ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setSearchText(params.pickedAddr ?? '');
    }
  }, [params.pickedLat, params.pickedLng, params.pickedAddr]);

  // ── Restore form state from pick-on-map round-trip ─────────────────────
  useEffect(() => {
    if (params.savedTitle) setTitle(decodeURIComponent(params.savedTitle));
    if (params.savedDesc) setDescription(decodeURIComponent(params.savedDesc));
    if (params.savedCat) setCategory(decodeURIComponent(params.savedCat) as IncidentCategory);
  }, []);

  // ── GPS ──────────────────────────────────────────────────────────────────
  const captureGPS = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Location access is needed to tag the incident.');
        setLocLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      setLatitude(lat);
      setLongitude(lng);
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (place) {
          const parts = [place.street, place.city, place.region].filter(Boolean);
          const name = parts.join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setLocationName(name);
          setSearchText(name);
        }
      } catch { setLocationName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
    } catch {
      Alert.alert('GPS Error', 'Could not get your location. Try searching below or pick on map.');
    }
    setLocLoading(false);
  };

  // ── Photon search (same API as safety-map.tsx) ───────────────────────────
  const fetchSuggestions = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) { setSuggestions([]); return; }
    setIsSearching(true);
    try {
      const q   = encodeURIComponent(trimmed);
      const url = `https://photon.komoot.io/api/?q=${q}&limit=10&bbox=79.6,5.9,81.9,9.8`;
      const res  = await fetch(url, { headers: { 'User-Agent': 'SriSafeSpot/1.0' } });
      const json = await res.json();
      const features: any[] = json.features ?? [];
      const seen = new Set<string>();
      const results: PhotonResult[] = [];
      for (const f of features) {
        const p = f.properties ?? {};
        const [lon, lat] = f.geometry?.coordinates ?? [null, null];
        if (lat == null || lon == null) continue;
        const parts = [p.name, p.city ?? p.town ?? p.village, p.county].filter(Boolean);
        const display_name = parts.join(', ') || `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
        if (!seen.has(display_name)) {
          seen.add(display_name);
          results.push({ display_name, lat: String(lat), lon: String(lon) });
        }
      }
      setSuggestions(results);
    } catch { setSuggestions([]); }
    setIsSearching(false);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchSuggestions(text), 300);
  }, [fetchSuggestions]);

  const selectSuggestion = useCallback((item: PhotonResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setLatitude(lat);
    setLongitude(lng);
    setLocationName(item.display_name);
    setSearchText(item.display_name);
    setSuggestions([]);
  }, []);

  // ── Pick on main map ─────────────────────────────────────────────────────
  const pickOnMap = useCallback(() => {
    const ms = params.mapStyle ? `&mapStyle=${params.mapStyle}` : '';
    const st = title ? `&savedTitle=${encodeURIComponent(title)}` : '';
    const sd = description ? `&savedDesc=${encodeURIComponent(description)}` : '';
    const sc = category ? `&savedCat=${encodeURIComponent(category)}` : '';
    router.replace(`/safety-map?pick=1${ms}${st}${sd}${sc}`);
  }, [router, params.mapStyle, title, description, category]);

  // ── Image picker ─────────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7, allowsEditing: true, aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled && result.assets.length > 0) setImageUri(result.assets[0].uri);
  };

  // ── Upload to Firebase Storage ───────────────────────────────────────────
  const uploadIncidentImage = async (uri: string, userId: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `${userId}_${Date.now()}.jpg`;
    const ref = storageRef(storage, `safespot_incidents/${userId}/${filename}`);
    await uploadBytes(ref, blob);
    return getDownloadURL(ref);
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!title.trim())           return 'Please enter an incident title.';
    if (!description.trim())     return 'Please describe the incident.';
    if (!category)               return 'Please select an incident category.';
    if (!latitude || !longitude) return 'Location is required. Use GPS, search, or pick on map.';
    return null;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validate();
    if (err) { Alert.alert('Missing Information', err); return; }
    setSubmitting(true);
    try {
      let uploadedImageUrl: string | null = null;
      if (imageUri) {
        try { uploadedImageUrl = await uploadIncidentImage(imageUri, getCurrentUserId()); }
        catch (e) { console.warn('[SafeSpot] Image upload failed:', e); }
      }
      await submitIncidentReport({
        title, description, category: category!,
        latitude: latitude!, longitude: longitude!,
        locationName, userId: getCurrentUserId(), imageUrl: uploadedImageUrl,
      });
      setSubmitted(true);
      Animated.spring(successScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
    } catch (e) {
      console.error('Submit error:', e);
      Alert.alert('Submission Failed', 'Could not submit. Check your internet connection.');
    }
    setSubmitting(false);
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <View style={S.container}>
        <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[S.successContainer, { transform: [{ scale: successScale }] }]}>
          <LinearGradient colors={['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.05)']} style={S.successCard}>
            <View style={S.successIconWrapper}>
              <LinearGradient colors={['#10B981', '#059669']} style={S.successIconBg}>
                <CheckCircle size={40} color="#FFF" />
              </LinearGradient>
            </View>
            <Text style={S.successTitle}>Report Submitted!</Text>
            <Text style={S.successSubtitle}>
              Thank you for keeping Sri Lanka safe. Your report has been saved and will help warn other tourists.
            </Text>
            <TouchableOpacity
              style={S.successBtn}
              onPress={() => {
                setSubmitted(false); setTitle(''); setDescription('');
                setCategory(null); setImageUri(null); setLatitude(null);
                setLongitude(null); setLocationName(''); setSearchText('');
                successScale.setValue(0); captureGPS();
              }}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={S.successBtnGrad}>
                <Text style={S.successBtnText}>Submit Another Report</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[S.successBtn, { marginTop: 10 }]} onPress={() => router.back()}>
              <LinearGradient colors={['#334155', '#1E293B']} style={S.successBtnGrad}>
                <Text style={S.successBtnText}>Back to SafeSpot Map</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  // ── Main Form ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={S.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <BlurView intensity={80} tint="dark" style={S.backBtnBlur}>
            <ArrowLeft size={18} color="#FFF" />
          </BlurView>
        </TouchableOpacity>
        <View style={S.headerTitle}>
          <Text style={S.headerText}>Report Incident</Text>
          <Text style={S.headerSub}>Help keep tourists safe in Sri Lanka</Text>
        </View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={S.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* ── Title ── */}
        <BlurView intensity={85} tint="dark" style={S.card}>
          <View style={S.fieldHeader}>
            <FileText size={16} color="#20B2AA" />
            <Text style={S.fieldLabel}>Incident Title</Text>
            <Text style={S.required}>*</Text>
          </View>
          <TextInput
            style={S.textInput}
            placeholder="e.g. Bag snatching near Galle Fort"
            placeholderTextColor="#475569"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </BlurView>

        {/* ── Category ── */}
        <BlurView intensity={85} tint="dark" style={S.card}>
          <View style={S.fieldHeader}>
            <Tag size={16} color="#20B2AA" />
            <Text style={S.fieldLabel}>Category</Text>
            <Text style={S.required}>*</Text>
          </View>
          <View style={S.categoryGrid}>
            {INCIDENT_CATEGORIES.map(cat => {
              const selected = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    S.categoryChip,
                    selected && { backgroundColor: cat.color + '28', borderColor: cat.color + '80' },
                  ]}
                  onPress={() => setCategory(cat.value)}
                  activeOpacity={0.75}
                >
                  <Text style={S.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[S.categoryLabel, selected && { color: '#FFF', fontWeight: '600' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>

        {/* ── Description ── */}
        <BlurView intensity={85} tint="dark" style={S.card}>
          <View style={S.fieldHeader}>
            <AlertTriangle size={16} color="#20B2AA" />
            <Text style={S.fieldLabel}>Description</Text>
            <Text style={S.required}>*</Text>
          </View>
          <TextInput
            style={[S.textInput, S.textArea]}
            placeholder="Describe what happened, when, how, and any details that could help other tourists..."
            placeholderTextColor="#475569"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={600}
          />
          <Text style={S.charCount}>{description.length}/600</Text>
        </BlurView>

        {/* ── Location ── */}
        <BlurView intensity={85} tint="dark" style={S.card}>
          <View style={S.fieldHeader}>
            <MapPin size={16} color="#20B2AA" />
            <Text style={S.fieldLabel}>Location</Text>
            <Text style={S.required}>*</Text>
          </View>

          {/* GPS status pill */}
          {locLoading ? (
            <View style={S.locPill}>
              <ActivityIndicator size="small" color="#20B2AA" />
              <Text style={S.locPillText}>Getting GPS location…</Text>
            </View>
          ) : latitude !== null ? (
            <View style={[S.locPill, S.locPillSuccess]}>
              <CheckCircle size={15} color="#10B981" />
              <Text style={[S.locPillText, { color: '#10B981' }]} numberOfLines={1}>
                {locationName || `${latitude.toFixed(5)}, ${longitude?.toFixed(5)}`}
              </Text>
            </View>
          ) : (
            <View style={[S.locPill, S.locPillWarn]}>
              <AlertTriangle size={15} color="#F59E0B" />
              <Text style={[S.locPillText, { color: '#F59E0B' }]}>Location not set</Text>
            </View>
          )}

          {/* Search bar */}
          <View style={S.searchRow}>
            <View style={S.searchInputWrap}>
              <Search size={14} color="#64748B" />
              <TextInput
                style={S.searchInput}
                placeholder="Search a place in Sri Lanka…"
                placeholderTextColor="#475569"
                value={searchText}
                onChangeText={handleSearchChange}
                returnKeyType="search"
              />
              {isSearching && <ActivityIndicator size="small" color="#20B2AA" />}
              {searchText.length > 0 && !isSearching && (
                <TouchableOpacity onPress={() => { setSearchText(''); setSuggestions([]); }}>
                  <X size={14} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <View style={S.suggestionsBox}>
              {suggestions.slice(0, 6).map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[S.suggestionItem, idx > 0 && S.suggestionBorder]}
                  onPress={() => selectSuggestion(item)}
                  activeOpacity={0.75}
                >
                  <MapPin size={12} color="#20B2AA" />
                  <Text style={S.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <View style={S.locActions}>
            <TouchableOpacity style={S.locBtn} onPress={captureGPS} activeOpacity={0.8}>
              <Navigation size={14} color="#20B2AA" />
              <Text style={S.locBtnText}>Use GPS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.locBtn} onPress={pickOnMap} activeOpacity={0.8}>
              <MapPin size={14} color="#20B2AA" />
              <Text style={S.locBtnText}>Pick on Map</Text>
            </TouchableOpacity>
          </View>

          {latitude !== null && longitude !== null && (
            <Text style={S.coordsText}>{latitude.toFixed(6)}, {longitude.toFixed(6)}</Text>
          )}
        </BlurView>

        {/* ── Timestamp ── */}
        <BlurView intensity={85} tint="dark" style={S.card}>
          <View style={S.fieldHeader}>
            <Clock size={16} color="#20B2AA" />
            <Text style={S.fieldLabel}>Timestamp</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={14} color="#10B981" />
            <Text style={{ color: '#94A3B8', fontSize: 13 }}>
              {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              {'  '}(auto-recorded)
            </Text>
          </View>
        </BlurView>

        {/* ── Photo ── */}
        <BlurView intensity={85} tint="dark" style={S.card}>
          <View style={S.fieldHeader}>
            <ImageIcon size={16} color="#20B2AA" />
            <Text style={S.fieldLabel}>Photo</Text>
            <Text style={S.optional}>(optional)</Text>
          </View>
          {imageUri ? (
            <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
              <Image source={{ uri: imageUri }} style={S.imagePreview} />
              <TouchableOpacity style={S.removeImageBtn} onPress={() => setImageUri(null)}>
                <X size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={S.imagePickerRow}>
              <TouchableOpacity style={S.imagePickerBtn} onPress={pickImage} activeOpacity={0.8}>
                <ImageIcon size={16} color="#20B2AA" />
                <Text style={S.imagePickerBtnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.imagePickerBtn} onPress={takePhoto} activeOpacity={0.8}>
                <Camera size={16} color="#20B2AA" />
                <Text style={S.imagePickerBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[S.submitBtn, submitting && S.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#EF4444', '#DC2626']} style={S.submitBtnGrad}>
            {submitting
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <Send size={18} color="#FFF" />
                  <Text style={S.submitBtnText}>Submit Report</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>

        <Text style={S.disclaimer}>
          By submitting you confirm this report is accurate.{'\n'}
          False reports may be removed by moderators.
        </Text>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SAFE_TOP + 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  backBtnBlur: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1 },
  headerText: { color: '#F1F5F9', fontSize: 18, fontWeight: '700' },
  headerSub:  { color: '#64748B', fontSize: 12, marginTop: 1 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.18)',
    padding: 16, marginBottom: 12,
  },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  fieldLabel:  { color: '#E2E8F0', fontSize: 14, fontWeight: '600', flex: 1 },
  required:    { color: '#EF4444', fontSize: 14, fontWeight: '700' },
  optional:    { color: '#64748B', fontSize: 12 },

  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    color: '#F1F5F9', fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  textArea:  { minHeight: 110, paddingTop: 12 },
  charCount: { color: '#475569', fontSize: 11, textAlign: 'right', marginTop: 4 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  categoryEmoji: { fontSize: 15 },
  categoryLabel: { color: '#94A3B8', fontSize: 13 },

  locPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
    marginBottom: 10,
  },
  locPillSuccess: { backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)' },
  locPillWarn:    { backgroundColor: 'rgba(245,158,11,0.12)',  borderWidth: 1, borderColor: 'rgba(245,158,11,0.30)' },
  locPillText:    { color: '#94A3B8', fontSize: 13, flex: 1 },

  searchRow: { marginBottom: 8 },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, color: '#F1F5F9', fontSize: 13 },

  suggestionsBox: {
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10, overflow: 'hidden',
  },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  suggestionBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  suggestionText: { color: '#CBD5E1', fontSize: 13, flex: 1 },

  locActions: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  locBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(32,178,170,0.10)',
    borderWidth: 1, borderColor: 'rgba(32,178,170,0.28)',
    borderRadius: 12, paddingVertical: 9,
  },
  locBtnText: { color: '#20B2AA', fontSize: 13, fontWeight: '600' },
  coordsText: { color: '#475569', fontSize: 11, marginTop: 2 },

  imagePickerRow: { flexDirection: 'row', gap: 12 },
  imagePickerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(32,178,170,0.08)',
    borderWidth: 1, borderColor: 'rgba(32,178,170,0.22)',
    borderRadius: 12, borderStyle: 'dashed',
  },
  imagePickerBtnText: { color: '#20B2AA', fontSize: 13, fontWeight: '600' },
  imagePreview: {
    width: width - 64, height: 170, borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },

  submitBtn:         { borderRadius: 16, overflow: 'hidden', marginTop: 4, ...SHADOWS.lg },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnGrad:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  submitBtnText:     { color: '#FFF', fontSize: 16, fontWeight: '700' },
  disclaimer: { color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 18 },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: {
    width: '100%', borderRadius: 24, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  successIconWrapper: { marginBottom: 20 },
  successIconBg: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  successTitle:    { color: '#F1F5F9', fontSize: 22, fontWeight: '800', marginBottom: 10 },
  successSubtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  successBtn:      { width: '100%', borderRadius: 14, overflow: 'hidden' },
  successBtnGrad:  { paddingVertical: 14, alignItems: 'center' },
  successBtnText:  { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
