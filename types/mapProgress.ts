/**
 * Types and interfaces for Sri Lankan Map Progress Tracking
 * Supports 25-district division with scan count and coverage percentage metrics
 */

// ============================================
// DISTRICTS: All 25 Sri Lankan Districts
// ============================================
export enum SriLankanDistrict {
  // Western Province
  COLOMBO = 'colombo',
  GAMPAHA = 'gampaha',
  KALUTARA = 'kalutara',

  // Central Province
  KANDY = 'kandy',
  MATARA = 'matara',
  NUWARA_ELIYA = 'nuwara_eliya',

  // Southern Province
  GALLE = 'galle',
  HAMBANTOTA = 'hambantota',
  MATARA_SOUTH = 'matara_south',

  // North Central Province
  POLONNARUWA = 'polonnaruwa',
  ANURADHAPURA = 'anuradhapura',

  // Northern Province
  JAFFNA = 'jaffna',
  MULLAITIVU = 'mullaitivu',
  VAVUNIYA = 'vavuniya',

  // Eastern Province
  BATTICALOA = 'batticaloa',
  AMPARAI = 'amparai',
  TRINCOMALEE = 'trincomalee',

  // North Western Province
  KURUNEGALA = 'kurunegala',
  PUTTALAM = 'puttalam',

  // Uva Province
  BADULLA = 'badulla',
  MONERAGALA = 'moneragala',

  // Sabaragamuwa Province
  RATNAPURA = 'ratnapura',
  KEGALLE = 'kegalle',
}

// ============================================
// GEOGRAPHIC COORDINATES & BOUNDARIES
// ============================================
export interface DistrictCoordinates {
  districtId: SriLankanDistrict;
  districtName: string;
  province: string;
  centerLatitude: number;
  centerLongitude: number;
  // Optional: polygon boundaries for precise mapping
  boundsNorthEast?: { latitude: number; longitude: number };
  boundsSouthWest?: { latitude: number; longitude: number };
}

// ============================================
// PROGRESS TRACKING PER DISTRICT
// ============================================
export interface DistrictProgress {
  districtId: SriLankanDistrict;
  districtName: string;
  scansCompleted: number;
  totalRelicsInDistrict: number; // Total available relics for scanning
  totalHotspotsInDistrict: number; // Total available hotspots
  hotspotsExplored: number; // Hotspots user has explored
  coveragePercentage: number; // (hotspotsExplored / totalHotspotsInDistrict) * 100
  xpEarned: number; // Total XP earned in this district
  isUnlocked: boolean; // All districts available (no locking)
  lastActivityDate?: Date; // Last scan date in this district
  achievements?: DistrictAchievement[];
}

// ============================================
// ACHIEVEMENTS & MILESTONES
// ============================================
export interface DistrictAchievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  unlockedAt?: Date;
  isUnlocked: boolean;
  // Examples: "Discover 5 relics", "100% coverage", "Earn 500 XP"
  type: 'relic_count' | 'coverage_milestone' | 'xp_threshold' | 'custom';
  threshold?: number; // E.g., 5 relics, 100%, 500 XP
}

// ============================================
// REGIONAL GROUPING (Optional: Group districts into provinces)
// ============================================
export interface RegionalSummary {
  province: string;
  provinceId: string;
  districtCount: number;
  totalScans: number;
  averageCoverage: number; // Average coverage across all districts in province
  totalXP: number;
  unlockedDistricts: number;
  lastUpdated: Date;
}

// ============================================
// OVERALL MAP PROGRESS SUMMARY
// ============================================
export interface MapProgressSummary {
  userId: string;
  totalScansAcrossMap: number;
  totalHotspotsExplored: number;
  overallCoveragePercentage: number; // (totalHotspotsExplored / totalHotspotsInSriLanka) * 100
  totalMapXP: number;
  districtsExplored: number; // Count of districts with at least 1 scan
  districtsCovered100Percent: number; // Count of 100% covered districts
  lastUpdated: Date;
  districtProgress: DistrictProgress[];
  regionalSummaries?: RegionalSummary[];
  estimatedExplorationHours?: number; // Optional: total gameplay time
}

