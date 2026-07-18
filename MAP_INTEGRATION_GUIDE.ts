/**
 * Navigation Integration Example for Sri Lankan Map Progress
 * Shows how to set up the map screen in your app's navigation stack
 */

// ============================================
// STEP 1: Update your navigation types (in your navigation file)
// ============================================
export type RevealStackParamList = {
  RevealDashboard: undefined;
  MapProgress: undefined;
  ScanHistory: undefined;
  RelicHunter: undefined;
  ARGallery: undefined;
};

// ============================================
// STEP 2: Create Navigation Stack (example)
// ============================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RevealDashboard } from '../../components/reveal/RevealDashboard';
import { SriLankanMapScreen } from '../../screens/SriLankanMapScreen';
// Import other screens as needed...

const Stack = createNativeStackNavigator<RevealStackParamList>();

export const RevealNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen
        name="RevealDashboard"
        component={RevealDashboard}
      />
      <Stack.Screen
        name="MapProgress"
        component={SriLankanMapScreen}
        options={{
          title: 'Map Progress',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#0a0a0a',
          },
          headerTintColor: '#FFD700',
          headerTitleStyle: {
            fontFamily: 'Poppins-Bold',
            fontSize: 18,
          },
        }}
      />
      {/* Add other screens here */}
    </Stack.Navigator>
  );
};

// ============================================
// STEP 3: Connect Dashboard to Navigation (in your parent component)
// ============================================
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RevealDashboardProps = NativeStackScreenProps<
  RevealStackParamList,
  'RevealDashboard'
>;

export const RevealDashboardWithNav: React.FC<RevealDashboardProps> = ({
  navigation,
}) => {
  const { user } = useAuth();

  return (
    <RevealDashboard
      onStartScan={() => {
        // Navigate to scan screen
        console.log('Starting new scan');
      }}
      onViewHistory={() => {
        navigation.navigate('ScanHistory');
      }}
      onSelectMapProgress={() => {
        // This now navigates to the map screen
        navigation.navigate('MapProgress');
      }}
      onViewSettings={() => {
        console.log('Opening settings');
      }}
      onSelectRelicHunter={() => {
        console.log('Launching relic hunter');
      }}
      onSelectARGallery={() => {
        console.log('Opening AR gallery');
      }}
      onViewInfo={() => {
        console.log('Showing info');
      }}
    />
  );
};

// ============================================
// STEP 4: Complete Example with useMapProgress Hook
// ============================================
import { useMapProgress } from '../../hooks/useMapProgress';
import { useAuth } from '../../hooks/useFirebase';

/**
 * Full working example of RevealDashboard with proper data flow
 */
export const RevealDashboardScreen: React.FC<
  NativeStackScreenProps<RevealStackParamList, 'RevealDashboard'>
> = ({ navigation }) => {
  const { user } = useAuth();
  const { mapProgress, refreshProgress } = useMapProgress(user?.uid);

  // Example: Handle starting a new scan
  const handleStartScan = () => {
    // Navigate to scan screen with proper setup
    navigation.navigate('ScanScreen', {
      userId: user?.uid,
      onScanComplete: async (scanResult) => {
        // After scan completes, refresh map progress
        await refreshProgress();
        // Show success message or navigate
        console.log('Scan completed, map progress updated');
      },
    });
  };

  return (
    <RevealDashboard
      onStartScan={handleStartScan}
      onViewHistory={() => {
        navigation.navigate('ScanHistory');
      }}
      onSelectMapProgress={() => {
        navigation.navigate('MapProgress');
      }}
      onViewSettings={() => {
        navigation.navigate('Settings');
      }}
      onSelectRelicHunter={() => {
        navigation.navigate('RelicHunter');
      }}
      onSelectARGallery={() => {
        navigation.navigate('ARGallery');
      }}
      onViewInfo={() => {
        Alert.alert(
          'Sri REVEAL',
          'Explore Sri Lanka\'s cultural heritage through AR scans. Track your progress across all 25 districts!',
        );
      }}
    />
  );
};

// ============================================
// STEP 5: Firebase Integration for Map Progress
// ============================================
/**
 * Update your firebaseService.ts with these functions:
 */

export const mapProgressService = {
  /**
   * Get all scans for a user and calculate district progress
   */
  async getUserMapProgress(userId: string) {
    try {
      const scansSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('scans')
        .get();

      const scans = scansSnapshot.docs.map((doc) => doc.data());

      // Aggregate by district
      const districtProgress: Record<string, any> = {};

      scans.forEach((scan) => {
        const districtId = scan.districtId;
        if (!districtProgress[districtId]) {
          districtProgress[districtId] = {
            scansCompleted: 0,
            hotspotsExplored: 0,
            xpEarned: 0,
            lastActivityDate: null,
          };
        }

        districtProgress[districtId].scansCompleted += 1;
        districtProgress[districtId].hotspotsExplored += scan.hotspotsFound || 0;
        districtProgress[districtId].xpEarned += scan.xpEarned || 0;
        districtProgress[districtId].lastActivityDate = scan.timestamp;
      });

      // Calculate overall stats
      const totalScans = scans.length;
      const totalHotspots = scans.reduce((sum, s) => sum + (s.hotspotsFound || 0), 0);
      const totalXP = scans.reduce((sum, s) => sum + (s.xpEarned || 0), 0);

      return {
        userId,
        totalScansAcrossMap: totalScans,
        totalHotspotsExplored: totalHotspots,
        totalMapXP: totalXP,
        districtProgress,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to get map progress:', error);
      throw error;
    }
  },

  /**
   * Save a new scan with district information
   */
  async addScanWithDistrict(
    userId: string,
    scanData: {
      relicId: string;
      relicName: string;
      districtId: string;
      latitude: number;
      longitude: number;
      xpEarned: number;
      hotspotsFound: number;
      photoProof?: string;
    },
  ) {
    try {
      const scanRef = db
        .collection('users')
        .doc(userId)
        .collection('scans')
        .doc();

      await scanRef.set({
        id: scanRef.id,
        ...scanData,
        timestamp: new Date(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      return scanRef.id;
    } catch (error) {
      console.error('Failed to add scan:', error);
      throw error;
    }
  },
};

// ============================================
// STEP 6: Complete Setup Instructions
// ============================================
/**
 * SETUP CHECKLIST:
 *
 * 1. ✅ Create SriLankanMapScreen.tsx (already created)
 * 2. ✅ Create useMapProgress hook (already created)
 * 3. ✅ Create mapProgress types (already created)
 * 4. ✅ Update RevealDashboard with onSelectMapProgress prop (done)
 * 5. 📋 Update your app's navigation stack
 *    - Import SriLankanMapScreen
 *    - Add MapProgress screen to Stack.Navigator
 * 6. 📋 Update RevealDashboard usage
 *    - Wrap with navigation context
 *    - Pass onSelectMapProgress callback
 * 7. 📋 Update Firebase schema
 *    - Ensure scans have districtId field
 *    - Add location data to scans
 * 8. 📋 Update useMapProgress hook
 *    - Replace mock data with real Firebase calls
 *    - Implement addScan function
 *
 * EXAMPLE FIRESTORE SCHEMA:
 * users/
 *   {userId}/
 *     scans/
 *       {scanId}/
 *         id: "scan_123"
 *         relicId: "relic_456"
 *         relicName: "Temple at Kandy"
 *         districtId: "kandy"
 *         latitude: 7.2906
 *         longitude: 80.6337
 *         xpEarned: 100
 *         hotspotsFound: 2
 *         photoProof: "url"
 *         timestamp: Timestamp
 *         createdAt: Timestamp
 */
