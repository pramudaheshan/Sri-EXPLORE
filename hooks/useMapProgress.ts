import { useState, useEffect, useCallback } from 'react';
import {
  MapProgressSummary,
  DistrictProgress,
  LocationScanData,
  SriLankanDistrict,
  DISTRICT_INFO_MAP,
  DistrictAchievement,
} from '../types/mapProgress';
import { arScanService } from '../services/firebaseService';

interface UseMapProgressReturn {
  mapProgress: MapProgressSummary | null;
  loading: boolean;
  error: string | null;
  refreshProgress: () => Promise<void>;
  getDistrictProgress: (districtId: SriLankanDistrict) => DistrictProgress | undefined;
  addScan: (scanData: LocationScanData) => Promise<void>;
}

/**
 * Calculate the distance between two lat/lng points in kilometers
 * Uses Haversine formula
 */
const getDistanceFromCoordinates = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Determine which district a location belongs to based on proximity
 * to district center coordinates
 */
const getDistrictFromCoordinates = (latitude: number, longitude: number): SriLankanDistrict | null => {
  let closestDistrict: SriLankanDistrict | null = null;
  let closestDistance = Infinity;

  Object.values(SriLankanDistrict).forEach((districtId) => {
    const districtInfo = DISTRICT_INFO_MAP[districtId];
    if (districtInfo) {
      const distance = getDistanceFromCoordinates(
        latitude,
        longitude,
        districtInfo.centerLatitude,
        districtInfo.centerLongitude,
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestDistrict = districtId;
      }
    }
  });

  return closestDistrict;
};

/**
 * Custom hook to manage Sri Lankan map progress data
 * Fetches and computes progress statistics from Firebase
 * Tracks scan completion and coverage metrics per district
 */
