// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { ARScan } from '../../../services/firebaseService';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import modelCache from '../../../services/modelCache';
import { getModel3DUrl } from '../../../services/storageService';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

// Web-based viewer for actual cached GLB models using Babylon.js
const GLBModelViewer: React.FC<{
  cachedModelPath?: string;
  relicName?: string;
  showStudioLighting?: boolean;
  disableGestures?: boolean;
}> = ({ cachedModelPath, relicName, showStudioLighting = true, disableGestures = false }) => {
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cachedModelPath) {
      console.log('[GLB VIEWER] No model path provided');
      setLoading(false);
      return;
    }

    const loadModelData = async () => {
      try {
        console.log(
          `[GLB VIEWER] Loading cached model from: ${cachedModelPath}`,
        );
        const base64 = await FileSystem.readAsStringAsync(cachedModelPath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log(
          '[GLB VIEWER] Model loaded as base64, length:',
          base64.length,
        );
        setBase64Data(base64);
        setLoading(false);
      } catch (err) {
        console.error('[GLB VIEWER] Failed to load model:', err);
        setLoading(false);
      }
    };

    loadModelData();
  }, [cachedModelPath, showStudioLighting]);

  if (!cachedModelPath) {
    return (
      <View style={styles.placeholderContainer}>
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>No 3D model available</Text>
        </View>
      </View>
    );
  }

  if (loading || !base64Data) {
    return (
      <View style={styles.placeholderContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.placeholderText}>Loading 3D model...</Text>
      </View>
    );
  }

  // Create HTML with model-viewer element for GLB models
  // Only create this when we have the base64Data
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; }
        body { 
          background: #070707; 
          overflow: hidden; 
          font-family: monospace; 
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        #container {
          width: 100%;
          height: 100%;
          position: relative;
        }
        model-viewer {
          width: 100%;
          height: 100%;
        }
        #loading { 
          position: absolute; 
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: #FFD700; 
          font-size: 16px; 
          text-align: center; 
          background: rgba(0,0,0,0.7);
          z-index: 100;
          pointer-events: none;
        }
        #status { 
          display: none;
        }
      </style>
    </head>
    <body>
      <div id="container">
        <model-viewer 
          id="viewer" 
          auto-rotate 
          ${!disableGestures ? 'camera-controls' : ''}
          exposure="${showStudioLighting ? '0.8' : '2.0'}"
          shadow-intensity="${showStudioLighting ? '1' : '0.3'}"
        ></model-viewer>
      </div>
      <div id="status">Init...</div>
      
      <script type="module">
        const statusDiv = document.getElementById('status');
        const loadingDiv = document.getElementById('loading');
        const viewer = document.getElementById('viewer');
        
        let logOutput = [];
        function log(msg) {
          console.log(msg);
          logOutput.push(msg);
          statusDiv.innerText = logOutput.slice(-20).join('\\n');
        }
        
        log('[1] Script started');
        log('[2] Base64 length: ${base64Data.length}');
        
        async function initViewer() {
          try {
            log('[3] Importing model-viewer...');
            await import('https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js');
            log('[4] model-viewer imported');
            
            log('[5] Creating blob...');
            const base64 = '${base64Data}';
            const binaryStr = atob(base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            log('[6] Blob created, size: ' + bytes.length);
            
            const blob = new Blob([bytes], { type: 'model/gltf-binary' });
            const url = URL.createObjectURL(blob);
            log('[7] Blob URL: ' + url.substring(0, 50) + '...');
            
            log('[8] Setting viewer.src...');
            viewer.src = url;
            log('[9] viewer.src set');
            
            log('[10] Waiting for model load...');
            const result = await viewer.modelIsVisible;
            log('[11] Model visible!');
            loadingDiv.style.display = 'none';
            
          } catch (err) {
            log('ERROR: ' + err.message);
            console.error(err);
          }
        }
        
        log('[0] DOM ready, starting init...');
        initViewer();
      </script>
    </body>
    </html>
  `;

  return (
    <WebView
      key={base64Data} // Force remount when data changes
      style={styles.babylonViewer}
      originWhitelist={['*']}
      source={{ html: htmlContent }}
      scalesPageToFit={false}
      scrollEnabled={false}
      javaScriptEnabled={true}
    />
  );
};

// Canvas wrapper component
export const ARSceneCanvas: React.FC<{
  modelUrl?: string;
  relicName?: string;
  showStudioLighting?: boolean;
  disableGestures?: boolean;
}> = ({ modelUrl, relicName, showStudioLighting, disableGestures }) => {
  return (
    <GLBModelViewer
      cachedModelPath={modelUrl}
      relicName={relicName}
      showStudioLighting={showStudioLighting}
      disableGestures={disableGestures}
    />
  );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================
interface RelicDetailViewProps {
  scan: ARScan;
  onBack: () => void;
  allScans?: ARScan[]; // Optional: full list of scans for navigation
}

interface RelicData {
  relicId: string;
  relicName: string;
  description?: string;
  model3dPath?: string;
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
  /** Optionally request a preferred viewer background (camera | studio) */
  background?: 'camera' | 'studio';
}

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDate = (timestamp: any): string => {
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Use the Ionicons prop type for the name to ensure correct typings
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const getRelicIcon = (relicName: string): IconName => {
  const name = relicName.toLowerCase();
  if (name.includes('temple') || name.includes('tooth')) return 'business';
  if (name.includes('sigiriya') || name.includes('rock')) return 'triangle';
  if (name.includes('galle') || name.includes('fort')) return 'shield';
  if (name.includes('anuradhapura')) return 'leaf';
  if (name.includes('polonnaruwa')) return 'flower';
  if (name.includes('dambulla')) return 'water';
  return 'cube';
};

// ============================================
// HOTSPOT LIST ITEM
// ============================================
interface HotspotItemProps {
  hotspot: {
    id: string;
    name: string;
    description: string;
  };
  xp: number;
  isExplored: boolean;
}

const HotspotItem: React.FC<HotspotItemProps> = ({
  hotspot,
  xp,
  isExplored,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.hotspotItem}>
      <BlurView intensity={20} tint="dark" style={styles.hotspotBlur}>
        <TouchableOpacity
          style={styles.hotspotHeader}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <View style={styles.hotspotIcon}>
            <Ionicons
              name={isExplored ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={isExplored ? '#FFD700' : 'rgba(255, 255, 255, 0.3)'}
            />
          </View>

          <View style={styles.hotspotInfo}>
            <Text
              style={[
                styles.hotspotName,
                !isExplored && styles.hotspotNameDisabled,
              ]}
            >
              {hotspot.name}
            </Text>
            <Text style={styles.hotspotXP}>+{xp} XP</Text>
          </View>

          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="rgba(255, 255, 255, 0.5)"
          />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.hotspotContent}>
            <Text style={styles.hotspotDescription}>{hotspot.description}</Text>
          </View>
        )}
      </BlurView>
    </View>
  );
};

// ============================================
// 3D MODEL VIEWER SECTION
// ============================================
interface ModelViewerProps {
  relicData: RelicData | null;
  localModelUri?: string | null;
  modelLoading?: boolean;
  showStudioLighting?: boolean;
  onToggleStudioLighting?: () => void;
}

const ModelViewer: React.FC<ModelViewerProps> = ({
  relicData,
  localModelUri,
  modelLoading,
  showStudioLighting = true,
  onToggleStudioLighting,
}) => {
  // Studio-style preview wrapper for model discovery
  return (
    <View style={styles.model3DContainer}>
      <View style={styles.studioBackground}>
        {/* Center preview area with 3D model - SEPARATE LAYER */}
        <View style={styles.modelPreview}>
          {/* Lighting effects - INSIDE the 3D model layer */}
          {showStudioLighting && <View style={styles.studioSpotlight} />}
          {showStudioLighting && <View style={styles.studioFloorShadow} />}

          {/* Loading indicator */}
          {modelLoading && (
            <View style={styles.modelLoadingOverlay}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.modelLoadingText}>Preparing model...</Text>
            </View>
          )}

          <View style={styles.modelPreviewInner}>
            <ARSceneCanvas
              modelUrl={localModelUri || ''}
              relicName={relicData?.relicName}
              showStudioLighting={showStudioLighting}
            />
          </View>

          {/* Studio Lighting Toggle Button - Inside 3D Model Display */}
          <TouchableOpacity
            style={styles.lightingToggleButton}
            onPress={onToggleStudioLighting}
          >
            <BlurView
              intensity={40}
              tint="dark"
              style={styles.lightingToggleBlur}
            >
              <Ionicons
                name={showStudioLighting ? 'bulb-outline' : 'bulb'}
                size={20}
                color={
                  showStudioLighting ? 'rgba(255, 255, 255, 0.5)' : '#FFD700'
                }
              />
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ============================================
// MAIN RELIC DETAIL VIEW
// ============================================
export const RelicDetailView: React.FC<RelicDetailViewProps> = ({
  scan,
  onBack,
  allScans,
}) => {
  const [relicData, setRelicData] = useState<RelicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [localModelUri, setLocalModelUri] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [storedRelics, setStoredRelics] = useState<any[]>([]);
  const [showStudioLighting, setShowStudioLighting] = useState(true);
  const currentRelic = storedRelics[currentIndex];
  const isComplete = scan.hotspotsExplored === scan.totalHotspots;

  // Load all scans - prefer allScans prop, otherwise query Firebase
  useEffect(() => {
    const loadAllScans = async () => {
      try {
        let allScansToUse: ARScan[] = [];

        // Use provided allScans prop if available
        if (allScans && allScans.length > 0) {
          console.log(
            `[NAVIGATION] Using provided allScans prop with ${allScans.length} scans`,
          );
          allScansToUse = allScans;
        } else {
          // Fall back to Firestore query
          console.log(
            '[NAVIGATION] No allScans provided, querying Firestore...',
          );
          const scansRef = collection(db, 'scans');
          const scansSnap = await getDocs(scansRef);

          allScansToUse = scansSnap.docs.map((doc) => {
            const data = doc.data();
            return {
              ...data,
              relicId: data.relicId || doc.id,
            } as ARScan;
          });

          console.log(
            `[NAVIGATION] Firestore query returned ${allScansToUse.length} documents`,
          );
        }

        // If still no scans, use single scan fallback
        if (allScansToUse.length === 0) {
          console.log(
            '[NAVIGATION] No scans found, using single scan fallback',
          );
          setStoredRelics([
            { id: scan.relicId, name: scan.relicName, data: scan },
          ]);
          setCurrentIndex(0);
          return;
        }

        // Sort by date (newest first)
        allScansToUse.sort((a, b) => {
          const getTime = (date: any): number => {
            if (!date) return 0;
            if (date.toDate && typeof date.toDate === 'function') {
              return date.toDate().getTime();
            }
            if (date instanceof Date) {
              return date.getTime();
            }
            if (typeof date === 'number' || typeof date === 'string') {
              return new Date(date as any).getTime();
            }
            return 0;
          };
          return getTime(b.completedAt) - getTime(a.completedAt);
        });

        // Convert to storedRelics format
        const formattedScans = allScansToUse.map((s, idx) => ({
          id: s.relicId,
          name: s.relicName,
          data: s,
        }));

        setStoredRelics(formattedScans);

        // Find current scan index
        const currentScanIndex = formattedScans.findIndex(
          (s) => s.data.relicId === scan.relicId,
        );
        if (currentScanIndex >= 0) {
          setCurrentIndex(currentScanIndex);
          console.log(
            `[NAVIGATION] Found current scan at index ${currentScanIndex}`,
          );
        } else {
          console.log(
            '[NAVIGATION] Current scan not found, defaulting to index 0',
          );
          setCurrentIndex(0);
        }

        console.log(
          `[NAVIGATION] Loaded ${formattedScans.length} scans for navigation`,
        );
      } catch (error) {
        console.error('[NAVIGATION] Error loading scans:', error);
        // Fallback to single scan
        console.log(
          '[NAVIGATION] Query failed, using single scan fallback mode',
        );
        setStoredRelics([
          { id: scan.relicId, name: scan.relicName, data: scan },
        ]);
        setCurrentIndex(0);
      }
    };

    loadAllScans();
  }, [allScans, scan.relicId, scan.relicName, scan]);

  // Load full relic data from Firebase
  useEffect(() => {
    const loadRelicData = async () => {
      if (!currentRelic) {
        console.log('[RELIC] No current relic available');
        return;
      }

      setLoading(true);
      console.log('[RELIC] Loading data for currentRelic.id:', currentRelic.id);
      try {
        const relicRef = doc(db, 'relics', currentRelic.id);
        const relicSnap = await getDoc(relicRef);

        const scanData = currentRelic.data;
        console.log('[RELIC] relicSnap.exists():', relicSnap.exists());

        if (relicSnap.exists()) {
          const data = relicSnap.data();
          console.log('✅ Loaded relic from Firebase:', data);
          setRelicData({
            relicId: relicSnap.id,
            relicName: data.name || data.relicName,
            model3dPath: data.model3dUrl || data.model3dPath,
            ...data,
          } as RelicData);
        } else {
          console.log(
            '[RELIC] Relic not found in Firebase, using scan data as fallback',
          );
          // Fallback to scan data
          setRelicData({
            relicId: scanData.relicId,
            relicName: scanData.relicName,
            description: 'No description available.',
            location: {
              latitude: scanData.location.latitude,
              longitude: scanData.location.longitude,
              name: scanData.relicName,
            },
            xpReward: scanData.xpEarned,
            hotspots: [],
          });
        }
      } catch (error) {
        console.error('[RELIC] Error loading relic data:', error);
        const scanData = currentRelic.data;
        setRelicData({
          relicId: scanData.relicId,
          relicName: scanData.relicName,
          description: 'Unable to load relic details.',
          xpReward: scanData.xpEarned,
          hotspots: [],
        });
      } finally {
        setLoading(false);
      }
    };

    loadRelicData();
  }, [currentRelic]);

  // Preload 3D model for preview (uses cache)
  useEffect(() => {
    let mounted = true;
    (async () => {
      console.log('\n===== MODEL LOADING FLOW START =====');
      if (!relicData) {
        console.log('[MODEL] relicData is null, skipping model load');
        return;
      }

      console.log('[MODEL] Relic Data:', {
        relicId: relicData.relicId,
        relicName: relicData.relicName,
        model3dPath: relicData.model3dPath,
      });

      if (!relicData?.model3dPath) {
        console.log('[MODEL] No model3dPath in relic data');
        return;
      }

      setModelLoading(true);
      try {
        // Get the download URL from the model path
        console.log(
          `[STEP 1] Getting model URL for path: ${relicData.model3dPath}`,
        );
        const downloadUrl = await getModel3DUrl(relicData.model3dPath);
        console.log(`[STEP 2] Got Firebase download URL: ${downloadUrl}`);

        console.log('[STEP 3] Calling modelCache.preloadModel...');
        const uri = await modelCache.preloadModel(
          downloadUrl,
          relicData.relicId,
        );
        console.log(`[STEP 4] Returned cached local URI: ${uri}`);

        if (!uri) {
          console.error('[MODEL] preloadModel returned null/empty');
          return;
        }

        console.log(`[STEP 5] Setting localModelUri state: ${uri}`);
        if (mounted) setLocalModelUri(uri);
        console.log('[MODEL] MODEL LOADING FLOW COMPLETE');
      } catch (err) {
        console.error('[MODEL] Error during model loading:', err);
      } finally {
        if (mounted) setModelLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [relicData]);

  // View in AR option removed — navigation handled elsewhere or disabled

  // First check if we have any scans loaded at all
  if (storedRelics.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading saved scans...</Text>
      </View>
    );
  }

  // Then check if current relic is selected
  if (!currentRelic) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading relic details...</Text>
      </View>
    );
  }

  const hotspotXP = relicData?.hotspots?.length
    ? Math.floor(currentRelic.data.xpEarned / relicData.hotspots.length)
    : 0;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      console.log(
        `[NAVIGATION] Moving to previous scan: index ${currentIndex - 1}`,
      );
    }
  };

  const handleNext = () => {
    if (currentIndex < storedRelics.length - 1) {
      setCurrentIndex(currentIndex + 1);
      console.log(
        `[NAVIGATION] Moving to next scan: index ${currentIndex + 1}`,
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Full Screen 3D Model Viewer with Navigation */}
      <View style={styles.fullScreenModelContainer}>
        {/* Model Section - Takes up most of screen */}
        <View style={styles.fullScreenModelSection}>
          <ModelViewer
            relicData={relicData}
            localModelUri={localModelUri}
            modelLoading={modelLoading}
            showStudioLighting={showStudioLighting}
            onToggleStudioLighting={() =>
              setShowStudioLighting(!showStudioLighting)
            }
          />

          {/* Left Arrow */}
          <TouchableOpacity
            style={[styles.navArrow, styles.navArrowLeft]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <Ionicons
              name="chevron-back"
              size={30}
              color={currentIndex === 0 ? 'rgba(255, 215, 0, 0.3)' : '#FFD700'}
            />
          </TouchableOpacity>

          {/* Right Arrow */}
          <TouchableOpacity
            style={[styles.navArrow, styles.navArrowRight]}
            onPress={handleNext}
            disabled={currentIndex === storedRelics.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={30}
              color={
                currentIndex === storedRelics.length - 1
                  ? 'rgba(255, 215, 0, 0.3)'
                  : '#FFD700'
              }
            />
          </TouchableOpacity>

          {/* Relic Name Overlay - Top Left */}
          <View style={styles.modelNameOverlay}>
            <BlurView intensity={40} tint="dark" style={styles.modelNameBlur}>
              <Text style={styles.modelIndexText}>
                {currentIndex + 1} / {storedRelics.length}
              </Text>
            </BlurView>
          </View>

          {/* Back Button - Top Right */}
          <TouchableOpacity onPress={onBack} style={styles.modelBackButton}>
            <BlurView intensity={40} tint="dark" style={styles.modelBackBlur}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </BlurView>
          </TouchableOpacity>

        </View>

        {/* Scrollable Details Section */}
        <ScrollView
          style={styles.detailsScrollView}
          contentContainerStyle={styles.detailsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Relic Info Card */}
          <View style={styles.infoCard}>
            <BlurView intensity={30} tint="dark" style={styles.infoBlur}>
              {/* Title & Status */}
              <View style={styles.titleRow}>
                <View style={styles.titleContainer}>
                  <Text style={styles.relicTitle}>
                    {currentRelic.data.relicName}
                  </Text>
                  {relicData?.location?.name && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={14} color="#FFD700" />
                      <Text style={styles.locationText}>
                        {relicData.location.name}
                      </Text>
                    </View>
                  )}
                </View>
                {isComplete && (
                  <View style={styles.completeBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#FFD700"
                    />
                    <Text style={styles.completeText}>Complete</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              {relicData?.description && (
                <Text style={styles.description}>{relicData.description}</Text>
              )}

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={20} color="#FFD700" />
                  <Text style={styles.statLabel}>XP Earned</Text>
                  <Text style={styles.statValue}>
                    {currentRelic.data.xpEarned}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Ionicons name="location" size={20} color="#FFD700" />
                  <Text style={styles.statLabel}>Hotspots</Text>
                  <Text style={styles.statValue}>
                    {currentRelic.data.hotspotsExplored}/
                    {currentRelic.data.totalHotspots}
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Ionicons name="calendar" size={20} color="#FFD700" />
                  <Text style={styles.statLabel}>Scanned</Text>
                  <Text style={styles.statValue} numberOfLines={1}>
                    {formatDate(currentRelic.data.completedAt).split(',')[0]}
                  </Text>
                </View>
              </View>

              {/* Difficulty Badge */}
              {relicData?.difficulty && (
                <View style={styles.difficultyContainer}>
                  <View style={styles.difficultyBadge}>
                    <Text style={styles.difficultyText}>
                      {relicData.difficulty}
                    </Text>
                  </View>
                </View>
              )}
            </BlurView>
          </View>

          {/* Hotspots Section */}
          {relicData?.hotspots && relicData.hotspots.length > 0 && (
            <View style={styles.hotspotsSection}>
              <Text style={styles.sectionTitle}>
                Discovered Hotspots ({currentRelic.data.hotspotsExplored}/
                {currentRelic.data.totalHotspots})
              </Text>

              {relicData.hotspots.map((hotspot, index) => (
                <HotspotItem
                  key={hotspot.id}
                  hotspot={hotspot}
                  xp={hotspotXP}
                  isExplored={index < currentRelic.data.hotspotsExplored}
                />
              ))}
            </View>
          )}

          {/* Scan Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Scan Details</Text>

            <View style={styles.detailCard}>
              <BlurView intensity={20} tint="dark" style={styles.detailBlur}>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="rgba(255, 255, 255, 0.6)"
                  />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Scanned On</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(currentRelic.data.completedAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <Ionicons
                    name="navigate-outline"
                    size={20}
                    color="rgba(255, 255, 255, 0.6)"
                  />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>
                      {currentRelic.data.location.latitude.toFixed(4)},{' '}
                      {currentRelic.data.location.longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <Ionicons
                    name="finger-print-outline"
                    size={20}
                    color="rgba(255, 255, 255, 0.6)"
                  />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Relic ID</Text>
                    <Text style={styles.detailValue}>
                      {currentRelic.data.relicId}
                    </Text>
                  </View>
                </View>
              </BlurView>
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

// ============================================
// STYLES - MATCHING DASHBOARD DESIGN
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 16,
    fontFamily: 'Poppins-Regular',
  },

  // Full Screen Model Container
  fullScreenModelContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  fullScreenModelSection: {
    flex: 1,
    backgroundColor: '#070707',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Navigation Arrows
  navArrow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  navArrowLeft: {
    left: 16,
  },
  navArrowRight: {
    right: 16,
  },

  // Model Name Overlay
  modelNameOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modelNameBlur: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modelNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  modelIndexText: {
    fontSize: 12,
    color: '#FFD700',
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },

  // Model Back Button
  modelBackButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 20,
  },
  modelBackBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Details Scroll View
  detailsScrollView: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  detailsScrollContent: {
    paddingVertical: 0,
  },

  // Header (old, kept for reference but not used in new layout)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll View (old)
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Model Section
  modelSection: {
    height: SCREEN_HEIGHT * 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  model3DContainer: {
    flex: 1,
    position: 'relative',
  },
  model3DHint: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
  },
  model3DHintBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  model3DHintText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },

  // Studio Lighting Toggle Button
  lightingToggleButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: 30,
  },
  lightingToggleBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  model3DPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070707',
  },
  placeholderBox: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  babylonViewer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  modelLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  modelLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FFD700',
    fontFamily: 'Poppins-Regular',
  },

  // Studio preview styles
  studioBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070707',
    position: 'relative',
    overflow: 'hidden',
  },
  studioSpotlight: {
    position: 'absolute',
    width: Math.round(SCREEN_WIDTH * 0.6),
    height: Math.round(SCREEN_WIDTH * 0.6),
    borderRadius: Math.round((SCREEN_WIDTH * 0.6) / 2),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    top: -Math.round(SCREEN_WIDTH * 0.1),
    left: '50%',
    marginLeft: -Math.round(SCREEN_WIDTH * 0.3),
    elevation: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    pointerEvents: 'none',
  },
  studioFloorShadow: {
    position: 'absolute',
    bottom: Math.round(SCREEN_WIDTH * 0.05),
    width: Math.round(SCREEN_WIDTH * 0.5),
    height: 35,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    elevation: 8,
    left: '50%',
    marginLeft: -Math.round(SCREEN_WIDTH * 0.25),
    pointerEvents: 'none',
  },
  modelPreview: {
    width: Math.round(SCREEN_WIDTH * 0.7),
    height: Math.round(SCREEN_WIDTH * 0.7),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  modelPreviewInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  // Info Card
  infoCard: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  infoBlur: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  relicTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    fontFamily: 'Poppins-Bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  completeBadge: {
    alignItems: 'center',
    gap: 4,
  },
  completeText: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: 'Poppins-Regular',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Regular',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Poppins-Bold',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  difficultyContainer: {
    alignItems: 'flex-start',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
    fontFamily: 'Poppins-SemiBold',
  },

  // Hotspots Section
  hotspotsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'Poppins-Bold',
  },
  hotspotItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  hotspotBlur: {
    overflow: 'hidden',
  },
  hotspotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  hotspotIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotspotInfo: {
    flex: 1,
  },
  hotspotName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
    fontFamily: 'Poppins-SemiBold',
  },
  hotspotNameDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  hotspotXP: {
    fontSize: 12,
    color: '#FFD700',
    fontFamily: 'Poppins-Regular',
  },
  hotspotContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 0,
  },
  hotspotDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },

  // Details Section
  detailsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  detailCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailBlur: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 2,
    fontFamily: 'Poppins-Regular',
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Poppins-Regular',
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 12,
  },

  // Action Buttons
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  actionButtonSecondary: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  actionButtonPrimary: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },

  // Bottom Padding
  bottomPadding: {
    height: 40,
  },
});

export default RelicDetailView;
