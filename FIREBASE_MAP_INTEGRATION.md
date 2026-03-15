# Firebase Map Progress Integration Guide

## Overview

The Sri Lankan Map Progress system is now fully integrated with Firebase Firestore. The system automatically fetches user scan data from Firebase and displays district-level progress on an interactive SVG map of Sri Lanka.

## Architecture

### Data Flow

```
Firebase (arScans collection)
    ↓
arScanService.getUserScans(userId, 1000)
    ↓
useMapProgress Hook
    ├→ getDistrictFromCoordinates() [Haversine formula]
    ├→ Aggregate scans by district
    ├→ Calculate coverage percentages
    └→ Calculate achievements
    ↓
SriLankanMapScreen
    ├→ SriLankanMapProgress [District list + stats]
    └→ MapCanvas [Interactive SVG map]
    ↓
User Interface [Interactive District Selection]
```

## Key Components

### 1. **useMapProgress Hook** (`hooks/useMapProgress.ts`)

Manages all map progress data fetching and aggregation from Firebase.

**Key Functions:**

#### `getDistanceFromCoordinates(lat1, lng1, lat2, lng2)`
- Calculates distance between two geographic points using Haversine formula
- Used for determining which district a scan belongs to
- Returns distance in kilometers

#### `getDistrictFromCoordinates(latitude, longitude)`
- **Most Important:** Maps any latitude/longitude to the closest Sri Lankan district
- Uses Haversine formula to find nearest district center
- Returns `SriLankanDistrict` enum or `null`

#### `fetchProgress()`
- **Main Function** - Fetches Firebase data and aggregates it by district
- Step 1: Initialize empty progress for all 25 districts
- Step 2: Define `DISTRICT_HOTSPOT_TOTALS` per district (4-8 hotspots each)
- Step 3: Fetch user's scans via `arScanService.getUserScans(userId, 1000)`
- Step 4: Group scans by district using `getDistrictFromCoordinates()`
- Step 5: Calculate for each district:
  - `scansCompleted`: Number of scans in district
  - `hotspotsExplored`: Sum of hotspots from all scans
  - `coveragePercentage`: (hotspots / totalHotspots) × 100%
  - `xpEarned`: Sum of all XP from scans
- Step 6: Calculate overall map statistics
- Step 7: Return `MapProgressSummary` object

#### `addScan(scanData)`
- Saves new scan to Firebase via `arScanService.recordScan()`
- Automatically refreshes map progress to show new data

### 2. **SriLankanMapScreen Component**

Full-screen view with header, interactive map, and district details modal.

**Features:**
- Displays map progress data from useMapProgress hook
- Loading and error states
- Refresh button to reload data from Firebase
- District detail modal with achievements

### 3. **MapCanvas Component** (inside SriLankanMapProgress)

Interactive SVG visualization of Sri Lanka with all 25 districts.

**Features:**
- SVG-based map rendering
- Color-coded districts (5-tier coverage system):
  - 🟢 **100%**: #00C853 (Complete - Green)
  - 🟢 **75%+**: #4CAF50 (Excellent - Light Green)
  - 🟡 **50%+**: #FFB300 (Good - Yellow)
  - 🟠 **25%+**: #FF6F00 (Started - Orange)
  - 🔴 **<25%**: #FF5252 (Explored - Red)
- Interactive district markers (32×32 touch targets)
- Glow effect on selected district
- Geographic legend

## Data Models

### ARScan (from Firebase)
```typescript
{
  id: string;                           // Firestore doc ID
  userId: string;                       // User ID
  relicId: string;                      // Relic being scanned
  relicName: string;                    // Display name
  location: {
    latitude: number;
    longitude: number;
  };
  xpEarned: number;                     // XP reward
  hotspotsExplored: number;             // Hotspots found in this scan
  totalHotspots: number;                // Total hotspots available
  completedAt: Timestamp;               // When scan was completed
}
```

