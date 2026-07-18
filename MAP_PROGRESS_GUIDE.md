# Sri Lankan Map Progress Interface 🗺️

Complete guide for implementing scan completion progress tracking on a Sri Lankan map with 25-district division.

## Overview

The Sri Lankan Map Progress system provides interfaces and components to track and visualize player scan completion progress across all 25 districts of Sri Lanka. It supports:

- **25-District Division**: Colombo, Gampaha, Kalutara, Kandy, Matara, Nuwara Eliya, Galle, Hambantota, and more
- **Coverage Metrics**: Scan count and percentage coverage (hotspots explored)
- **Achievement Tracking**: Automatic milestone unlocking
- **Province Filtering**: View progress by province or all districts
- **Visual Progress Bars**: Color-coded coverage indicators

## File Structure

```
types/
  └─ mapProgress.ts                  # All TypeScript interfaces
hooks/
  └─ useMapProgress.ts               # React hook for managing progress data
components/reveal/
  └─ SriLankanMapProgress.tsx         # UI component to display progress
```

## Core Interfaces

### 1. `SriLankanDistrict` (Enum)
All 25 districts of Sri Lanka organized by province.

```typescript
import { SriLankanDistrict } from '../../types/mapProgress';

// Usage
const colomboId = SriLankanDistrict.COLOMBO;
const kandyId = SriLankanDistrict.KANDY;
```

### 2. `DistrictProgress`
Tracks progress metrics for a single district.

```typescript
interface DistrictProgress {
  districtId: SriLankanDistrict;
  districtName: string;
  scansCompleted: number;                    // How many scans done
  totalRelicsInDistrict: number;             // Total relics available
  totalHotspotsInDistrict: number;           // Total hotspots available
  hotspotsExplored: number;                  // Hotspots user explored
  coveragePercentage: number;                // (explored / total) * 100
  xpEarned: number;                          // Total XP in this district
  isUnlocked: boolean;                       // All districts unlocked
  lastActivityDate?: Date;
  achievements?: DistrictAchievement[];
}
```

### 3. `MapProgressSummary`
Overall progress across the entire Sri Lanka map.

```typescript
interface MapProgressSummary {
  userId: string;
  totalScansAcrossMap: number;               // Sum of all scans
  totalHotspotsExplored: number;             // Sum of all hotspots
  overallCoveragePercentage: number;         // Percentage of total coverage
  totalMapXP: number;                        // Sum of all XP
  districtsExplored: number;                 // How many districts visited
  districtsCovered100Percent: number;        // Fully explored districts
  lastUpdated: Date;
  districtProgress: DistrictProgress[];      // Array of all 25 districts
  regionalSummaries?: RegionalSummary[];     // Optional: grouped by province
}
```

### 4. `LocationScanData`
Represents a single scan with location information.

```typescript
interface LocationScanData {
  scanId: string;
  userId: string;
  relicId: string;
  relicName: string;
  districtId: SriLankanDistrict;  // Which district the scan was in
  latitude: number;
  longitude: number;
  timestamp: Date;
  xpEarned: number;
  hotspotsFound: number;
  photoProof?: string;
}
```

## Usage Guide

### 1. Using the Custom Hook

```typescript
import { useMapProgress } from '../../hooks/useMapProgress';
import { useAuth } from '../../hooks/useFirebase';

const MyComponent = () => {
  const { user } = useAuth();
  const {
    mapProgress,      // MapProgressSummary object
    loading,          // Loading state
    error,            // Error message if any
    refreshProgress,  // Function to refresh data
    getDistrictProgress,  // Get single district progress
    addScan,          // Add new scan
  } = useMapProgress(user?.uid);

  if (loading) return <Text>Loading map progress...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  if (!mapProgress) return null;

  return (
    <View>
      <Text>{mapProgress.totalScansAcrossMap} total scans</Text>
      <Text>{mapProgress.overallCoveragePercentage.toFixed(1)}% coverage</Text>
    </View>
  );
};
```

### 2. Displaying the Progress Component

```typescript
import { SriLankanMapProgress } from '../../components/reveal/SriLankanMapProgress';

const DashboardScreen = () => {
  const { user } = useAuth();
  const { mapProgress } = useMapProgress(user?.uid);

  const handleDistrictPress = (district: DistrictProgress) => {
    console.log(`Selected: ${district.districtName}`);
    // Navigate to district detail view
  };

  if (!mapProgress) return null;

  return (
    <SriLankanMapProgress
      progressData={mapProgress}
      onDistrictPress={handleDistrictPress}
      showDetailedView={true}
    />
  );
};
```

### 3. Adding a Scan

```typescript
const { addScan } = useMapProgress(user?.uid);

const handleScanComplete = async (scanData) => {
  const locationScan: LocationScanData = {
    scanId: 'scan_123',
    userId: user?.uid || '',
    relicId: 'relic_456',
    relicName: 'Ancient Temple',
    districtId: SriLankanDistrict.KANDY,  // Important: specify district
    latitude: 7.2906,
    longitude: 80.6337,
    timestamp: new Date(),
    xpEarned: 100,
    hotspotsFound: 2,
    photoProof: 'https://...',
  };

  await addScan(locationScan);
};
```

