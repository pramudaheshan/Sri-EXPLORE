import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  Alert,
  ImageBackground,
  AppState,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { DetailCard, HotspotData } from './DetailCard';
import { ARSceneCanvas } from './ARSceneCanvas';

// ============================================
// RELIC DATA TYPE
// ============================================
interface RelicData {
  relicId: string;
  relicName: string;
  description?: string;
  model3dUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  hotspots?: Array<{
    id: string;
    name: string;
    description: string;
    position: { x: number; y: number; z: number };
  }>;
  xpReward?: number;
  difficulty?: string;
  tags?: string[];
}

// ============================================
// MAIN INTERFACE PROPS
// ============================================
interface SriARInterfaceProps {
  // Optional - if provided, skip scanning and show AR directly
  relicData?: RelicData;
  // Callbacks
  onPointsEarned?: (xp: number) => void;
  onProgressUpdate?: (newProgress: number) => void;
  onScanComplete?: (data: {
    relicId: string;
    relicName: string;
    xpEarned: number;
    hotspotsExplored: number;
    totalHotspots: number;
  }) => void;
}

export const SriARInterface: React.FC<SriARInterfaceProps> = ({
  relicData: initialRelicData,
  onPointsEarned,
  onProgressUpdate,
  onScanComplete,
}) => {
  // ============================================
  // STATE
  // ============================================
  const [mode, setMode] = useState<'scanning' | 'loading' | 'viewing'>(
    initialRelicData ? 'viewing' : 'scanning',
  );
  const [relicData, setRelicData] = useState<RelicData | null>(
    initialRelicData || null,
  );
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotData | null>(
    null,
  );
  const [exploredHotspots, setExploredHotspots] = useState<Set<string>>(
    new Set(),
  );
  const [showDetailCard, setShowDetailCard] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  // Progress bar animation
  const progressAnim = useRef(new RNAnimated.Value(0)).current;

  // Transition animations
  const scanFrameOpacity = useRef(
    new RNAnimated.Value(initialRelicData ? 0 : 1),
  ).current;
  const viewingOpacity = useRef(
    new RNAnimated.Value(initialRelicData ? 1 : 0),
  ).current;
  const contentScale = useRef(
    new RNAnimated.Value(initialRelicData ? 1 : 0.9),
  ).current;
  const loadingOpacity = useRef(new RNAnimated.Value(0)).current;

  // Use ref to track scanning state (avoids camera restart)
  const canScanRef = useRef(mode === 'scanning');

  // Camera low-power static preview
  const cameraRef = useRef<any>(null);
  const [cameraMounted, setCameraMounted] = useState(true);
  const [staticPreviewUri, setStaticPreviewUri] = useState<string | null>(null);

  // Track whether the app paused the camera so we can resume gracefully
  const pausedByAppStateRef = useRef(false);

  // Micro-animation for camera resume (opacity + subtle scale)
  const resumeAnim = useRef(new RNAnimated.Value(0)).current;
  const triggerResumeAnimation = useCallback(() => {
    RNAnimated.sequence([
      RNAnimated.timing(resumeAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      RNAnimated.timing(resumeAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [resumeAnim]);

  // Keep track of previous mode so we can detect Loading -> Viewing transitions
  const prevModeRef = useRef(mode);

  // Subtle scan-corner micro-animation
  const scanCornerAnim = useRef(new RNAnimated.Value(0)).current;
  const scanCornerLoopRef = useRef<any>(null);

  // Capture single low-res frame and unmount camera to save battery
  const captureStaticPreview = useCallback(async () => {
    try {
      const cam = cameraRef.current;
      // If the camera instance doesn't support takePictureAsync (e.g. CameraView), just skip
      if (!cam || typeof cam.takePictureAsync !== 'function') {
        // best-effort: if CameraView doesn't support snapshots, keep the camera mounted
        console.warn(
          'Camera instance has no takePictureAsync; skipping static preview.',
        );
        return;
      }

      const photo = await cam.takePictureAsync({
        quality: 0.4,
        skipProcessing: true,
      });
      setStaticPreviewUri(photo?.uri ?? null);
      // Unmount camera to reduce battery
      setCameraMounted(false);
    } catch (err) {
      console.warn('Failed to capture preview:', err);
    }
  }, []);

  // When entering viewing mode, capture a frame and stop camera; restore on other modes
  useEffect(() => {
    if (mode === 'viewing') {
      captureStaticPreview();
    } else {
      setStaticPreviewUri(null);
      setCameraMounted(true);
    }
  }, [mode, captureStaticPreview]);

  // ============================================
  // DERIVED DATA
  // ============================================
  const displayHotspots: HotspotData[] = relicData?.hotspots
    ? relicData.hotspots.map((spot, index) => ({
        id: spot.id || `hotspot-${index}`,
        title: spot.name || 'Unknown Hotspot',
        description: spot.description || '',
        xp: relicData.xpReward
          ? Math.floor(
              relicData.xpReward / Math.max(relicData.hotspots!.length, 1),
            )
          : 50,
        position: spot.position || { x: 0, y: 0, z: 0 },
      }))
    : [];

  const calculatedProgress =
    displayHotspots.length > 0
      ? Math.round((exploredHotspots.size / displayHotspots.length) * 100)
      : 0;

  const totalXP =
    totalPoints +
    Array.from(exploredHotspots).reduce((sum, id) => {
      const hotspot = displayHotspots.find((h) => h.id === id);
      return sum + (hotspot?.xp || 0);
    }, 0);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    RNAnimated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  useEffect(() => {
    if (initialRelicData) {
      setRelicData(initialRelicData);
      setMode('viewing');
    }
  }, [initialRelicData]);

  // Animate transitions between scanning and viewing
  useEffect(() => {
    const prevMode = prevModeRef.current;
    canScanRef.current = mode === 'scanning';

    if (mode === 'scanning') {
      // Transition TO scanning
      RNAnimated.parallel([
        RNAnimated.timing(scanFrameOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        RNAnimated.timing(viewingOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        RNAnimated.timing(contentScale, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        }),
        RNAnimated.timing(loadingOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Small resume micro-animation when coming back to scanning
      triggerResumeAnimation();
    } else if (mode === 'loading') {
      // Transition TO loading
      RNAnimated.parallel([
        RNAnimated.timing(scanFrameOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        RNAnimated.timing(loadingOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mode === 'viewing') {
      // Transition TO viewing
      RNAnimated.parallel([
        RNAnimated.timing(scanFrameOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        RNAnimated.timing(loadingOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        RNAnimated.timing(viewingOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        RNAnimated.spring(contentScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // If we just transitioned from Loading -> Viewing, play the micro-animation
      if (prevMode === 'loading') {
        triggerResumeAnimation();
      }
    }

    // update prevMode for next change
    prevModeRef.current = mode;
  }, [mode]);

  // Micro animation: pulse scan-corners while in scanning mode
  useEffect(() => {
    if (mode === 'scanning') {
      const loop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(scanCornerAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          RNAnimated.timing(scanCornerAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      );
      scanCornerLoopRef.current = loop;
      loop.start();
    } else {
      if (scanCornerLoopRef.current) {
        scanCornerLoopRef.current.stop();
        scanCornerLoopRef.current = null;
      }
      RNAnimated.timing(scanCornerAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (scanCornerLoopRef.current) {
        scanCornerLoopRef.current.stop();
        scanCornerLoopRef.current = null;
      }
    };
  }, [mode, scanCornerAnim]);

  // When relic data is set and we're in loading mode, set up a fallback to ensure transitions don't stall
  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (relicData && mode === 'loading') {
      // If scene doesn't report ready within ~3.5s, force viewing to avoid stuck loading
      fallbackTimer = setTimeout(() => {
        console.warn(
          'Scene did not become ready in time — forcing viewing state.',
        );
        setMode('viewing');
      }, 3500);
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [relicData, mode]);

  // Callback for when the 3D scene reports it is ready
  const handleSceneReady = useCallback(() => {
    // Only transition if we're in loading (avoid flipping during other states)
    if (mode === 'loading') {
      setMode('viewing');
    }
  }, [mode]);

  // ============================================
  // QR CODE SCANNING
  // ============================================
  const handleBarCodeScanned = useCallback(
    async ({ data }: { type: string; data: string }) => {
      // Use ref to check if we can scan (avoids camera prop changes)
      if (!canScanRef.current) return;
      canScanRef.current = false; // Prevent multiple scans

      setMode('loading');

      try {
        // Parse QR code data - expecting format: "relic:relicId"
        let relicId = data;
        if (data.startsWith('relic:')) {
          relicId = data.replace('relic:', '');
        }

        // Fetch 3D object data from Firebase
        const relicRef = doc(db, 'relics', relicId);
        const relicSnap = await getDoc(relicRef);

        if (relicSnap.exists()) {
          const firebaseData = relicSnap.data();
          setRelicData({
            relicId: relicId,
            relicName: firebaseData.name || 'Unknown Relic',
            description: firebaseData.description,
            model3dUrl: firebaseData.model3dUrl,
            location: firebaseData.location,
            hotspots: firebaseData.hotspots || [],
            xpReward: firebaseData.xpReward,
            difficulty: firebaseData.difficulty,
            tags: firebaseData.tags || [],
          });
          // keep mode 'loading' while the 3D scene loads; we'll switch to 'viewing' when scene reports ready
        } else {
          Alert.alert(
            'Relic Not Found',
            'This QR code does not match any relic in our database.',
            [{ text: 'Scan Again', onPress: () => setMode('scanning') }],
          );
        }
      } catch (error) {
        console.error('Error fetching relic data:', error);
        Alert.alert('Error', 'Failed to load relic data. Please try again.', [
          { text: 'Scan Again', onPress: () => setMode('scanning') },
        ]);
      }
    },
    [],
  );

  // ============================================
  // HANDLERS
  // ============================================
  const handleScanAgain = () => {
    setProgress(0);
    setTotalPoints(0);
    setRelicData(null);
    setExploredHotspots(new Set());
    setSelectedHotspot(null);
    setShowDetailCard(false);
    setMode('scanning');
  };

  const handleHotspotPress = useCallback((hotspot: HotspotData) => {
    setSelectedHotspot(hotspot);
    setShowDetailCard(true);
  }, []);

  const handleCloseCard = useCallback(() => {
    setShowDetailCard(false);
    setTimeout(() => setSelectedHotspot(null), 300);
  }, []);

  const handleComplete = useCallback(
    (xp: number) => {
      if (selectedHotspot && !exploredHotspots.has(selectedHotspot.id)) {
        const newExplored = new Set([...exploredHotspots, selectedHotspot.id]);
        setExploredHotspots(newExplored);

        setTotalPoints((prev) => prev + xp);
        onPointsEarned?.(xp);

        const newProgress = Math.round(
          (newExplored.size / displayHotspots.length) * 100,
        );
        setProgress(newProgress);
        onProgressUpdate?.(newProgress);

        if (newExplored.size === displayHotspots.length && relicData) {
          const totalXpEarned = Array.from(newExplored).reduce((sum, id) => {
            const hotspot = displayHotspots.find((h) => h.id === id);
            return sum + (hotspot?.xp || 0);
          }, 0);

          onScanComplete?.({
            relicId: relicData.relicId,
            relicName: relicData.relicName,
            xpEarned: totalXpEarned,
            hotspotsExplored: newExplored.size,
            totalHotspots: displayHotspots.length,
          });
        }
      }
    },
    [
      selectedHotspot,
      exploredHotspots,
      displayHotspots,
      relicData,
      onPointsEarned,
      onProgressUpdate,
      onScanComplete,
    ],
  );

  // ============================================
  // RENDER: UNIFIED INTERFACE (All States)
  // ============================================
  return (
    <View style={styles.container}>
      {/* Camera or static low-power preview */}
      {cameraMounted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
      ) : staticPreviewUri ? (
        <ImageBackground
          source={{ uri: staticPreviewUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        >
          <BlurView
            intensity={70}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(9, 38, 28, 0.58)',
            }}
          />
        </ImageBackground>
      ) : null}
      {/* LOADING OVERLAY - animated */}
      <RNAnimated.View
        style={[styles.loadingOverlay, { opacity: loadingOpacity }]}
        pointerEvents={mode === 'loading' ? 'auto' : 'none'}
      >
        <Ionicons name="qr-code" size={60} color="#fff" />
        <Text style={styles.loadingText}>Loading relic data...</Text>
      </RNAnimated.View>

      {/* 3D Scene with Hotspots - animated */}
      <RNAnimated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: viewingOpacity,
            transform: [{ scale: contentScale }],
            zIndex: 60,
            elevation: 60, // Android
          },
        ]}
        pointerEvents={mode === 'viewing' ? 'auto' : 'none'}
      >
        {relicData && (
          <ARSceneCanvas
            hotspots={displayHotspots}
            onHotspotPress={handleHotspotPress}
            activeHotspotId={selectedHotspot?.id || null}
            model3dUrl={relicData.model3dUrl}
            onSceneReady={handleSceneReady}
          />
        )}
      </RNAnimated.View>
      {/* TOP HEADER - Contextual Info */}
      <View
        style={[
          styles.topHeader,
          mode === 'scanning' && styles.topHeaderCentered,
        ]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={30}
          tint="dark"
          style={[
            styles.glassHeader,
            mode === 'scanning' && styles.glassHeaderCentered,
          ]}
        >
          {mode === 'scanning' ? (
            <>
              <Text style={styles.locationLabel}>READY TO SCAN</Text>
              <Text style={styles.relicName}>Point at QR Code</Text>
              <Text style={styles.locationText}>Discover a new relic</Text>
            </>
          ) : relicData ? (
            <>
              <Text style={styles.locationLabel}>DISCOVERING</Text>
              <Text style={styles.relicName}>{relicData.relicName}</Text>
              {relicData.location && (
                <Text style={styles.locationText}>
                  {relicData.location.name}
                </Text>
              )}
              <View style={styles.hotspotCounter}>
                <Ionicons name="ellipse" size={8} color="#FFD700" />
                <Text style={styles.hotspotCountText}>
                  {exploredHotspots.size}/{displayHotspots.length} Hotspots
                </Text>
              </View>
              {relicData.difficulty && (
                <View style={styles.difficultyBadge}>
                  <Text
                    style={[
                      styles.difficultyText,
                      relicData.difficulty === 'Easy'
                        ? { color: '#32CD32' }
                        : relicData.difficulty === 'Medium'
                          ? { color: '#FFD700' }
                          : { color: '#FF6B6B' },
                    ]}
                  >
                    {relicData.difficulty}
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </BlurView>
        {mode !== 'scanning' && (
          <View style={styles.pointsPill}>
            <Ionicons name="star" size={14} color="#000" />
            <Text style={styles.pointsText}>{totalXP} XP</Text>
          </View>
        )}
      </View>
      {/* SCAN FRAME OVERLAY - animated */}
      <RNAnimated.View
        style={[styles.scanFrameContainer, { opacity: scanFrameOpacity }]}
        pointerEvents="none"
      >
        <View style={styles.scanFrame}>
          <RNAnimated.View
            style={[
              styles.scanCorner,
              styles.scanCornerTL,
              {
                transform: [
                  {
                    scale: scanCornerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.06],
                    }),
                  },
                ],
                opacity: scanCornerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.78, 1],
                }),
              },
            ]}
          />

          <RNAnimated.View
            style={[
              styles.scanCorner,
              styles.scanCornerTR,
              {
                transform: [
                  {
                    scale: scanCornerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.06],
                    }),
                  },
                ],
                opacity: scanCornerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.78, 1],
                }),
              },
            ]}
          />

          <RNAnimated.View
            style={[
              styles.scanCorner,
              styles.scanCornerBL,
              {
                transform: [
                  {
                    scale: scanCornerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.06],
                    }),
                  },
                ],
                opacity: scanCornerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.78, 1],
                }),
              },
            ]}
          />

          <RNAnimated.View
            style={[
              styles.scanCorner,
              styles.scanCornerBR,
              {
                transform: [
                  {
                    scale: scanCornerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.06],
                    }),
                  },
                ],
                opacity: scanCornerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.78, 1],
                }),
              },
            ]}
          />
        </View>

        {/* Resume Camera micro-animation badge */}
        <RNAnimated.View
          style={[
            styles.resumeBadge,
            {
              opacity: resumeAnim,
              transform: [
                {
                  scale: resumeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1.06],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        ></RNAnimated.View>
      </RNAnimated.View>
      {/* BOTTOM SECTION - Progress & Actions */}
      <View style={styles.bottomSection} pointerEvents="box-none">
        {/* Progress bar - animated */}
        <RNAnimated.View style={{ opacity: viewingOpacity }}>
          <View style={styles.progressBarBackground}>
            <RNAnimated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </RNAnimated.View>

        <View style={styles.actionsRow}>
          {/* QR Button - animated */}
          <RNAnimated.View
            style={[
              { opacity: viewingOpacity },
              mode === 'scanning' && { width: 0 },
            ]}
          >
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={handleScanAgain}
              disabled={mode !== 'viewing'}
            >
              <BlurView intensity={40} tint="dark" style={styles.scanAgainBlur}>
                <Ionicons name="qr-code-outline" size={28} color="white" />
              </BlurView>
            </TouchableOpacity>
          </RNAnimated.View>

          <View
            style={[
              styles.infoSummary,
              mode === 'scanning' && styles.infoSummaryCentered,
            ]}
          >
            {/* Scanning text - animated */}
            <RNAnimated.View
              style={[
                styles.textContainer,
                {
                  opacity: scanFrameOpacity,
                  position: mode === 'viewing' ? 'absolute' : 'relative',
                },
              ]}
            >
              <Text style={[styles.progressText, styles.textCenter]}>
                Scan a QR Code
              </Text>
              <Text style={[styles.hintText, styles.textCenter]}>
                Position the code inside the frame
              </Text>
            </RNAnimated.View>

            {/* Viewing text - animated */}
            <RNAnimated.View
              style={[
                styles.textContainer,
                {
                  opacity: viewingOpacity,
                  position: mode === 'scanning' ? 'absolute' : 'relative',
                },
              ]}
            >
              <Text style={styles.progressText}>
                {calculatedProgress}% Details Explored
              </Text>
              <Text style={styles.hintText}>
                Tap the glowing points to learn more
              </Text>
            </RNAnimated.View>
          </View>

          {/* Quick hotspot list indicator - animated */}
          <RNAnimated.View
            style={[
              { opacity: viewingOpacity },
              mode === 'scanning' && { width: 0 },
            ]}
          >
            {displayHotspots.length > 0 && (
              <View style={styles.hotspotIndicators}>
                {displayHotspots.map((h) => (
                  <View
                    key={h.id}
                    style={[
                      styles.hotspotDot,
                      exploredHotspots.has(h.id) && styles.hotspotDotExplored,
                    ]}
                  />
                ))}
              </View>
            )}
          </RNAnimated.View>
        </View>
      </View>
      {/* Detail Card (Bottom Sheet) - only show when viewing */}
      {mode === 'viewing' && (
        <DetailCard
          isVisible={showDetailCard}
          hotspot={selectedHotspot}
          onClose={handleCloseCard}
          onComplete={handleComplete}
        />
      )}
    </View>
  );
};

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    zIndex: 95,
    elevation: 95,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },

  // Scanning
  scanFrameContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 85,
    elevation: 85,
  },
  scanFrame: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: '#fff',
    borderWidth: 2,
    opacity: 0.6,
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },

  // Top Header
  topHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 20,
    elevation: 20,
  },
  glassHeader: {
    padding: 15,
    borderRadius: 20,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    maxWidth: '70%',
  },
  // Center the header contents when scanning
  glassHeaderCentered: {
    maxWidth: '100%',
    alignItems: 'center',
    borderLeftWidth: 0,
  },
  topHeaderCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationLabel: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  relicName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  hotspotCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  hotspotCountText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  difficultyBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pointsPill: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000',
  },

  // Bottom Section
  bottomSection: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 80,
    elevation: 80,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoSummary: {
    marginLeft: 15,
    flex: 1,
  },
  infoSummaryCentered: {
    marginLeft: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
  progressText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
  },

  // Hotspot indicators
  hotspotIndicators: {
    flexDirection: 'row',
    gap: 6,
  },
  hotspotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  hotspotDotExplored: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },

  // Scan Button
  scanAgainButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  scanAgainBlur: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Resume badge
  resumeBadge: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    zIndex: 90,
    elevation: 90,
  },
  resumeBadgeBlur: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resumeBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});

export default SriARInterface;