### MapProgressSummary (computed from Firebase data)
```typescript
{
  userId: string;
  totalScansAcrossMap: number;          // Total scans on map
  totalHotspotsExplored: number;        // Total hotspots found
  overallCoveragePercentage: number;    // Map-wide coverage %
  totalMapXP: number;                   // Total XP earned on map
  districtsExplored: number;            // # districts with >=1 scan
  districtsCovered100Percent: number;   // # 100% explored districts
  lastUpdated: Date;
  districtProgress: DistrictProgress[]; // Per-district data
}
```

### DistrictProgress
```typescript
{
  districtId: SriLankanDistrict;        // District enum
  districtName: string;                 // Display name
  scansCompleted: number;               // # of scans in this district
  totalHotspotsInDistrict: number;      // Total hotspots (from config)
  hotspotsExplored: number;             // # hotspots found
  coveragePercentage: number;           // (explored/total)×100
  xpEarned: number;                     // Total XP in district
  isUnlocked: boolean;                  // Always true (all districts available)
  lastActivityDate?: Date;              // Last scan date
  achievements?: DistrictAchievement[]; // Unlocked achievements
}
```

## District Configuration

**Total Hotspots Per District** (used for coverage calculations):

```typescript
const DISTRICT_HOTSPOT_TOTALS: Record<SriLankanDistrict, number> = {
  COLOMBO: 8,
  GAMPAHA: 6,
  KALUTARA: 5,
  KANDY: 8,
  MATARA: 5,
  NUWARA_ELIYA: 6,
  GALLE: 7,
  HAMBANTOTA: 5,
  // ... 15 more districts
};
```

**Location Configuration** (center coordinates used for distance calculations):

```typescript
DISTRICT_INFO_MAP[SriLankanDistrict.COLOMBO] = {
  districtName: 'Colombo',
  province: 'Western',
  centerLatitude: 6.9271,
  centerLongitude: 80.7789,
  // ... other districts
};
```

## How It Works - Step by Step

### 1. User Opens Map Screen
```
SriLankanMapScreen opens
  ↓
useMapProgress Hook initializes
  ↓
Calls fetchProgress() with user ID
  ↓
Firebase query: "Get all scans for this user"
```

### 2. Aggregating Scans by District
```
For each scan in Firebase:
  1. Extract location: { latitude, longitude }
  2. Call getDistrictFromCoordinates(lat, lng)
  3. Find closest district center using Haversine formula
  4. Add scan to district map: districtMap[districtId].push(scan)
```

### 3. Computing District Statistics
```
For each of 25 districts:
  • Count scans: districtScans.length
  • Sum hotspots: sum(scan.hotspotsExplored)
  • Calculate coverage: (hotspots / totalHotspots) × 100%
  • Sum XP: sum(scan.xpEarned)
  • Calculate achievements based on coverage milestones
```

### 4. Map Display
```
MapCanvas component renders:
  • 25 SVG circles positioned at district centers
  • Circle color based on coverage percentage
  • Circle size indicates selection state
  • Touch overlay enables interaction
```

### 5. User Interaction
```
User taps district on map
  ↓
MapCanvas onDistrictSelect callback
  ↓
Detail modal displays with district stats
  ↓
Shows achievements, coverage %, scan history
```

## Achievement System

Achievements unlock automatically based on progress:

| Achievement | Trigger | Icon |
|-------------|---------|------|
| Explorer | First scan in district | pin |
| Discoverer | 5 scans in district | cube |
| Artifact Master | 10 scans in district | trophy |
| Half Explorer | 50% coverage | checkmark-circle |
| District Master | 100% coverage | checkmark-done-circle |
| XP Collector | 500+ XP earned | star |

## Firebase Collections

