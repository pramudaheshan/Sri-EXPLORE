// ==========================================
// SriSafeSpot - Report Incident Screen
// Tourists report safety incidents with GPS location
// Design: Glassmorphism / dark theme matching safespot.tsx
// ==========================================
// @ts-nocheck

import React, { useState, useEffect, useRef } from 'react';
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
import { useRouter } from 'expo-router';
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
  ChevronRight,
  FileText,
  Tag,
  Image as ImageIcon,
  Clock,
  Send,
  X,
} from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import {
  submitIncidentReport,
  checkUserHasReport,
  INCIDENT_CATEGORIES,
  IncidentCategory,
  getCurrentUserId,
} from '../../services/incidentService';

const { width } = Dimensions.get('window');

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ReportIncidentScreen() {
  const router = useRouter();

  // ── Form State ──────────────────────────────────────────────────────────────
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [category, setCategory]         = useState<IncidentCategory | null>(null);
  const [imageUri, setImageUri]          = useState<string | null>(null);

  // ── Location State ───────────────────────────────────────────────────────────
  const [latitude, setLatitude]         = useState<number | null>(null);
  const [longitude, setLongitude]       = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locLoading, setLocLoading]     = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapRegion, setMapRegion]       = useState({
    latitude: 7.8731,   // Sri Lanka center
    longitude: 80.7718,
    latitudeDelta: 3.0,
    longitudeDelta: 3.0,
  });

  // ── Submission State ─────────────────────────────────────────────────────────
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [checkingReport, setCheckingReport]   = useState(true);

  // ── Animations ───────────────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();
    captureGPS();
    // Check if user already has a report
    // One-report limit disabled for testing — re-enable before final demo
    // checkUserHasReport(getCurrentUserId()).then(has => {
    //   setAlreadyReported(has);
    //   setCheckingReport(false);
    // }).catch(() => setCheckingReport(false));
    setCheckingReport(false);
  }, []);

  // ==========================================
  // GPS – Auto Capture
  // ==========================================

  const captureGPS = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location access is needed to tag the incident. You can also pick a location on the map.',
        );
        setLocLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      setLatitude(lat);
      setLongitude(lng);
      setMapRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 });

      // Reverse-geocode for a human-readable name
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        const parts = [place.street, place.city, place.region].filter(Boolean);
        setLocationName(parts.join(', '));
      }
    } catch {
      Alert.alert('GPS Error', 'Could not get your location. Please pick it on the map.');
    }
    setLocLoading(false);
  };

  // ==========================================
  // Map Marker Drag / Tap Handler
  // ==========================================

  const handleMapPress = async (event: any) => {
    const { latitude: lat, longitude: lng } = event.nativeEvent.coordinate;
    setLatitude(lat);
    setLongitude(lng);
    // Reverse-geocode new pin
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        const parts = [place.street, place.city, place.region].filter(Boolean);
        setLocationName(parts.join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setLocationName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  // ==========================================
  // Image Picker
  // ==========================================

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ==========================================
  // Form Validation
  // ==========================================

  const validate = (): string | null => {
    if (!title.trim())       return 'Please enter an incident title.';
    if (!description.trim()) return 'Please describe the incident.';
    if (!category)           return 'Please select an incident category.';
    if (!latitude || !longitude) return 'Location is required. Use GPS or pick on map.';
    return null;
  };

  // ==========================================
  // Submit Handler
  // ==========================================

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Missing Information', error);
      return;
    }

    setSubmitting(true);
    try {
      await submitIncidentReport({
        title,
        description,
        category: category!,
        latitude: latitude!,
        longitude: longitude!,
        locationName,
        userId: getCurrentUserId(),
        imageUrl: imageUri,
      });

      setSubmitted(true);
      Animated.spring(successScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Submission Failed', 'Could not submit the report. Please check your internet connection and try again.');
    }
    setSubmitting(false);
  };

  // ==========================================
  // Already Reported / Loading screens
  // ==========================================

  if (checkingReport) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (alreadyReported) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />
        <View style={styles.successContainer}>
          <LinearGradient colors={['rgba(239,68,68,0.15)', 'rgba(239,68,68,0.03)']} style={styles.successCard}>
            <View style={styles.successIconWrapper}>
              <LinearGradient colors={['#EF4444', '#F87171']} style={styles.successIconBg}>
                {/* @ts-ignore */}
                <CheckCircle size={40} stroke={COLORS.white} />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Already Reported</Text>
            <Text style={styles.successSubtitle}>
              You have already submitted a safety report. Only one report per user is allowed to maintain data quality.
            </Text>
            <TouchableOpacity style={styles.successBtn} onPress={() => router.back()}>
              <LinearGradient colors={['#20B2AA', '#48D1CC']} style={styles.successBtnGradient}>
                <Text style={styles.successBtnText}>Back to SafeSpot</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    );
  }

  // ==========================================
  // Success Screen
  // ==========================================

  if (submitted) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.successContainer, { transform: [{ scale: successScale }] }]}>
          <LinearGradient colors={['rgba(32,178,170,0.2)', 'rgba(32,178,170,0.05)']} style={styles.successCard}>
            <View style={styles.successIconWrapper}>
              <LinearGradient colors={['#20B2AA', '#48D1CC']} style={styles.successIconBg}>
                {/* @ts-ignore */}
                <CheckCircle size={40} stroke={COLORS.white} />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Report Submitted!</Text>
            <Text style={styles.successSubtitle}>
              Thank you for keeping Sri Lanka safe. Your report has been saved and will help warn other tourists.
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => {
                // Reset form to allow another submission
                setSubmitted(false);
                setTitle('');
                setDescription('');
                setCategory(null);
                setImageUri(null);
                setLatitude(null);
                setLongitude(null);
                setLocationName('');
                successScale.setValue(0);
                captureGPS();
              }}
            >
              <LinearGradient colors={['#20B2AA', '#48D1CC']} style={styles.successBtnGradient}>
                <Text style={styles.successBtnText}>Submit Another Report</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.successBtn, { marginTop: 8 }]} onPress={() => router.back()}>
              <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.successBtnGradient}>
                <Text style={[styles.successBtnText, { color: COLORS.gray[400] }]}>Back to SafeSpot</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  // ==========================================
  // MAP PICKER (full-screen overlay)
  // ==========================================

  if (showMapPicker) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />
        {/* Header */}
        <View style={styles.mapPickerHeader}>
          <TouchableOpacity onPress={() => setShowMapPicker(false)} style={styles.backButton}>
            {/* @ts-ignore */}
            <ArrowLeft size={22} stroke={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.mapPickerTitle}>Tap to Pin Incident Location</Text>
          <TouchableOpacity
            style={styles.mapPickerDone}
            onPress={() => setShowMapPicker(false)}
          >
            <Text style={styles.mapPickerDoneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <MapView
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          region={mapRegion}
          onPress={handleMapPress}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {latitude !== null && longitude !== null && (
            <Marker
              coordinate={{ latitude, longitude }}
              draggable
              onDragEnd={handleMapPress}
              pinColor={COLORS.primary}
            />
          )}
        </MapView>

        {/* Location label at bottom */}
        {locationName ? (
          <BlurView intensity={60} tint="dark" style={styles.mapPickerLabel}>
            {/* @ts-ignore */}
            <MapPin size={16} stroke={COLORS.primary} />
            <Text style={styles.mapPickerLabelText} numberOfLines={1}>{locationName}</Text>
          </BlurView>
        ) : null}
      </View>
    );
  }

  // ==========================================
  // MAIN FORM
  // ==========================================

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* ── Header ── */}
      <LinearGradient colors={['rgba(0,0,0,0.85)', 'transparent']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            {/* @ts-ignore */}
            <ArrowLeft size={22} stroke={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Report Incident</Text>
            <Text style={styles.headerSubtitle}>Help keep tourists safe</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* ── Form ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.ScrollView
          style={{ flex: 1, opacity: fadeAnim }}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ─── Incident Title ─────────────────────── */}
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <View style={styles.fieldHeader}>
              {/* @ts-ignore */}
              <FileText size={18} stroke={COLORS.primary} />
              <Text style={styles.fieldLabel}>Incident Title</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Phone snatched near Pettah Market"
              placeholderTextColor={COLORS.gray[500]}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />
            <Text style={styles.charCount}>{title.length}/80</Text>
          </BlurView>

          {/* ─── Category ───────────────────────────── */}
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <View style={styles.fieldHeader}>
              {/* @ts-ignore */}
              <Tag size={18} stroke={COLORS.primary} />
              <Text style={styles.fieldLabel}>Incident Category</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <View style={styles.categoryGrid}>
              {INCIDENT_CATEGORIES.map(cat => {
                const active = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      active && { backgroundColor: cat.color + '30', borderColor: cat.color },
                    ]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.categoryLabel, active && { color: cat.color, fontWeight: '600' }]}>
                      {cat.label}
                    </Text>
                    {active && (
                      <>
                        {/* @ts-ignore */}
                        <CheckCircle size={14} stroke={cat.color} />
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </BlurView>

          {/* ─── Description ────────────────────────── */}
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <View style={styles.fieldHeader}>
              {/* @ts-ignore */}
              <AlertTriangle size={18} stroke={COLORS.primary} />
              <Text style={styles.fieldLabel}>Description</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe what happened, when, how, and any other details that could help other tourists..."
              placeholderTextColor={COLORS.gray[500]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={600}
            />
            <Text style={styles.charCount}>{description.length}/600</Text>
          </BlurView>

          {/* ─── Location ───────────────────────────── */}
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <View style={styles.fieldHeader}>
              {/* @ts-ignore */}
              <MapPin size={18} stroke={COLORS.primary} />
              <Text style={styles.fieldLabel}>Location</Text>
              <Text style={styles.required}>*</Text>
            </View>

            {/* GPS status pill */}
            {locLoading ? (
              <View style={styles.locPill}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.locPillText}>Getting GPS location…</Text>
              </View>
            ) : latitude !== null ? (
              <View style={[styles.locPill, styles.locPillSuccess]}>
                {/* @ts-ignore */}
                <CheckCircle size={16} stroke={COLORS.success} />
                <Text style={[styles.locPillText, { color: COLORS.success }]} numberOfLines={1}>
                  {locationName || `${latitude.toFixed(5)}, ${longitude?.toFixed(5)}`}
                </Text>
              </View>
            ) : (
              <View style={[styles.locPill, styles.locPillWarn]}>
                {/* @ts-ignore */}
                <AlertTriangle size={16} stroke={COLORS.warning} />
                <Text style={[styles.locPillText, { color: COLORS.warning }]}>Location not set</Text>
              </View>
            )}

            {/* Coordinates detail */}
            {latitude !== null && longitude !== null && (
              <Text style={styles.coordsText}>
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Text>
            )}

            {/* Location action buttons */}
            <View style={styles.locationActions}>
              <TouchableOpacity style={styles.locBtn} onPress={captureGPS}>
                {/* @ts-ignore */}
                <Navigation size={16} stroke={COLORS.primary} />
                <Text style={styles.locBtnText}>Use GPS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.locBtn} onPress={() => setShowMapPicker(true)}>
                {/* @ts-ignore */}
                <MapPin size={16} stroke={COLORS.primary} />
                <Text style={styles.locBtnText}>Pick on Map</Text>
                {/* @ts-ignore */}
                <ChevronRight size={14} stroke={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Mini map preview */}
            {latitude !== null && longitude !== null && (
              <TouchableOpacity onPress={() => setShowMapPicker(true)} style={styles.miniMapContainer}>
                <MapView
                  style={styles.miniMap}
                  provider={PROVIDER_GOOGLE}
                  region={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  <Marker coordinate={{ latitude, longitude }} pinColor={COLORS.critical} />
                </MapView>
                <View style={styles.miniMapOverlay}>
                  <Text style={styles.miniMapOverlayText}>Tap to adjust</Text>
                </View>
              </TouchableOpacity>
            )}
          </BlurView>

          {/* ─── Timestamp (auto) ───────────────────── */}
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <View style={styles.fieldHeader}>
              {/* @ts-ignore */}
              <Clock size={18} stroke={COLORS.primary} />
              <Text style={styles.fieldLabel}>Timestamp</Text>
            </View>
            <View style={styles.timestampRow}>
              {/* @ts-ignore */}
              <CheckCircle size={16} stroke={COLORS.success} />
              <Text style={styles.timestampText}>
                Automatically recorded at time of submission
              </Text>
            </View>
            <Text style={styles.timestampValue}>
              {new Date().toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Text>
          </BlurView>

          {/* ─── Image Upload ────────────────────────── */}
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <View style={styles.fieldHeader}>
              {/* @ts-ignore */}
              <ImageIcon size={18} stroke={COLORS.primary} />
              <Text style={styles.fieldLabel}>Photo</Text>
              <Text style={styles.optional}>(optional)</Text>
            </View>

            {imageUri ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                >
                  {/* @ts-ignore */}
                  <X size={16} stroke={COLORS.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePickerRow}>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={takePhoto}>
                  {/* @ts-ignore */}
                  <Camera size={20} stroke={COLORS.primary} />
                  <Text style={styles.imagePickerBtnText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                  {/* @ts-ignore */}
                  <ImageIcon size={20} stroke={COLORS.primary} />
                  <Text style={styles.imagePickerBtnText}>Choose File</Text>
                </TouchableOpacity>
              </View>
            )}
          </BlurView>

          {/* ─── Submit ─────────────────────────────── */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <LinearGradient
              colors={submitting ? ['#6B7280', '#9CA3AF'] : ['#EF4444', '#DC2626']}
              style={styles.submitBtnGradient}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.submitBtnText}>Submitting…</Text>
                </>
              ) : (
                <>
                  {/* @ts-ignore */}
                  <Send size={20} stroke={COLORS.white} />
                  <Text style={styles.submitBtnText}>Submit Report</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Reports are reviewed and used solely to improve tourist safety. False reports may be removed.
          </Text>

          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </KeyboardAvoidingView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.gray[400],
    fontSize: SIZES.xs,
    marginTop: 2,
  },

  // Form
  formContent: {
    paddingHorizontal: SIZES.spacing.lg,
    paddingTop: SIZES.spacing.lg,
  },

  // Cards
  card: {
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: SIZES.spacing.lg,
    marginBottom: SIZES.spacing.md,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.sm,
    marginBottom: SIZES.spacing.md,
  },
  fieldLabel: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
    flex: 1,
  },
  required: {
    color: COLORS.critical,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  optional: {
    color: COLORS.gray[500],
    fontSize: SIZES.sm,
  },

  // Text input
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: SIZES.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: COLORS.white,
    fontSize: SIZES.md,
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: SIZES.spacing.sm,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SIZES.spacing.md,
  },
  charCount: {
    color: COLORS.gray[600],
    fontSize: SIZES.xs,
    textAlign: 'right',
    marginTop: 4,
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.xs,
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: SIZES.spacing.sm,
    borderRadius: SIZES.radius.full,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    color: COLORS.gray[300],
    fontSize: SIZES.sm,
  },

  // Location
  locPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: SIZES.radius.full,
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: SIZES.spacing.sm,
    marginBottom: SIZES.spacing.sm,
  },
  locPillSuccess: {
    backgroundColor: 'rgba(46,213,115,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,213,115,0.3)',
  },
  locPillWarn: {
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  locPillText: {
    color: COLORS.gray[300],
    fontSize: SIZES.sm,
    flex: 1,
  },
  coordsText: {
    color: COLORS.gray[500],
    fontSize: SIZES.xs,
    marginBottom: SIZES.spacing.md,
    marginLeft: 2,
  },
  locationActions: {
    flexDirection: 'row',
    gap: SIZES.spacing.sm,
    marginBottom: SIZES.spacing.md,
  },
  locBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.spacing.xs,
    backgroundColor: 'rgba(32,178,170,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(32,178,170,0.3)',
    borderRadius: SIZES.radius.md,
    paddingVertical: SIZES.spacing.sm,
  },
  locBtnText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  miniMapContainer: {
    height: 150,
    borderRadius: SIZES.radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  miniMap: {
    ...StyleSheet.absoluteFillObject,
  },
  miniMapOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  miniMapOverlayText: {
    color: COLORS.white,
    fontSize: SIZES.xs,
  },

  // Timestamp
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.sm,
    marginBottom: 4,
  },
  timestampText: {
    color: COLORS.gray[400],
    fontSize: SIZES.sm,
  },
  timestampValue: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '500',
    marginTop: 4,
  },

  // Image
  imagePickerRow: {
    flexDirection: 'row',
    gap: SIZES.spacing.md,
  },
  imagePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.spacing.sm,
    paddingVertical: SIZES.spacing.md,
    backgroundColor: 'rgba(32,178,170,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(32,178,170,0.25)',
    borderRadius: SIZES.radius.md,
    borderStyle: 'dashed',
  },
  imagePickerBtnText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  imagePreviewWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: width - SIZES.spacing.lg * 2 - SIZES.spacing.lg * 2,
    height: 180,
    borderRadius: SIZES.radius.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Submit
  submitBtn: {
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    marginTop: SIZES.spacing.sm,
    ...SHADOWS.lg,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.spacing.lg,
    gap: SIZES.spacing.sm,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disclaimer: {
    color: COLORS.gray[600],
    fontSize: SIZES.xs,
    textAlign: 'center',
    marginTop: SIZES.spacing.md,
    lineHeight: 18,
  },

  // Success screen
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.spacing.xl,
  },
  successCard: {
    width: '100%',
    borderRadius: SIZES.radius.xxl,
    padding: SIZES.spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(32,178,170,0.3)',
  },
  successIconWrapper: {
    marginBottom: SIZES.spacing.xl,
  },
  successIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: COLORS.white,
    fontSize: SIZES.xxl,
    fontWeight: '800',
    marginBottom: SIZES.spacing.md,
  },
  successSubtitle: {
    color: COLORS.gray[400],
    fontSize: SIZES.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SIZES.spacing.xxl,
  },
  successBtn: {
    width: '100%',
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
  },
  successBtnGradient: {
    paddingVertical: SIZES.spacing.lg,
    alignItems: 'center',
  },
  successBtnText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },

  // Map Picker overlay
  mapPickerHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.spacing.lg,
    paddingVertical: SIZES.spacing.md,
    backgroundColor: 'rgba(15,23,42,0.85)',
    gap: SIZES.spacing.md,
  },
  mapPickerTitle: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  mapPickerDone: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: SIZES.spacing.xs,
    borderRadius: SIZES.radius.full,
  },
  mapPickerDoneText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.sm,
  },
  mapPickerLabel: {
    position: 'absolute',
    bottom: 40,
    left: SIZES.spacing.lg,
    right: SIZES.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacing.sm,
    paddingHorizontal: SIZES.spacing.lg,
    paddingVertical: SIZES.spacing.md,
    borderRadius: SIZES.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mapPickerLabelText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    flex: 1,
  },
});
