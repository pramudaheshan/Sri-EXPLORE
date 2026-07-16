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
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { arScanService, ARScan } from '../../../services/firebaseService';
import { useAuth } from '../../../hooks/useFirebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import modelCache from '../../../services/modelCache';
import { getModel3DUrl } from '../../../services/storageService';
import { ARSceneCanvas } from './RelicDetailView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

// ============================================
// TYPES
// ============================================
interface ScanHistoryProps {
  onBack: () => void;
  onSelectRelic: (scan: ARScan, scans?: ARScan[]) => void;
}

type SortOption = 'recent' | 'oldest' | 'xp-high' | 'xp-low' | 'name';

// ============================================
// HELPER FUNCTIONS
// ============================================
const parseTimestampToDate = (ts: any): Date => {
  if (!ts) return new Date(0);
  if (typeof ts === 'number' || typeof ts === 'string' || ts instanceof Date) {
    return new Date(ts as any);
  }
  if (ts?.toDate && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  return new Date(ts as any);
};

const formatDate = (timestamp: any): string => {
  const date = parseTimestampToDate(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getRelicIcon = (relicName: string): string => {
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
// RELIC CARD COMPONENT
// ============================================
interface RelicCardProps {
  scan: ARScan;
  onPress: () => void;
}

const RelicCard: React.FC<RelicCardProps> = ({ scan, onPress }) => {
  const isComplete = scan.hotspotsExplored === scan.totalHotspots;
  const icon = getRelicIcon(scan.relicName);
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);

  // Load 3D model for preview
  useEffect(() => {
    const loadModel = async () => {
      try {
        setModelLoading(true);
        // Get relic data to find model path
        const relicRef = doc(db, 'relics', scan.relicId);
        const relicSnap = await getDoc(relicRef);

        if (relicSnap.exists()) {
          const relicData = relicSnap.data();
          const modelPath = relicData.model3dUrl || relicData.model3dPath;

          if (modelPath) {
            // Get download URL and cache it
            const downloadUrl = await getModel3DUrl(modelPath);
            const cachedUri = await modelCache.preloadModel(
              downloadUrl,
              scan.relicId,
            );
            setModelUri(cachedUri);
          }
        }
      } catch (error) {
        console.error('[SCAN HISTORY] Error loading model preview:', error);
      } finally {
        setModelLoading(false);
      }
    };

    loadModel();
  }, [scan.relicId]);

  return (
    <TouchableOpacity
      style={styles.relicCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={30} tint="dark" style={styles.relicCardBlur}>
        {/* Icon Container */}
        <View style={styles.relicIconContainer}>
          {modelLoading ? (
            <ActivityIndicator size="small" color="#FFD700" />
          ) : modelUri ? (
            <View style={styles.model3DPreview}>
              <ARSceneCanvas
                modelUrl={modelUri}
                relicName={scan.relicName}
                showStudioLighting={false}
                disableGestures={true}
              />
            </View>
          ) : (
            <Ionicons name={icon as any} size={48} color="#FFD700" />
          )}
          {isComplete && (
            <View style={styles.completeBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
            </View>
          )}
        </View>

        {/* Relic Info */}
        <View style={styles.relicInfo}>
          <Text style={styles.relicName} numberOfLines={2}>
            {scan.relicName}
          </Text>

          <View style={styles.relicMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.metaText}>{scan.xpEarned} XP</Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="location" size={12} color="#FFD700" />
              <Text style={styles.metaText}>
                {scan.hotspotsExplored}/{scan.totalHotspots}
              </Text>
            </View>
          </View>

          <Text style={styles.relicDate}>{formatDate(scan.completedAt)}</Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(scan.hotspotsExplored / scan.totalHotspots) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

// ============================================
// SORT MENU COMPONENT
// ============================================
interface SortMenuProps {
  visible: boolean;
  currentSort: SortOption;
  onClose: () => void;
  onSelectSort: (sort: SortOption) => void;
}

const SortMenu: React.FC<SortMenuProps> = ({
  visible,
  currentSort,
  onClose,
  onSelectSort,
}) => {
  if (!visible) return null;

  const sortOptions: { value: SortOption; label: string; icon: string }[] = [
    { value: 'recent', label: 'Most Recent', icon: 'time' },
    { value: 'oldest', label: 'Oldest First', icon: 'time-outline' },
    { value: 'xp-high', label: 'Highest XP', icon: 'arrow-up' },
    { value: 'xp-low', label: 'Lowest XP', icon: 'arrow-down' },
    { value: 'name', label: 'Name (A-Z)', icon: 'text' },
  ];

  return (
    <TouchableOpacity
      style={styles.sortOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={styles.sortMenu}>
        <BlurView intensity={80} tint="dark" style={styles.sortMenuBlur}>
          <Text style={styles.sortMenuTitle}>Sort By</Text>

          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortMenuItem,
                currentSort === option.value && styles.sortMenuItemActive,
              ]}
              onPress={() => {
                onSelectSort(option.value);
                onClose();
              }}
            >
              <Ionicons
                name={option.icon as any}
                size={20}
                color={currentSort === option.value ? '#FFD700' : '#fff'}
              />
              <Text
                style={[
                  styles.sortMenuText,
                  currentSort === option.value && styles.sortMenuTextActive,
                ]}
              >
                {option.label}
              </Text>
              {currentSort === option.value && (
                <Ionicons name="checkmark" size={20} color="#FFD700" />
              )}
            </TouchableOpacity>
          ))}
        </BlurView>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// MAIN SCAN HISTORY COMPONENT
// ============================================
export const ScanHistory: React.FC<ScanHistoryProps> = ({
  onBack,
  onSelectRelic,
}) => {
  const { user } = useAuth();
  const [scans, setScans] = useState<ARScan[]>([]);
  const [filteredScans, setFilteredScans] = useState<ARScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Load scans from Firebase
  useEffect(() => {
    if (!user?.uid) return;

    const loadScans = async () => {
      setLoading(true);
      try {
        const userScans = await arScanService.getUserScans(user.uid, 100);
        setScans(userScans);
        setFilteredScans(userScans);
      } catch (error) {
        console.error('Error loading scans:', error);
      } finally {
        setLoading(false);
      }
    };

    loadScans();
  }, [user?.uid]);

  // Filter and sort scans
  useEffect(() => {
    let result = [...scans];

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.filter((scan) =>
        scan.relicName.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => {
          const dateA = parseTimestampToDate(a.completedAt);
          const dateB = parseTimestampToDate(b.completedAt);
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case 'oldest':
        result.sort((a, b) => {
          const dateA = parseTimestampToDate(a.completedAt);
          const dateB = parseTimestampToDate(b.completedAt);
          return dateA.getTime() - dateB.getTime();
        });
        break;
      case 'xp-high':
        result.sort((a, b) => b.xpEarned - a.xpEarned);
        break;
      case 'xp-low':
        result.sort((a, b) => a.xpEarned - b.xpEarned);
        break;
      case 'name':
        result.sort((a, b) => a.relicName.localeCompare(b.relicName));
        break;
    }

    setFilteredScans(result);
  }, [scans, searchQuery, sortBy]);

  // Calculate stats
  const totalXP = scans.reduce((sum, scan) => sum + scan.xpEarned, 0);
  const totalHotspots = scans.reduce(
    (sum, scan) => sum + scan.hotspotsExplored,
    0,
  );
  const completedScans = scans.filter(
    (scan) => scan.hotspotsExplored === scan.totalHotspots,
  ).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading your collection...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Collection</Text>
          <Text style={styles.headerSubtitle}>{scans.length} Relics</Text>
        </View>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortMenu(true)}
        >
          <Ionicons name="funnel" size={24} color="#FFD700" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <BlurView intensity={20} tint="dark" style={styles.searchBlur}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search relics..."
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons
                name="close-circle"
                size={20}
                color="rgba(255, 255, 255, 0.5)"
              />
            </TouchableOpacity>
          )}
        </BlurView>
      </View>

      {/* Relic Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredScans.length > 0 ? (
          <View style={styles.relicGrid}>
            {filteredScans.map((scan) => (
              <RelicCard
                key={scan.id}
                scan={scan}
                onPress={() => onSelectRelic(scan, filteredScans)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name={searchQuery ? 'search' : 'scan-outline'}
                size={64}
                color="rgba(255, 255, 255, 0.3)"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Results Found' : 'No Scans Yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? `No relics match "${searchQuery}"`
                : 'Start scanning relics to build your collection'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Sort Menu */}
      <SortMenu
        visible={showSortMenu}
        currentSort={sortBy}
        onClose={() => setShowSortMenu(false)}
        onSelectSort={setSortBy}
      />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Poppins-Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },
  sortButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Banner
  statsBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsBannerBlur: {
    flexDirection: 'row',
    padding: 16,
  },
  statBannerItem: {
    flex: 1,
    alignItems: 'center',
  },
  statBannerNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFD700',
    fontFamily: 'Poppins-Bold',
  },
  statBannerLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },
  statBannerDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },

  // Search
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Relic Grid
  relicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  relicCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 4,
  },
  relicCardBlur: {
    padding: 12,
  },
  relicIconContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  model3DPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 2,
  },
  relicInfo: {
    gap: 6,
  },
  relicName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    minHeight: 36,
  },
  relicMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
  relicDate: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'Poppins-Regular',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Poppins-SemiBold',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },

  // Sort Menu
  sortOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortMenu: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sortMenuBlur: {
    padding: 20,
    paddingBottom: 40,
  },
  sortMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    fontFamily: 'Poppins-Bold',
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sortMenuItemActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: '#FFD700',
  },
  sortMenuText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontFamily: 'Poppins-Regular',
  },
  sortMenuTextActive: {
    color: '#FFD700',
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },

  // Bottom Padding
  bottomPadding: {
    height: 40,
  },
});

export default ScanHistory;