export const useMapProgress = (userId?: string): UseMapProgressReturn => {
  const [mapProgress, setMapProgress] = useState<MapProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize empty district progress for all 25 districts
  const initializeDistrictProgress = useCallback((): DistrictProgress[] => {
    return Object.values(SriLankanDistrict).map((districtId) => {
      const districtInfo = DISTRICT_INFO_MAP[districtId];
      return {
        districtId,
        districtName: districtInfo?.districtName || districtId,
        scansCompleted: 0,
        totalRelicsInDistrict: 0, // This would be loaded from Firestore config
        totalHotspotsInDistrict: 0, // This would be loaded from Firestore config
        hotspotsExplored: 0,
        coveragePercentage: 0,
        xpEarned: 0,
        isUnlocked: true, // All districts unlocked (per user requirement)
        achievements: [],
      };
    });
  }, []);

  // Main fetch progress function - fetches from Firebase
  const fetchProgress = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Initialize empty district progress for all 25 districts
      const districtProgress = initializeDistrictProgress();

      // Step 2: Define total hotspots per district (configuration)
      const DISTRICT_HOTSPOT_TOTALS: Record<SriLankanDistrict, number> = {
        [SriLankanDistrict.COLOMBO]: 8,
        [SriLankanDistrict.GAMPAHA]: 6,
        [SriLankanDistrict.KALUTARA]: 5,
        [SriLankanDistrict.KANDY]: 8,
        [SriLankanDistrict.MATARA]: 5,
        [SriLankanDistrict.NUWARA_ELIYA]: 6,
        [SriLankanDistrict.GALLE]: 7,
        [SriLankanDistrict.HAMBANTOTA]: 5,
        [SriLankanDistrict.MATARA_SOUTH]: 4,
        [SriLankanDistrict.POLONNARUWA]: 5,
        [SriLankanDistrict.ANURADHAPURA]: 6,
        [SriLankanDistrict.JAFFNA]: 6,
        [SriLankanDistrict.MULLAITIVU]: 4,
        [SriLankanDistrict.VAVUNIYA]: 4,
        [SriLankanDistrict.BATTICALOA]: 5,
        [SriLankanDistrict.AMPARAI]: 5,
        [SriLankanDistrict.TRINCOMALEE]: 6,
        [SriLankanDistrict.KURUNEGALA]: 7,
        [SriLankanDistrict.PUTTALAM]: 5,
        [SriLankanDistrict.BADULLA]: 6,
        [SriLankanDistrict.MONERAGALA]: 4,
        [SriLankanDistrict.RATNAPURA]: 5,
        [SriLankanDistrict.KEGALLE]: 5,
      };

      // Step 3: Fetch user's scans from Firebase using existing firebaseService
      const arScans = await arScanService.getUserScans(userId, 1000); // Fetch up to 1000 scans

      // Step 4: Aggregate scans by district
      const districtMap = new Map<SriLankanDistrict, any[]>();

      arScans.forEach((scan: any) => {
        // Determine which district this scan belongs to
        const districtId = getDistrictFromCoordinates(
          scan.location.latitude,
          scan.location.longitude,
        );

        if (districtId) {
          if (!districtMap.has(districtId)) {
            districtMap.set(districtId, []);
          }
          districtMap.get(districtId)!.push(scan);
        }
      });

      // Step 5: Update district progress with aggregated data
      const updatedProgress = districtProgress.map((dp) => {
        const districtScans = districtMap.get(dp.districtId) || [];
        const totalHotspotsInDistrict = DISTRICT_HOTSPOT_TOTALS[dp.districtId] || 6;
        
        // Count total hotspots explored (sum of hotspotsExplored from all scans in district)
        const hotspotsExplored = districtScans.reduce(
          (sum, scan) => sum + (scan.hotspotsExplored || 1),
          0,
        );

        // Total XP earned in district
        const xpEarned = districtScans.reduce(
          (sum, scan) => sum + (scan.xpEarned || 0),
          0,
        );

        // Coverage percentage (capped at 100%)
        const coveragePercentage = Math.min(
          100,
          (hotspotsExplored / totalHotspotsInDistrict) * 100,
        );

        // Get latest scan date in this district
        const lastActivityDate = districtScans.length > 0
          ? new Date(districtScans[0].completedAt?.toDate?.() || new Date())
          : undefined;

        return {
          ...dp,
          totalHotspotsInDistrict,
          scansCompleted: districtScans.length,
          hotspotsExplored,
          xpEarned,
          coveragePercentage,
          lastActivityDate,
          achievements: calculateAchievements({
            ...dp,
            totalHotspotsInDistrict,
            scansCompleted: districtScans.length,
            hotspotsExplored,
            xpEarned,
            coveragePercentage,
          }),
        };
      });

      // Step 6: Calculate overall stats
      const totalScansAcrossMap = arScans.length;
      const totalHotspotsExplored = updatedProgress.reduce(
        (sum, d) => sum + d.hotspotsExplored,
        0,
      );
      const totalHotspotsCap = updatedProgress.reduce(
        (sum, d) => sum + d.totalHotspotsInDistrict,
        0,
      );
      const overallCoveragePercentage = totalHotspotsCap > 0
        ? (totalHotspotsExplored / totalHotspotsCap) * 100
        : 0;
      const totalMapXP = updatedProgress.reduce((sum, d) => sum + d.xpEarned, 0);
      const districtsExplored = updatedProgress.filter((d) => d.scansCompleted > 0).length;
      const districtsCovered100Percent = updatedProgress.filter(
        (d) => d.coveragePercentage === 100,
      ).length;

      // Step 7: Build final summary
      const summary: MapProgressSummary = {
        userId,
        totalScansAcrossMap,
        totalHotspotsExplored,
        overallCoveragePercentage,
        totalMapXP,
        districtsExplored,
        districtsCovered100Percent,
        lastUpdated: new Date(),
        districtProgress: updatedProgress,
      };

      setMapProgress(summary);
    } catch (err) {
      console.error('❌ Failed to fetch map progress:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, initializeDistrictProgress]);

  // Calculate achievement unlocks for a district
  const calculateAchievements = (
    districtProgress: DistrictProgress,
  ): DistrictAchievement[] => {
    const achievements: DistrictAchievement[] = [];

    // Achievement: First scan
    if (districtProgress.scansCompleted >= 1) {
      achievements.push({
        id: 'first_scan',
        name: 'Explorer',
        description: 'Completed first scan',
        icon: 'pin',
        isUnlocked: true,
        type: 'relic_count',
      });
    }

    // Achievement: 5 scans
    if (districtProgress.scansCompleted >= 5) {
      achievements.push({
        id: 'five_scans',
        name: 'Discoverer',
        description: 'Completed 5 scans',
        icon: 'cube',
        isUnlocked: true,
        type: 'relic_count',
        threshold: 5,
      });
    }

    // Achievement: 10 scans
    if (districtProgress.scansCompleted >= 10) {
      achievements.push({
        id: 'ten_scans',
        name: 'Artifact Master',
        description: 'Completed 10 scans',
        icon: 'trophy',
        isUnlocked: true,
        type: 'relic_count',
        threshold: 10,
      });
    }

    // Achievement: 50% coverage
    if (districtProgress.coveragePercentage >= 50) {
      achievements.push({
        id: 'half_coverage',
        name: 'Half Explorer',
        description: '50% coverage achieved',
        icon: 'checkmark-circle',
        isUnlocked: true,
        type: 'coverage_milestone',
        threshold: 50,
      });
    }

    // Achievement: 100% coverage
    if (districtProgress.coveragePercentage === 100) {
      achievements.push({
        id: 'full_coverage',
        name: 'District Master',
        description: '100% coverage - Fully explored!',
        icon: 'checkmark-done-circle',
        isUnlocked: true,
        type: 'coverage_milestone',
        threshold: 100,
      });
    }

    // Achievement: 500 XP
    if (districtProgress.xpEarned >= 500) {
      achievements.push({
        id: 'five_hundred_xp',
        name: 'XP Collector',
        description: '500 XP earned in district',
        icon: 'star',
        isUnlocked: true,
        type: 'xp_threshold',
        threshold: 500,
      });
    }

    return achievements;
  };

  // Handle new scan data
  const addScan = useCallback(
    async (scanData: LocationScanData) => {
      if (!mapProgress || !userId) return;

      try {
        // Step 1: Save scan to Firebase using existing arScanService
        await arScanService.recordScan(
          userId,
          scanData.relicId,
          scanData.relicName,
          {
            latitude: scanData.latitude,
            longitude: scanData.longitude,
          },
          scanData.xpEarned,
          scanData.hotspotsFound,
          1, // totalHotspots parameter
        );

        // Step 2: Refresh the map progress to show updated data from Firebase
        await fetchProgress();
      } catch (err) {
        console.error('❌ Failed to add scan:', err);
        throw err;
      }
    },
    [mapProgress, userId, fetchProgress],
  );

  // Get specific district progress
  const getDistrictProgress = useCallback(
    (districtId: SriLankanDistrict): DistrictProgress | undefined => {
      return mapProgress?.districtProgress.find((d) => d.districtId === districtId);
    },
    [mapProgress],
  );

  // Fetch progress on mount and when userId changes
  useEffect(() => {
    fetchProgress();
  }, [userId, fetchProgress]);

  return {
    mapProgress,
    loading,
    error,
    refreshProgress: fetchProgress,
    getDistrictProgress,
    addScan,
  };
};

export default useMapProgress;
