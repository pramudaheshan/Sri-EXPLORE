import React, { useState, useMemo, useEffect } from 'react';
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
import Svg, { Path, Text as SvgText, G } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapProgressSummary,
  DistrictProgress,
  DISTRICT_INFO_MAP,
  SriLankanDistrict,
} from '../../../types/mapProgress';
import { DISTRICT_SVG_PATHS } from './constants/districtSvgPaths';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// SRI LANKA MAP CANVAS WITH SVG DISTRICTS
// ============================================
/**
 * Interactive SVG map of Sri Lanka showing districts with coverage visualization
 */
interface MapCanvasProps {
  districtProgress: DistrictProgress[];
  onDistrictSelect: (district: DistrictProgress) => void;
  onDeselect?: () => void;
  selectedDistrict: DistrictProgress | null;
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  districtProgress,
  onDistrictSelect,
  onDeselect,
  selectedDistrict,
}) => {
  const MAP_HEIGHT = 450;

  const getCoverageColor = (percentage: number): string => {
    // Black to Yellow gradient based on coverage percentage
    if (percentage === 0) return '#000000'; // Black
    if (percentage < 25) {
      // Blend from black to dark orange: 0% to 25%
      const ratio = percentage / 25;
      const r = Math.round(102 * ratio); // 0 to 102
      const g = Math.round(77 * ratio); // 0 to 77
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
    }
    if (percentage < 50) {
      // Blend from dark orange to medium orange: 25% to 50%
      const ratio = (percentage - 25) / 25;
      const r = Math.round(102 + (204 - 102) * ratio); // 102 to 204
      const g = Math.round(77 + (153 - 77) * ratio); // 77 to 153
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
    }
    if (percentage < 75) {
      // Blend from medium orange to light orange: 50% to 75%
      const ratio = (percentage - 50) / 25;
      const r = Math.round(204 + (255 - 204) * ratio); // 204 to 255
      const g = Math.round(153 + (183 - 153) * ratio); // 153 to 183
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
    }
    // Light yellow to bright yellow: 75% to 100%
    const ratio = (percentage - 75) / 25;
    const r = 255;
    const g = Math.round(183 + (215 - 183) * ratio); // 183 to 215
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
  };

  // Create lookup map for quick access
  const districtMap = useMemo(() => {
    const map: { [key: string]: DistrictProgress } = {};
    districtProgress.forEach((d) => {
      map[d.districtId] = d;
    });
    return map;
  }, [districtProgress]);

  const handleDistrictPress = (districtId: string) => {
    const district = districtMap[districtId];
    if (district) {
      onDistrictSelect(district);
    }
  };

  return (
    <View style={styles.mapContainer}>
      {/* Top Info Panel - Selected District Stats */}
      {selectedDistrict && (
        <View style={styles.topInfoPanel}>
          <TouchableOpacity
            onPress={() => onDeselect?.()}
            style={styles.closeButton}
          >
            <Ionicons name="close-circle" size={24} color="#FFD700" />
          </TouchableOpacity>
          <View style={styles.topInfoContent}>
            <Text style={styles.topInfoTitle}>
              {selectedDistrict.districtName}
            </Text>
            <View style={styles.topInfoStats}>
              <View style={styles.topStatBox}>
                <Text style={styles.topStatValue}>
                  {Math.round(selectedDistrict.coveragePercentage)}%
                </Text>
                <Text style={styles.topStatLabel}>Coverage</Text>
              </View>
              <View style={styles.topStatBox}>
                <Text style={styles.topStatValue}>
                  {selectedDistrict.scansCompleted}
                </Text>
                <Text style={styles.topStatLabel}>Scans</Text>
              </View>
              <View style={styles.topStatBox}>
                <Text style={styles.topStatValue}>
                  {selectedDistrict.xpEarned}
                </Text>
                <Text style={styles.topStatLabel}>XP</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>
          {selectedDistrict
            ? `Hotspots: ${selectedDistrict.hotspotsExplored}/${selectedDistrict.totalHotspotsInDistrict}`
            : 'District Map'}
        </Text>
      </View>

      <View style={[styles.mapCanvas, { height: MAP_HEIGHT }]}>
        <Svg
          viewBox="0 0 450 800"
          width="100%"
          height="100%"
          style={{ backgroundColor: '#0a0a0a' }}
        >
          {/* Background - Ocean */}
          <Path d="M 0 0 L 450 0 L 450 800 L 0 800 Z" fill="#0a0a0a" />

          {/* Render each district */}
          {Object.entries(DISTRICT_SVG_PATHS).flatMap(
            ([districtKey, { path, title, bounds }]) => {
              const district = districtMap[districtKey];
              if (!district) return [];

              const coverage = district.coveragePercentage ?? 0;
              const color = getCoverageColor(coverage);
              const isSelected = selectedDistrict?.districtId === districtKey;
              const opacity = isSelected ? 0.6 : 1;
              const strokeWidth = isSelected ? 2.5 : 1.5;
              const strokeColor = isSelected ? '#FFD700' : '#515050';

              const elements = [
                <G key={`${districtKey}-path`}>
                  <Path
                    d={path}
                    fill={color}
                    fillOpacity={opacity}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    onPress={() => handleDistrictPress(districtKey)}
                  />
                </G>,
              ];

              // Coverage percentage hidden for now
              // elements.push(
              //   <SvgText
              //     key={`${districtKey}-text`}
              //     x={bounds.cx}
              //     y={bounds.cy + 4}
              //     fontSize={12}
              //     fontWeight="bold"
              //     textAnchor="middle"
              //     fill={coverage > 75 ? '#000' : '#fff'}
              //     pointerEvents="none"
              //   >
              //     {Math.round(coverage)}%
              //   </SvgText>,
              // );

              return elements;
            },
          )}
        </Svg>
      </View>

      {/* Map Legend */}
      <View style={styles.mapLegend}>
        <Text style={styles.mapLegendTitle}>
          {selectedDistrict
            ? `Tap to deselect or view details`
            : 'Tap any district to select'}
        </Text>
        <View style={styles.mapLegendItems}>
          <View style={styles.mapLegendItem}>
            <View
              style={[styles.mapLegendDot, { backgroundColor: '#000000' }]}
            />
            <Text style={styles.mapLegendText}>0% - Not Explored</Text>
          </View>
          <View style={styles.mapLegendItem}>
            <View
              style={[styles.mapLegendDot, { backgroundColor: '#664d00' }]}
            />
            <Text style={styles.mapLegendText}>25% - Started</Text>
          </View>
          <View style={styles.mapLegendItem}>
            <View
              style={[styles.mapLegendDot, { backgroundColor: '#CC9900' }]}
            />
            <Text style={styles.mapLegendText}>50% - Progress</Text>
          </View>
          <View style={styles.mapLegendItem}>
            <View
              style={[styles.mapLegendDot, { backgroundColor: '#FFB700' }]}
            />
            <Text style={styles.mapLegendText}>75% - Excellent</Text>
          </View>
          <View style={styles.mapLegendItem}>
            <View
              style={[styles.mapLegendDot, { backgroundColor: '#FFD700' }]}
            />
            <Text style={styles.mapLegendText}>100% - Complete</Text>
          </View>
        </View>
      </View>

      {/* Bottom Details Panel - Advanced District Info */}
      {selectedDistrict && (
        <View style={styles.bottomDetailsPanel}>
          <BlurView intensity={25} tint="dark" style={styles.detailsBlur}>
            <View style={styles.detailsGrid}>
              <View style={styles.detailBox}>
                <View style={styles.detailHeader}>
                  <Ionicons name="location" size={16} color="#FFD700" />
                  <Text style={styles.detailLabel}>Province</Text>
                </View>
                <Text style={styles.detailValue}>
                  {DISTRICT_INFO_MAP[selectedDistrict.districtId]?.province ||
                    'N/A'}
                </Text>
              </View>

              <View style={styles.detailBox}>
                <View style={styles.detailHeader}>
                  <Ionicons name="pin" size={16} color="#FFD700" />
                  <Text style={styles.detailLabel}>Hotspot Progress</Text>
                </View>
                <Text style={styles.detailValue}>
                  {selectedDistrict.hotspotsExplored}/
                  {selectedDistrict.totalHotspotsInDistrict}
                </Text>
              </View>

              <View style={styles.detailBox}>
                <View style={styles.detailHeader}>
                  <Ionicons name="calendar" size={16} color="#FFD700" />
                  <Text style={styles.detailLabel}>Last Activity</Text>
                </View>
                <Text style={styles.detailValue}>
                  {selectedDistrict.lastActivityDate
                    ? formatDate(selectedDistrict.lastActivityDate)
                    : 'Never'}
                </Text>
              </View>

              <View style={styles.detailBox}>
                <View style={styles.detailHeader}>
                  <Ionicons name="cube" size={16} color="#FFD700" />
                  <Text style={styles.detailLabel}>Total Scans</Text>
                </View>
                <Text style={styles.detailValue}>
                  {selectedDistrict.scansCompleted}
                </Text>
              </View>
            </View>
          </BlurView>
        </View>
      )}
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
  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictProgress | null>(null);
  const [filterProvince, setFilterProvince] = useState<string | null>(null);
  const [showAllDistricts, setShowAllDistricts] = useState(false);

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
    // Black to Yellow gradient based on coverage percentage
    if (percentage === 0) return '#000000'; // Black
    if (percentage < 25) {
      // Blend from black to dark orange: 0% to 25%
      const ratio = percentage / 25;
      const r = Math.round(102 * ratio); // 0 to 102
      const g = Math.round(77 * ratio); // 0 to 77
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
    }
    if (percentage < 50) {
      // Blend from dark orange to medium orange: 25% to 50%
      const ratio = (percentage - 25) / 25;
      const r = Math.round(102 + (204 - 102) * ratio); // 102 to 204
      const g = Math.round(77 + (153 - 77) * ratio); // 77 to 153
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
    }
    if (percentage < 75) {
      // Blend from medium orange to light orange: 50% to 75%
      const ratio = (percentage - 50) / 25;
      const r = Math.round(204 + (255 - 204) * ratio); // 204 to 255
      const g = Math.round(153 + (183 - 153) * ratio); // 153 to 183
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
    }
    // Light yellow to bright yellow: 75% to 100%
    const ratio = (percentage - 75) / 25;
    const r = 255;
    const g = Math.round(183 + (215 - 183) * ratio); // 183 to 215
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}00`;
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
              style={[styles.coverageBadge, { borderColor: coverageColor }]}
            >
              <Text
                style={[styles.coveragePercentage, { color: coverageColor }]}
              >
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
              {district.hotspotsExplored}/{district.totalHotspotsInDistrict}{' '}
              hotspots
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
      {/* Compact Overall Progress Stats */}
      <View style={styles.compactStats}>
        <View style={styles.compactProgressBar}>
          <View style={styles.compactProgressBg}>
            <LinearGradient
              colors={[
                getCoverageColor(progressData.overallCoveragePercentage),
                getCoverageColor(progressData.overallCoveragePercentage) + 'DD',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.compactProgressFill,
                {
                  width: `${Math.min(100, progressData.overallCoveragePercentage)}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.compactPercentage}>
            {Math.round(progressData.overallCoveragePercentage)}% Complete
          </Text>
        </View>
        <View style={styles.compactStatsRow}>
          <View style={styles.compactStat}>
            <Text style={styles.compactStatValue}>
              {progressData.districtsExplored}/25
            </Text>
            <Text style={styles.compactStatLabel}>Districts</Text>
          </View>
          <View style={styles.compactStatDivider} />
          <View style={styles.compactStat}>
            <Text style={styles.compactStatValue}>
              {progressData.totalScansAcrossMap}
            </Text>
            <Text style={styles.compactStatLabel}>Scans</Text>
          </View>
          <View style={styles.compactStatDivider} />
          <View style={styles.compactStat}>
            <Text style={styles.compactStatValue}>
              {progressData.totalHotspotsExplored}
            </Text>
            <Text style={styles.compactStatLabel}>Hotspots</Text>
          </View>
        </View>
      </View>

      {/* Interactive Map - PRIMARY FOCUS */}
      <MapCanvas
        districtProgress={progressData.districtProgress}
        onDistrictSelect={(district) => {
          setSelectedDistrict(district);
          onDistrictPress?.(district);
        }}
        onDeselect={() => setSelectedDistrict(null)}
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

      {/* Districts List - Expandable */}
      <View style={styles.districtsSection}>
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setShowAllDistricts(!showAllDistricts)}
        >
          <Text style={styles.sectionTitle}>
            {filterProvince
              ? `${filterProvince} Districts (${filteredDistricts.length})`
              : `All Districts (${filteredDistricts.length})`}
          </Text>
          <Ionicons
            name={showAllDistricts ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#FFD700"
          />
        </TouchableOpacity>

        {showAllDistricts && (
          <FlatList
            data={filteredDistricts}
            keyExtractor={(item) => item.districtId}
            renderItem={({ item }) => <DistrictCard district={item} />}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <BlurView intensity={25} tint="dark" style={styles.legendBlur}>
          <Text style={styles.legendTitle}>Coverage Legend</Text>
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: '#000000' }]}
              />
              <Text style={styles.legendLabel}>0% - Not Explored</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: '#664d00' }]}
              />
              <Text style={styles.legendLabel}>25% - Started</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: '#CC9900' }]}
              />
              <Text style={styles.legendLabel}>50% - Progress</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: '#FFB700' }]}
              />
              <Text style={styles.legendLabel}>75% - Excellent</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendColor, { backgroundColor: '#FFD700' }]}
              />
              <Text style={styles.legendLabel}>100% - Complete</Text>
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

  // Compact Overall Stats Section
  compactStats: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  compactProgressBar: {
    marginBottom: 12,
  },
  compactProgressBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  compactProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  compactPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
    fontFamily: 'Poppins-SemiBold',
  },
  compactStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  compactStat: {
    alignItems: 'center',
    flex: 1,
  },
  compactStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Poppins-Bold',
  },
  compactStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },
  compactStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    borderColor: 'rgba(255, 215, 0, 0.2)',
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
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
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
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    fontFamily: 'Poppins-SemiBold',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  mapCanvas: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  customMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },
  mapLegend: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mapLegendTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
  },
  mapLegendItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  mapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  mapLegendText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
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
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    marginBottom: 8,
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
    borderColor: 'rgba(255, 215, 0, 0.15)',
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
    color: 'rgba(255, 255, 255, 0.68)',
    fontFamily: 'Poppins-Regular',
  },

  // Top Info Panel
  topInfoPanel: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 217, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topInfoContent: {
    flex: 1,
    flexDirection: 'column',
  },
  topInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 10,
    fontFamily: 'Poppins-Bold',
  },
  topInfoStats: {
    flexDirection: 'row',
    gap: 12,
  },
  topStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  topStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD700',
    fontFamily: 'Poppins-Bold',
  },
  topStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  // Bottom Details Panel
  bottomDetailsPanel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  detailsBlur: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailBox: {
    width: (SCREEN_WIDTH - 72) / 2,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Poppins-Regular',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
    fontFamily: 'Poppins-Bold',
  },
});

export default SriLankanMapProgress;