// ============================================
// MAP VIEW STATE
// ============================================
export interface MapViewState {
  selectedDistrict?: SriLankanDistrict;
  zoomLevel: number; // 1 = entire Sri Lanka, 2 = province, 3 = district
  centerLatitude: number;
  centerLongitude: number;
  showDetailPanel: boolean;
  detailPanelDistrict?: DistrictProgress;
}

// ============================================
// SCAN SESSION LOCATION DATA (extends existing RecentScan)
// ============================================
export interface LocationScanData {
  scanId: string;
  userId: string;
  relicId: string;
  relicName: string;
  districtId: SriLankanDistrict; // Which district was this scan in
  latitude: number;
  longitude: number;
  timestamp: Date;
  xpEarned: number;
  hotspotsFound: number;
  photoProof?: string; // URL to scan proof image
}

// ============================================
// HELPERS: District Information Lookup
// ============================================
export const DISTRICT_INFO_MAP: Record<SriLankanDistrict, DistrictCoordinates> = {
  [SriLankanDistrict.COLOMBO]: {
    districtId: SriLankanDistrict.COLOMBO,
    districtName: 'Colombo',
    province: 'Western',
    centerLatitude: 6.9271,
    centerLongitude: 80.7789,
  },
  [SriLankanDistrict.GAMPAHA]: {
    districtId: SriLankanDistrict.GAMPAHA,
    districtName: 'Gampaha',
    province: 'Western',
    centerLatitude: 7.0833,
    centerLongitude: 80.1667,
  },
  [SriLankanDistrict.KALUTARA]: {
    districtId: SriLankanDistrict.KALUTARA,
    districtName: 'Kalutara',
    province: 'Western',
    centerLatitude: 6.5833,
    centerLongitude: 80.3333,
  },
  [SriLankanDistrict.KANDY]: {
    districtId: SriLankanDistrict.KANDY,
    districtName: 'Kandy',
    province: 'Central',
    centerLatitude: 7.2906,
    centerLongitude: 80.6337,
  },
  [SriLankanDistrict.MATARA]: {
    districtId: SriLankanDistrict.MATARA,
    districtName: 'Matara',
    province: 'Southern',
    centerLatitude: 5.9497,
    centerLongitude: 80.5353,
  },
  [SriLankanDistrict.NUWARA_ELIYA]: {
    districtId: SriLankanDistrict.NUWARA_ELIYA,
    districtName: 'Nuwara Eliya',
    province: 'Central',
    centerLatitude: 6.9497,
    centerLongitude: 80.7764,
  },
  [SriLankanDistrict.GALLE]: {
    districtId: SriLankanDistrict.GALLE,
    districtName: 'Galle',
    province: 'Southern',
    centerLatitude: 6.0563,
    centerLongitude: 80.2193,
  },
  [SriLankanDistrict.HAMBANTOTA]: {
    districtId: SriLankanDistrict.HAMBANTOTA,
    districtName: 'Hambantota',
    province: 'Southern',
    centerLatitude: 5.9497,
    centerLongitude: 80.8353,
  },
  [SriLankanDistrict.MATARA_SOUTH]: {
    districtId: SriLankanDistrict.MATARA_SOUTH,
    districtName: 'Matara South',
    province: 'Southern',
    centerLatitude: 5.75,
    centerLongitude: 80.6167,
  },
  [SriLankanDistrict.POLONNARUWA]: {
    districtId: SriLankanDistrict.POLONNARUWA,
    districtName: 'Polonnaruwa',
    province: 'North Central',
    centerLatitude: 7.94,
    centerLongitude: 81.0033,
  },
  [SriLankanDistrict.ANURADHAPURA]: {
    districtId: SriLankanDistrict.ANURADHAPURA,
    districtName: 'Anuradhapura',
    province: 'North Central',
    centerLatitude: 8.3163,
    centerLongitude: 80.6167,
  },
  [SriLankanDistrict.JAFFNA]: {
    districtId: SriLankanDistrict.JAFFNA,
    districtName: 'Jaffna',
    province: 'Northern',
    centerLatitude: 9.6615,
    centerLongitude: 80.1852,
  },
  [SriLankanDistrict.MULLAITIVU]: {
    districtId: SriLankanDistrict.MULLAITIVU,
    districtName: 'Mullaitivu',
    province: 'Northern',
    centerLatitude: 8.3665,
    centerLongitude: 81.3665,
  },
  [SriLankanDistrict.VAVUNIYA]: {
    districtId: SriLankanDistrict.VAVUNIYA,
    districtName: 'Vavuniya',
    province: 'Northern',
    centerLatitude: 8.7533,
    centerLongitude: 80.8,
  },
  [SriLankanDistrict.BATTICALOA]: {
    districtId: SriLankanDistrict.BATTICALOA,
    districtName: 'Batticaloa',
    province: 'Eastern',
    centerLatitude: 7.7071,
    centerLongitude: 81.6888,
  },
  [SriLankanDistrict.AMPARAI]: {
    districtId: SriLankanDistrict.AMPARAI,
    districtName: 'Amparai',
    province: 'Eastern',
    centerLatitude: 7.2,
    centerLongitude: 81.6833,
  },
  [SriLankanDistrict.TRINCOMALEE]: {
    districtId: SriLankanDistrict.TRINCOMALEE,
    districtName: 'Trincomalee',
    province: 'Eastern',
    centerLatitude: 8.5711,
    centerLongitude: 81.2328,
  },
  [SriLankanDistrict.KURUNEGALA]: {
    districtId: SriLankanDistrict.KURUNEGALA,
    districtName: 'Kurunegala',
    province: 'North Western',
    centerLatitude: 7.4833,
    centerLongitude: 80.3667,
  },
  [SriLankanDistrict.PUTTALAM]: {
    districtId: SriLankanDistrict.PUTTALAM,
    districtName: 'Puttalam',
    province: 'North Western',
    centerLatitude: 8.0279,
    centerLongitude: 79.8278,
  },
  [SriLankanDistrict.BADULLA]: {
    districtId: SriLankanDistrict.BADULLA,
    districtName: 'Badulla',
    province: 'Uva',
    centerLatitude: 6.9933,
    centerLongitude: 81.2667,
  },
  [SriLankanDistrict.MONERAGALA]: {
    districtId: SriLankanDistrict.MONERAGALA,
    districtName: 'Moneragala',
    province: 'Uva',
    centerLatitude: 6.8256,
    centerLongitude: 81.35,
  },
  [SriLankanDistrict.RATNAPURA]: {
    districtId: SriLankanDistrict.RATNAPURA,
    districtName: 'Ratnapura',
    province: 'Sabaragamuwa',
    centerLatitude: 6.7167,
    centerLongitude: 80.4,
  },
  [SriLankanDistrict.KEGALLE]: {
    districtId: SriLankanDistrict.KEGALLE,
    districtName: 'Kegalle',
    province: 'Sabaragamuwa',
    centerLatitude: 7.2606,
    centerLongitude: 80.86,
  },
};

/**
 * Helper function to get district info by ID
 */
export const getDistrictInfo = (districtId: SriLankanDistrict): DistrictCoordinates | undefined => {
  return DISTRICT_INFO_MAP[districtId];
};

/**
 * Helper function to get all districts in a province
 */
export const getDistrictsByProvince = (province: string): SriLankanDistrict[] => {
  return Object.values(SriLankanDistrict).filter(
    (districtId) => DISTRICT_INFO_MAP[districtId as SriLankanDistrict].province === province,
  );
};