### 4. Getting District Info

```typescript
import {
  getDistrictInfo,
  getDistrictsByProvince,
} from '../../types/mapProgress';

// Get info for a specific district
const districtInfo = getDistrictInfo(SriLankanDistrict.COLOMBO);
console.log(districtInfo.centerLatitude);   // 6.9271
console.log(districtInfo.province);         // 'Western'

// Get all districts in a province
const centralDistricts = getDistrictsByProvince('Central');
// Returns: [KANDY, MATARA, NUWARA_ELIYA]
```

## Component Features

### SriLankanMapProgress Props

```typescript
interface SriLankanMapProgressProps {
  progressData: MapProgressSummary;  // Required: progress data
  onDistrictPress?: (district: DistrictProgress) => void;  // Callback on district select
  showDetailedView?: boolean;  // Show detailed breakdown (default: true)
}
```

### Component Sections

1. **Overall Progress Stats**
   - Total coverage percentage
   - Districts explored counter
   - Total scans counter
   - Total hotspots counter
   - Total XP earned

2. **Top Explored Districts**
   - Shows top 3 districts by coverage
   - Progress bars and coverage percentage

3. **Province Filter**
   - Filter districts by province
   - "All" option to show all districts

4. **Districts List**
   - Scrollable list of all 25 districts
   - Color-coded by coverage level:
     - 🟢 100% - Complete (Green)
     - 🟢 75%+ - Excellent (Light Green)
     - 🟡 50%+ - Good (Orange)
     - 🟠 25%+ - Started (Dark Orange)
     - 🔴 0%+ - Explored (Red)

5. **Coverage Legend**
   - Visual guide for color meanings

## Coverage Color Codes

| Coverage | Color | Meaning |
|----------|-------|---------|
| 100% | 🟢 #00C853 | Complete - Fully Explored |
| 75%+ | 🟢 #4CAF50 | Excellent - Almost Done |
| 50%+ | 🟡 #FFB300 | Good - Halfway |
| 25%+ | 🟠 #FF6F00 | Started - Some Progress |
| 0%+ | 🔴 #FF5252 | Explored - Just Started |

## Achievement System

Achievements unlock automatically as progress thresholds are met:

- **Explorer**: First scan in district
- **Discoverer**: 5 scans completed
- **Artifact Master**: 10 scans completed
- **Half Explorer**: 50% coverage achieved
- **District Master**: 100% coverage achieved
- **XP Collector**: 500 XP earned

## Firebase Integration

To connect to Firebase, implement these functions in the hook:

```typescript
// In useMapProgress.ts - fetchProgress function:

// Fetch all scans for user
const scans = await db.collection('users').doc(userId).collection('scans').get();

// Aggregate by district
scans.forEach(scanDoc => {
  const scanData = scanDoc.data() as LocationScanData;
  const districtId = scanData.districtId;
  // Update districtProgress[districtId]
});

// Save updated progress
await db.collection('users').doc(userId).update({
  mapProgress: {
    lastUpdated: new Date(),
    totalScans: totalCount,
    // ... other fields
  }
});
```

## Example Firestore Schema

```
users/
  {userId}/
    scans/
      {scanId}/
        scanId: "scan_123"
        districtId: "kandy"
        relicName: "Temple of Kandy"
        hotspotsFound: 2
        xpEarned: 100
        timestamp: Timestamp
        photoProof: "url"

mapProgress/
  {userId}/
    totalScansAcrossMap: 45
    overallCoveragePercentage: 62.5
    lastUpdated: Timestamp
    districtProgress: {
      candy: {
        scansCompleted: 5
        hotspotsExplored: 12
        coveragePercentage: 80
        xpEarned: 500
      }
      ...
    }
```

## Tips & Best Practices

1. **Always include `districtId`** when creating scan records to enable location-based progress tracking
2. **Validate coordinates** using `DISTRICT_INFO_MAP` bounds before accepting scans
3. **Cache district info** to avoid repeated lookups
4. **Update progress after** each successful scan completion
5. **Show achievements** as badges or notifications when unlocked
6. **Consider pagination** if displaying 25 districts on low-end devices
7. **Persist `lastActivityDate`** for each district to show recent activity

## Performance Optimization

- Use memoization for computed values (top districts, filtered lists)
- Implement pagination for long district lists
- Cache Firebase queries with appropriate TTL
- Load high-resolution map assets asynchronously
- Debounce rapid district selections

## Future Enhancements

- Interactive SVG/Canvas map with clickable districts
- Real-time progress animations
- Leaderboards by district
- Weekly/monthly challenges per district
- Expedition mode (multi-district quests)
- District-specific story content

---

For questions or issues, refer to the component source code with inline comments.
