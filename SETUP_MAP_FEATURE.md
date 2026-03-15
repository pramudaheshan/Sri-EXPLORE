# Map Progress Integration - Quick Setup ⚡

## What's Ready
✅ **Map Screen**: `SriLankanMapScreen.tsx` - Displays all 25 districts with progress  
✅ **Map Component**: `SriLankanMapProgress.tsx` - Reusable UI component  
✅ **Map Hook**: `useMapProgress.ts` - Manages progress data  
✅ **Map Types**: `types/mapProgress.ts` - All TypeScript interfaces  
✅ **Dashboard Button**: Added to RevealDashboard with callback  

## Steps to Make It Functional

### 1️⃣ Update Navigation Stack
In your app's navigation file (likely `app/_layout.tsx` or navigation stack):

```typescript
import { SriLankanMapScreen } from '../screens/SriLankanMapScreen';

// Add to your Stack.Navigator:
<Stack.Screen
  name="MapProgress"
  component={SriLankanMapScreen}
  options={{ title: 'Map Progress' }}
/>
```

### 2️⃣ Connect Dashboard to Navigation
Where you use `RevealDashboard`, pass the callback:

```typescript
<RevealDashboard
  onStartScan={() => { /* navigate to scan */ }}
  onViewHistory={() => navigation.navigate('ScanHistory')}
  onSelectMapProgress={() => navigation.navigate('MapProgress')} // ← Add this
  onViewSettings={() => { /* navigate to settings */ }}
  // ... other callbacks
/>
```

### 3️⃣ Update Firebase Scans
When saving scans, include `districtId`:

```typescript
const locationScan = {
  relicId: 'relic_123',
  relicName: 'Temple Name',
  districtId: 'kandy',  // ← Must match SriLankanDistrict enum
  latitude: 7.2906,
  longitude: 80.6337,
  xpEarned: 100,
  hotspotsFound: 2,
  timestamp: new Date(),
};

// Save to Firebase
await db
  .collection('users')
  .doc(userId)
  .collection('scans')
  .add(locationScan);
```

### 4️⃣ Complete useMapProgress Hook
In `hooks/useMapProgress.ts`, replace the mock data in `fetchProgress`:

```typescript
const fetchProgress = useCallback(async () => {
  if (!userId) return;
  
  try {
    // Fetch user's scans from Firebase
    const scansSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('scans')
      .get();

    const scans = scansSnapshot.docs.map(doc => doc.data());
    
    // Process scans and group by district
    // (Logic already in the component, just wire to Firebase)
    
    const summary = {
      userId,
      totalScansAcrossMap: scans.length,
      districtProgress: calculateDistrictProgress(scans),
      // ... other calculated fields
    };
    
    setMapProgress(summary);
  } catch (err) {
    setError(err.message);
  }
}, [userId]);
```

## File Locations
- **Map Screen**: `screens/SriLankanMapScreen.tsx`
- **Map Component**: `components/reveal/SriLankanMapProgress.tsx`
- **Map Hook**: `hooks/useMapProgress.ts`
- **Map Types**: `types/mapProgress.ts`
- **Dashboard**: `components/reveal/RevealDashboard.tsx` (updated ✅)
- **Integration Guide**: `MAP_INTEGRATION_GUIDE.ts`
- **Documentation**: `MAP_PROGRESS_GUIDE.md`

## Test the Map
1. Press the **MAP** button on dashboard
2. Screen should navigate to SriLankanMapScreen
3. Display progress for all 25 districts (initially 0%)
4. Complete a scan with `districtId` set
5. Refresh to see progress update

## Notes
- All districts are unlocked (no progression gates)
- Coverage = (hotspots explored / total hotspots) × 100%
- Color changes: Red (0%) → Orange → Yellow → Green (100%)
- Achievements unlock automatically at milestones

## Troubleshooting
| Issue | Solution |
|-------|----------|
| Button doesn't navigate | Check navigation callback is passed |
| No progress shown | Ensure scans have `districtId` field |
| 0% coverage always | Configure total hotspots per district |
| Colors don't change | Verify `coveragePercentage` calculation |

---

**Status**: All components ready. Wire up navigation and Firebase to activate! 🚀
