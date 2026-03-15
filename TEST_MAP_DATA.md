# How to Test the Sri Lankan Map - Quick Guide

## Problem: Map Shows But No Districts Appear

The map is now **fully implemented and visible**, but you need scan data to see colored districts. Here are 3 ways to test it:

---

## **Option 1: Add Test Data via Firebase Console** (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Firestore Database
3. Create a new collection called `arScans` (if it doesn't exist)
4. Click **Add Document** and fill in:

```json
{
  "userId": "YOUR_USER_ID_HERE",
  "relicId": "relic_test_001",
  "relicName": "Ancient Temple",
  "location": {
    "latitude": 6.9271,
    "longitude": 80.7789
  },
  "xpEarned": 100,
  "hotspotsExplored": 3,
  "totalHotspots": 8,
  "completedAt": "2026-03-15"
}
```

**Get YOUR_USER_ID:**
- In the app, check your user UID from Firebase Auth
- Or find it in user profile if logged in

**Important:** The `location` latitude/longitude **must be in Sri Lanka bounds**:
- Latitude: 5.9° to 7.5° North
- Longitude: 79.7° to 81.9° East

**Sample Coordinates for Testing:**
```
Colombo: 6.9271, 80.7789
Kandy: 7.2906, 80.6337
Galle: 6.0563, 80.2193
Jaffna: 9.6615, 80.1852
```

---

## **Option 2: Add Multiple Test Scans**

Add 5-8 scans to the same district to see coverage % increase:

```json
{
  "userId": "YOUR_USER_ID_HERE",
  "relicId": "relic_test_002",
  "relicName": "Temple Ruin",
  "location": {
    "latitude": 6.93,
    "longitude": 80.77
  },
  "xpEarned": 150,
  "hotspotsExplored": 2,
  "totalHotspots": 8,
  "completedAt": "2026-03-14"
}
```

Add 8 similar scans with `hotspotsExplored: 1` each = 100% coverage in that district.

---

## **Option 3: Complete the App Scan Flow**

The proper way once fully integrated:

1. Open the app
2. Go to **Reveal** tab
3. Start a **Scan** 
4. Complete a relic scan
5. The scan will be saved to Firebase automatically
6. Go to **Map** button
7. Refresh or reopen map to see your district appear

---

## **What the Map Shows**

Once you have scan data:

### **Color Coding (Coverage %)**
- 🟢 **Green (#00C853)** = 100% explored
- 🟢 **Light Green (#4CAF50)** = 75%+ explored
- 🟡 **Yellow (#FFB300)** = 50%+ explored
- 🟠 **Orange (#FF6F00)** = 25%+ explored
- 🔴 **Red (#FF5252)** = <25% explored

### **Interactive Features**
- **Tap any colored dot** = See district details
- **See progress %** for that district
- **View achievements** unlocked
- **Pop-up shows:** scans, XP, hotspots found, last activity

---

## **Map Structure**

The interactive map displays:

1. **SVG Map of Sri Lanka** with all 25 districts
2. **Colored circles** at district centers showing coverage
3. **Touch targets** (32×32 px) for tapping
4. **Glow effect** on selected district
5. **Legend** explaining coverage tiers
6. **District cards** below showing stats

---

## **Verify It's Working**

After adding test data:

1. **Close and reopen the app** (forces data refresh)
2. **Navigate to Reveal Dashboard**
3. **Tap the "Map" button** (or icon)
4. **Should see:**
   - Total scans/hotspots/XP at top
   - Interactive SVG map with colored circles
   - District cards with coverage percentages
   - Colored dots matching your test data coordinates

---

## **Troubleshooting**

### Map still not showing?

**Check 1: Is data in Firebase?**
```
Firebase Console → Firestore → arScans collection
Should see your test documents
```

**Check 2: User ID correct?**
```
Make sure Firebase arScan documents have YOUR userId
Open DevTools: check auth.currentUser.uid
```

**Check 3: Coordinates valid?**
```
Must be INSIDE Sri Lanka bounds:
- Lat: 5.9° to 7.5°
- Lng: 79.7° to 81.9°
```

**Check 4: Is useMapProgress hook called?**
```
In SriLankanMapScreen.tsx:
const { mapProgress, loading, error } = useMapProgress(user?.uid);
```

If `error` shows in console, check Firebase connection.

---

## **Next Steps**

Once you see districts on the map working:

1. ✅ Complete 100% of a district (8 scans × 1 hotspot each)
   - Should show as green (#00C853)

2. ✅ Tap a district to see detail modal
   - Achievement unlocks should appear

3. ✅ Try different provinces in filter
   - Filter buttons at top of districts list

4. ✅ Test "Top Explored Districts" section
   - Automatically shows your 5 best districts

---

## **Technical Details**

**How scanning location maps to districts:**

1. When you complete a scan, device records `latitude` and `longitude`
2. useMapProgress hook gets all your scans
3. For each scan, calculates **distance to all 25 district centers**
4. Assigns scan to **closest district** (uses Haversine formula)
5. Aggregates all scans per district
6. Calculates coverage: `(hotspots / total) × 100%`
7. Renders on map

**District Configuration:**

Each Sri Lankan district has:
- ✅ **Center coordinates** in DISTRICT_INFO_MAP
- ✅ **Total hotspots** (4-8 per district)
- ✅ **Province assignment** for filtering
- ✅ **Display name**

---

## **See Map in Real-Time**

Add one test scan → Refresh map → See colored dot appear instantly! 🗺️

The map updates automatically when you refresh it because useMapProgress fetches fresh data from Firebase every time.
