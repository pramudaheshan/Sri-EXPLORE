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
        setProfile(profileData);
        setLoading(false);
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

  return { profile, loading, error, updateProfile, addPoints };
}

// ============================================
// AR SCAN HOOK
// ============================================
export function useARScans(userId: string | undefined) {
  const [scans, setScans] = useState<ARScan[]>([]);
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
    ) => {
      if (!userId) return;

      try {
        await arScanService.recordScan(
          userId,
          relicId,
          relicName,
          location,
          xpEarned,
          hotspotsExplored,
          totalHotspots,
        );
        // Refresh scans
        await fetchScans();
        // Check achievements
        await achievementService.checkAchievements(userId);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [userId, fetchScans],
  );

  const hasScannedRelic = useCallback(
    async (relicId: string): Promise<boolean> => {
      if (!userId) return false;
      return arScanService.hasScannedRelic(userId, relicId);
    },
    [userId],
  );

  return {
    scans,
    loading,
    error,
    recordScan,
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
