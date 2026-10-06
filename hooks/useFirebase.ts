// @ts-nocheck
// Firebase Hooks for Sri-EXPLORE
import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  userService,
  arScanService,
  achievementService,
  placesService,
  leaderboardService,
  UserProfile,
  Achievement,
  ARScan,
  Place,
} from '../services/firebaseService';

// ============================================
// AUTH HOOK
// ============================================
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading, isAuthenticated: !!user };
}

// ============================================
// USER PROFILE HOOK
// ============================================
export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates
    const unsubscribe = userService.subscribeToProfile(
      userId,
      (profileData) => {
        if (profileData) {
          setProfile(profileData);
          setLoading(false);
        }
      },
    );

    return unsubscribe;
  }, [userId]);

  const updateProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      if (!userId) return;
      try {
        await userService.updateProfile(userId, data);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [userId],
  );

  const addPoints = useCallback(
    async (points: number) => {
      if (!userId) return;
      try {
        await userService.addPoints(userId, points);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [userId],
  );

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      console.log('🔄 Manually refreshing user profile...');
      const freshProfile = await userService.getProfile(userId);
      if (freshProfile) {
        console.log('✅ Profile refreshed:', {
          arScans: freshProfile.arScans,
          points: freshProfile.points,
        });
        setProfile(freshProfile);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [userId]);

  return { profile, loading, error, updateProfile, addPoints, refresh };
}

// ============================================
// AR SCAN HOOK
// ============================================
export function useARScans(userId: string | undefined) {
  const [scans, setScans] = useState<ARScan[]>([]);
  const [stats, setStats] = useState<{
    totalScans: number;
    totalHotspots: number;
    streakDays: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await arScanService.getUserScans(userId);
      setScans(data);

      // fetch aggregated stats (total counts & streak) from DB
      try {
        const aggregated = await arScanService.getUserStats(userId);
        setStats(aggregated);
      } catch (e: any) {
        // ignore aggregated errors, keep scans list
        console.warn('Failed to fetch aggregated scan stats', e);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const recordScan = useCallback(
    async (
      relicId: string,
      relicName: string,
      location: { latitude: number; longitude: number },
      xpEarned: number,
      hotspotsExplored: number,
      totalHotspots: number,
    ): Promise<string> => {
      if (!userId) {
        const err = 'User ID is required to record a scan';
        console.error('❌ recordScan hook: userId is missing!');
        throw new Error(err);
      }

      if (!arScanService) {
        const err = 'arScanService is not available!';
        console.error('❌', err);
        throw new Error(err);
      }

      if (typeof arScanService.recordScan !== 'function') {
        const err = `arScanService.recordScan is not a function: ${typeof arScanService.recordScan}`;
        console.error('❌', err);
        throw new Error(err);
      }

      try {
        const scanId = await arScanService.recordScan(
          userId,
          relicId,
          relicName,
          location,
          xpEarned,
          hotspotsExplored,
          totalHotspots,
        );

        if (!scanId) {
          console.warn('⚠️ recordScan returned empty or falsy scanId:', scanId);
          return '';
        }

        // Refresh scans and stats
        await fetchScans();

        // Check achievements
        await achievementService.checkAchievements(userId);

        return scanId;
      } catch (err: any) {
        console.error('❌ Hook recordScan error:', {
          message: err?.message,
          code: err?.code,
          name: err?.name,
          stack: err?.stack?.substring(0, 200),
        });
        setError(err?.message || String(err));
        throw err; // Re-throw so the caller knows it failed
      }
    },
    [userId, fetchScans, stats],
  );

  const recordHotspot = useCallback(
    async (
      relicId: string,
      relicName: string,
      hotspotId: string,
      xpEarned: number,
    ) => {
      if (!userId) return false;

      try {
        const recorded = await arScanService.recordHotspotExploration(
          userId,
          relicId,
          relicName,
          hotspotId,
          xpEarned,
        );
        if (recorded) {
          // Refresh scans and check achievements when a hotspot is newly recorded
          await fetchScans();
          await achievementService.checkAchievements(userId);
        }
        return recorded;
      } catch (err: any) {
        setError(err.message);
        return false;
      }
    },
    [userId, fetchScans],
  );

  const getExploredHotspots = useCallback(
    async (relicId: string) => {
      if (!userId) return [] as string[];
      try {
        const ids = await arScanService.getExploredHotspotsForRelic(
          userId,
          relicId,
        );
        return ids;
      } catch (err: any) {
        setError(err.message);
        return [];
      }
    },
    [userId],
  );

  const getTotalXP = useCallback(async () => {
    if (!userId) return 0;
    try {
      const total = await arScanService.getUserTotalXP(userId);
      return total;
    } catch (err: any) {
      setError(err.message);
      return 0;
    }
  }, [userId]);

  const getHotspotCount = useCallback(async () => {
    if (!userId) return 0;
    try {
      const count = await arScanService.getUserHotspotCount(userId);
      return count;
    } catch (err: any) {
      setError(err.message);
      return 0;
    }
  }, [userId]);

  const hasScannedRelic = useCallback(
    async (relicId: string): Promise<boolean> => {
      if (!userId) return false;
      return arScanService.hasScannedRelic(userId, relicId);
    },
    [userId],
  );

  return {
    scans,
    stats,
    loading,
    error,
    recordScan,
    recordHotspot,
    getExploredHotspots,
    getTotalXP,
    getHotspotCount,
    hasScannedRelic,
    refresh: fetchScans,
  };
}

// ============================================
// ACHIEVEMENTS HOOK
// ============================================
export function useAchievements(userId: string | undefined) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await achievementService.getUserAchievements(userId);
      setAchievements(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return { achievements, loading, error, refresh: fetchAchievements };
}

// ============================================
// PLACES HOOK
// ============================================
export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaces = useCallback(async () => {
    try {
      setLoading(true);
      const data = await placesService.getAllPlaces();
      setPlaces(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const getNearbyPlaces = useCallback(
    async (latitude: number, longitude: number, radiusKm?: number) => {
      try {
        return await placesService.getNearbyPlaces(
          latitude,
          longitude,
          radiusKm,
        );
      } catch (err: any) {
        setError(err.message);
        return [];
      }
    },
    [],
  );

  const markVisited = useCallback(async (userId: string, placeId: string) => {
    try {
      await placesService.markVisited(userId, placeId);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return {
    places,
    loading,
    error,
    getNearbyPlaces,
    markVisited,
    refresh: fetchPlaces,
  };
}

// ============================================
// LEADERBOARD HOOK
// ============================================
export function useLeaderboard(userId?: string) {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const users = await leaderboardService.getTopUsers(20);
      setTopUsers(users);

      if (userId) {
        const rank = await leaderboardService.getUserRank(userId);
        setUserRank(rank);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { topUsers, userRank, loading, error, refresh: fetchLeaderboard };
}

// ============================================
// COMBINED USER DATA HOOK
// ============================================
export function useUserData() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const {
    profile,
    loading: profileLoading,
    addPoints,
  } = useUserProfile(user?.uid);
  const { achievements, loading: achievementsLoading } = useAchievements(
    user?.uid,
  );
  const { scans, loading: scansLoading, recordScan } = useARScans(user?.uid);

  const loading =
    authLoading || profileLoading || achievementsLoading || scansLoading;

  return {
    user,
    profile,
    achievements,
    scans,
    isAuthenticated,
    loading,
    addPoints,
    recordScan,
  };
}