### `/arScans` Collection Structure
```
arScans/
├── {scanId1}
│   ├── userId: "user123"
│   ├── relicId: "relic_001"
│   ├── relicName: "Ancient Temple"
│   ├── location: { latitude: 6.9271, longitude: 80.7789 }
│   ├── xpEarned: 100
│   ├── hotspotsExplored: 3
│   ├── totalHotspots: 5
│   └── completedAt: Timestamp(2026-03-15)
├── {scanId2}
│   └── ... (next scan)
└── {scanId3}
    └── ... (next scan)
```

## Integration Points

### In `reveal.tsx`
When a scan is completed, it's saved via `arScanService.recordScan()`:
```typescript
// Existing code already calls recordScan which saves to Firebase
await arScanService.recordScan(
  userId,
  relicId,
  relicName,
  { latitude, longitude },  // Used to determine district!
  xpEarned,
  hotspotsFound,
  totalHotspots
);
```

### Triggering Map Refresh
```typescript
// After completion modal, refresh map data
const { refreshProgress } = useMapProgress(userId);
await refreshProgress(); // Fetches latest Firebase data
```

## Troubleshooting

### Map Showing No Data
1. **Check Firebase Connection**
   - Verify Firebase is initialized in `firebaseConfig.ts`
   - Check network connectivity

2. **Verify Scan Data in Firebase**
   - Go to Firebase Console
   - Check `/arScans` collection
   - Verify scan documents have `location.latitude` and `location.longitude`

3. **Check District Mapping**
   - Ensure coordinates are within Sri Lanka bounds:
     - Latitude: 5.9° to 7.5°
     - Longitude: 79.7° to 81.9°
   - If coordinates are outside bounds, district will be `null`

### Incorrect Coverage Percentages
1. **Missing Hotspot Configuration**
   - Check `DISTRICT_HOTSPOT_TOTALS` has all 25 districts defined
   - Default is 6 if not specified

2. **Wrong Hotspot Counts**
   - Adjust `DISTRICT_HOTSPOT_TOTALS` values in `useMapProgress.ts`
   - These should match your game design

### Performance Issues
- Hook fetches up to 1000 scans (configurable)
- Map renders 25 district markers (lightweight SVG)
- Consider pagination if user has >1000 scans

## Next Steps for Customization

1. **Adjust Hotspot Counts**
   - Modify `DISTRICT_HOTSPOT_TOTALS` per district
   - Balance gameplay difficulty

2. **Add More Data**
   - Track additional metrics (time spent, rarity items found)
   - Separate scan counts from hotspot counts

3. **Enhance Achievements**
   - Add seasonal achievements
   - Add leaderboard rankings
   - Add badges with visual effects

4. **Improve Map Visualization**
   - Add pan/zoom functionality
   - Add heatmap overlay
   - Add animated transitions

## Files Modified

- ✅ `hooks/useMapProgress.ts` - Firebase integration + coordinate mapping
- ✅ `components/reveal/map-progress/SriLankanMapScreen.tsx` - Uses useMapProgress
- ✅ `components/reveal/map-progress/SriLankanMapProgress.tsx` - Displays data
- ✅ `types/mapProgress.ts` - Type definitions (unchanged)

## Testing

### Manual Testing Steps

1. **Add Test Scans** (in Firebase Console or via app)
   ```
   Create arScan document with:
   - userId: your user ID
   - location: { latitude: 6.9271, longitude: 80.7789 } (Colombo)
   - hotspotsExplored: 3
   - xpEarned: 100
   ```

2. **Open Map Screen**
   - Navigate to Reveal Dashboard
   - Tap "Map" button
   - Should see Colombo marked with color

3. **Verify Coverage Calculation**
   - Add 8 scans with hotspotsExplored: 1 each = 100% coverage
   - Map should show Colombo in complete green (#00C853)

4. **Test Interactive Selection**
   - Tap a colored district
   - Detail modal should appear with stats
   - Achievements should display

## Summary

The Firebase integration is now complete! The interactive map displays real-time data from Firestore, automatically aggregates scans by district, and provides comprehensive progress tracking across all 25 Sri Lankan districts.
