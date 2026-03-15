// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapProgressSummary,
  DistrictProgress,
  DISTRICT_INFO_MAP,
  SriLankanDistrict,
} from '../../../types/mapProgress';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// SRI LANKA MAP CANVAS
// ============================================
/**
 * Interactive map of Sri Lanka showing districts with coverage visualization
 */
interface MapCanvasProps {
  districtProgress: DistrictProgress[];
  onDistrictSelect: (district: DistrictProgress) => void;
  selectedDistrict: DistrictProgress | null;
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  districtProgress,
  onDistrictSelect,
  selectedDistrict,
}) => {
  // Sri Lanka bounding box (approximate)
  const SRI_LANKA_BOUNDS = {
    north: 7.5,
    south: 5.9,
    east: 81.9,
    west: 79.7,
  };

  const MAP_WIDTH = SCREEN_WIDTH - 64;
  const MAP_HEIGHT = 320;

  // Convert lat/lng to screen coordinates
  const latLngToScreen = (lat: number, lng: number) => {
    const x =
      ((lng - SRI_LANKA_BOUNDS.west) /
        (SRI_LANKA_BOUNDS.east - SRI_LANKA_BOUNDS.west)) *
      MAP_WIDTH;
    const y =
      ((SRI_LANKA_BOUNDS.north - lat) /
        (SRI_LANKA_BOUNDS.north - SRI_LANKA_BOUNDS.south)) *
      MAP_HEIGHT;
    return { x, y };
  };

  const getCoverageColor = (percentage: number): string => {
    if (percentage === 100) return '#00C853';
    if (percentage >= 75) return '#4CAF50';
    if (percentage >= 50) return '#FFB300';
    if (percentage >= 25) return '#FF6F00';
    return '#FF5252';
  };

  return (
    <View style={styles.mapContainer}>
      <BlurView intensity={25} tint="dark" style={styles.mapBlur}>
        <Text style={styles.mapTitle}>Interactive District Map</Text>

        <View style={styles.mapScroll}>
          <View style={[styles.mapCanvas, { width: MAP_WIDTH, height: MAP_HEIGHT }]}>
            <Svg 
              width={MAP_WIDTH} 
              height={MAP_HEIGHT} 
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              style={styles.svgCanvas}
            >
              {/* Light background */}
              <Rect
                x={0}
                y={0}
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                fill="rgba(255, 255, 255, 0.02)"
              />

              {/* Grid lines (optional) */}
              {[0, 0.25, 0.5, 0.75, 1].map((fraction, idx) => (
                <React.Fragment key={`grid-${idx}`}>
                  <Rect
                    x={fraction * MAP_WIDTH}
                    y={0}
                    width={0.5}
                    height={MAP_HEIGHT}
                    fill="rgba(255, 215, 0, 0.05)"
                  />
                  <Rect
                    x={0}
                    y={fraction * MAP_HEIGHT}
                    width={MAP_WIDTH}
                    height={0.5}
                    fill="rgba(255, 215, 0, 0.05)"
                  />
                </React.Fragment>
              ))}

              {/* Plot districts - show all 25 districts */}
              {Object.values(SriLankanDistrict).map((districtId) => {
                const districtInfo = DISTRICT_INFO_MAP[districtId];
                const districtData = districtProgress.find(
                  (d) => d.districtId === districtId,
                );

                if (!districtInfo) return null;

                const { x, y } = latLngToScreen(
                  districtInfo.centerLatitude,
                  districtInfo.centerLongitude,
                );
                const coverage = districtData?.coveragePercentage ?? 0;
                const color = getCoverageColor(coverage);
                const isSelected = selectedDistrict?.districtId === districtId;
                const radius = isSelected ? 14 : 10;

                return (
                  <G key={districtId}>
                    {/* Outer glow when selected */}
                    {isSelected && (
                      <Circle
                        cx={x}
                        cy={y}
                        r={20}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        opacity="0.3"
                      />
                    )}

                    {/* Main circle */}
                    <Circle
                      cx={x}
                      cy={y}
                      r={radius}
                      fill={color}
                      opacity={isSelected ? 1 : 0.8}
                      strokeWidth={isSelected ? 2 : 0}
                      stroke="#fff"
                    />

                    {/* Progress indicator (inner circle) */}
                    {coverage > 0 && (
                      <Circle
                        cx={x}
                        cy={y}
                        r={radius - 2}
                        fill="none"
                        stroke={color}
                        strokeWidth="1"
                        opacity="0.5"
                      />
                    )}
                  </G>
                );
              })}
            </Svg>

            {/* Overlay touchable elements */}
            <View style={styles.touchableOverlay}>
              {Object.values(SriLankanDistrict).map((districtId) => {
                const districtInfo = DISTRICT_INFO_MAP[districtId];
                const districtData = districtProgress.find(
                  (d) => d.districtId === districtId,
                );

                if (!districtInfo || !districtData) return null;

                const { x, y } = latLngToScreen(
                  districtInfo.centerLatitude,
                  districtInfo.centerLongitude,
                );

                return (
                  <TouchableOpacity
                    key={districtId}
                    style={[
                      styles.districtTouchable,
                      {
                        left: x - 16,
                        top: y - 16,
                      },
                    ]}
                    onPress={() => onDistrictSelect(districtData)}
                  >
                    <View />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Map Legend */}
        <View style={styles.mapLegend}>
          <Text style={styles.mapLegendTitle}>Tap districts to explore</Text>
          <View style={styles.mapLegendItems}>
            <View style={styles.mapLegendItem}>
              <View
                style={[
                  styles.mapLegendDot,
                  { backgroundColor: '#FFB300' },
                ]}
              />
              <Text style={styles.mapLegendText}>Coverage %</Text>
            </View>
            <Text style={styles.mapLegendDivider}>•</Text>
            <View style={styles.mapLegendItem}>
              <Ionicons name="information-circle" size={14} color="#FFD700" />
              <Text style={styles.mapLegendText}>Select for details</Text>
            </View>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

interface SriLankanMapProgressProps {
  progressData: MapProgressSummary;
  onDistrictPress?: (district: DistrictProgress) => void;
  showDetailedView?: boolean;
}

/**
 * Component to showcase Sri Lankan map scan completion progress
 * Displays:
 * - Overall progress statistics
 * - District-by-district breakdown with coverage %
 * - Achievement milestones
 * - Top performing districts
 */
export const SriLankanMapProgress: React.FC<SriLankanMapProgressProps> = ({
  progressData,
  onDistrictPress,
  showDetailedView = true,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictProgress | null>(null);
  const [filterProvince, setFilterProvince] = useState<string | null>(null);

  // Filter districts by selected province
  const filteredDistricts = useMemo(() => {
    if (!filterProvince) return progressData.districtProgress;
    return progressData.districtProgress.filter(
      (d) => DISTRICT_INFO_MAP[d.districtId]?.province === filterProvince,
    );
  }, [progressData.districtProgress, filterProvince]);

  // Get unique provinces (sorted)
  const provinces = useMemo(() => {
    const provSet = new Set(
      progressData.districtProgress.map(
        (d) => DISTRICT_INFO_MAP[d.districtId]?.province,
      ),
    );
    return Array.from(provSet).sort();
  }, [progressData.districtProgress]);

  // Sort districts by coverage percentage (descending)
  const topDistricts = useMemo(() => {
    return [...progressData.districtProgress]
      .sort((a, b) => b.coveragePercentage - a.coveragePercentage)
      .slice(0, 5);
  }, [progressData.districtProgress]);

  const getCoverageColor = (percentage: number): string => {
    if (percentage === 100) return '#00C853';
    if (percentage >= 75) return '#4CAF50';
    if (percentage >= 50) return '#FFB300';
    if (percentage >= 25) return '#FF6F00';
    return '#FF5252';
  };

  const DistrictCard = ({ district }: { district: DistrictProgress }) => {
    const coverageColor = getCoverageColor(district.coveragePercentage);

    const handlePress = () => {
      setSelectedDistrict(district);
      onDistrictPress?.(district);
    };

    return (
      <TouchableOpacity
        style={styles.districtCard}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <BlurView intensity={25} tint="dark" style={styles.districtBlur}>
          <View style={styles.districtHeader}>
            <View style={styles.districtInfo}>
              <Text style={styles.districtName}>{district.districtName}</Text>
              <Text style={styles.districtProvince}>
                {DISTRICT_INFO_MAP[district.districtId]?.province}
              </Text>
            </View>
            <View
              style={[
                styles.coverageBadge,
                { borderColor: coverageColor },
              ]}
            >
              <Text style={[styles.coveragePercentage, { color: coverageColor }]}>
                {Math.round(district.coveragePercentage)}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[coverageColor, coverageColor + 'DD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, district.coveragePercentage)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {district.hotspotsExplored}/{district.totalHotspotsInDistrict} hotspots
            </Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="cube" size={16} color="#FFD700" />
              <Text style={styles.statLabel}>{district.scansCompleted}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.statLabel}>{district.xpEarned} XP</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color="#FFD700" />
              <Text style={styles.statLabel}>
                {district.lastActivityDate
                  ? formatDate(district.lastActivityDate)
                  : 'Never'}
              </Text>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      scrollEnabled={true}
      showsVerticalScrollIndicator={false}
    >
      {/* Overall Progress Stats */}
      <View style={styles.overallStats}>
        <BlurView intensity={30} tint="dark" style={styles.statsBlur}>
          <Text style={styles.statsTitle}>Map Coverage Progress</Text>

          {/* Main Progress Ring */}
          <View style={styles.progressRingContainer}>
            <View style={styles.progressRingBg}>
              <LinearGradient
                colors={[
                  getCoverageColor(progressData.overallCoveragePercentage),
                  getCoverageColor(progressData.overallCoveragePercentage) + 'DD',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.progressRingFill,
                  {
                    width: `${Math.min(100, progressData.overallCoveragePercentage)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressPercentageText}>
              {Math.round(progressData.overallCoveragePercentage)}%
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="map" size={24} color="#FFD700" />
              <Text style={styles.statValue}>
                {progressData.districtsExplored}/25
              </Text>
              <Text style={styles.statName}>Districts</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="location" size={24} color="#FFD700" />
              <Text style={styles.statValue}>
                {progressData.totalScansAcrossMap}
              </Text>
              <Text style={styles.statName}>Scans</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="pin" size={24} color="#FFD700" />
              <Text style={styles.statValue}>
                {progressData.totalHotspotsExplored}
              </Text>
              <Text style={styles.statName}>Hotspots</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.statValue}>
                {progressData.totalMapXP}
              </Text>
              <Text style={styles.statName}>Total XP</Text>
            </View>
          </View>

          {/* Achievement Unlocks */}
          <View style={styles.achievementContainer}>
            <View style={styles.achievementRow}>
              <Ionicons name="checkmark-circle" size={20} color="#00C853" />
              <Text style={styles.achievementText}>
                {progressData.districtsCovered100Percent} District
                {progressData.districtsCovered100Percent !== 1 ? 's' : ''} 100% Explored
              </Text>
            </View>
          </View>
        </BlurView>
      </View>

      {/* Interactive Map */}
      <MapCanvas
        districtProgress={progressData.districtProgress}
        onDistrictSelect={(district) => {
          setSelectedDistrict(district);
          onDistrictPress?.(district);
        }}
        selectedDistrict={selectedDistrict}
      />

      {/* Province Filter */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              !filterProvince && styles.filterButtonActive,
            ]}
            onPress={() => setFilterProvince(null)}
          >
            <Text
              style={[
                styles.filterText,
                !filterProvince && styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {provinces.map((province) => (
            <TouchableOpacity
              key={province}
              style={[
                styles.filterButton,
                filterProvince === province && styles.filterButtonActive,
              ]}
              onPress={() => setFilterProvince(province)}
            >
              <Text
                style={[
                  styles.filterText,
                  filterProvince === province && styles.filterTextActive,
                ]}
              >
                {province}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Top Performers */}
      {!filterProvince && topDistricts.length > 0 && (
        <View style={styles.topPerformersSection}>
          <Text style={styles.sectionTitle}>Top Explored Districts</Text>
          {topDistricts.slice(0, 3).map((district) => (
            <DistrictCard key={district.districtId} district={district} />
          ))}
        </View>
      )}

      {/* Districts List */}
      <View style={styles.districtsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filterProvince
              ? `${filterProvince} Districts (${filteredDistricts.length})`
              : `All Districts (${filteredDistricts.length})`}
          </Text>
        </View>

        <FlatList
          data={filteredDistricts}
          keyExtractor={(item) => item.districtId}
          renderItem={({ item }) => <DistrictCard district={item} />}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <BlurView intensity={25} tint="dark" style={styles.legendBlur}>
          <Text style={styles.legendTitle}>Coverage Legend</Text>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: '#00C853' }]}
              />
              <Text style={styles.legendLabel}>100% - Complete</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: '#4CAF50' }]}
              />
              <Text style={styles.legendLabel}>75%+ - Excellent</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: '#FFB300' }]}
              />
              <Text style={styles.legendLabel}>50%+ - Good</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: '#FF6F00' }]}
              />
              <Text style={styles.legendLabel}>25%+ - Started</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: '#FF5252' }]}
              />
              <Text style={styles.legendLabel}>0%+ - Explored</Text>
            </View>
          </View>
        </BlurView>
      </View>
    </ScrollView>
  );
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}m ago`;
};

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    paddingBottom: 20,
  },

  // Overall Stats Section
  overallStats: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  statsBlur: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    fontFamily: 'Poppins-SemiBold',
  },

  // Progress Ring
  progressRingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressRingBg: {
    width: 200,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressRingFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercentageText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFD700',
    fontFamily: 'Poppins-Bold',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 16,
  },
  statBox: {
    width: (SCREEN_WIDTH - 72) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginVertical: 4,
    fontFamily: 'Poppins-Bold',
  },
  statName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },

  // Achievements
  achievementContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementText: {
    fontSize: 13,
    color: '#fff',
    fontFamily: 'Poppins-Medium',
  },

  // Map Canvas
  mapContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  mapBlur: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 16,
  },
  mapTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  mapScroll: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCanvas: {
    position: 'relative',
    backgroundColor: 'rgba(255, 215, 0, 0.02)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  svgCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  touchableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  districtTouchable: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLegend: {
    marginTop: 8,
  },
  mapLegendTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
    marginBottom: 6,
  },
  mapLegendItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mapLegendText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Regular',
  },
  mapLegendDivider: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 12,
  },

  // Filter
  filterContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  filterText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Medium',
  },
  filterTextActive: {
    color: '#000',
  },

  // Top Performers
  topPerformersSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  // Districts Section
  districtsSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  listContent: {
    gap: 8,
  },

  // District Card
  districtCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 4,
  },
  districtBlur: {
    padding: 12,
  },
  districtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  districtInfo: {
    flex: 1,
  },
  districtName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  districtProvince: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },
  coverageBadge: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coveragePercentage: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
  },

  // Progress Bar
  progressBarContainer: {
    marginBottom: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Regular',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },

  // Legend
  legend: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  legendBlur: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  legendGrid: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
  },
});

export default SriLankanMapProgress;
