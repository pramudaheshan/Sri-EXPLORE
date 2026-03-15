// Firebase Services for Sri-EXPLORE
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

// ============================================
// TYPES
// ============================================
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  level: string;
  points: number;
  badges: string[];
  placesVisited: number;
  arScans: number;
  joinDate: Timestamp;
  lastActive: Timestamp;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  pointsRequired: number;
}

export interface Achievement {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  earnedAt: Timestamp;
  xpEarned: number;
}

export interface ARScan {
  id: string;
  userId: string;
  relicId: string;
  relicName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  xpEarned: number;
  hotspotsExplored: number;
  totalHotspots: number;
  completedAt: Timestamp;
}

export interface Place {
  id: string;
  name: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
  };
  category: string;
  relics: string[];
  imageUrl?: string;
}

// ============================================
// USER PROFILE SERVICES
// ============================================
export const userService = {
  // Create new user profile
  async createProfile(
    uid: string,
    email: string,
    displayName: string,
  ): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      uid,
      email,
      displayName,
      level: 'Beginner Explorer',
      points: 0,
      badges: [],
      placesVisited: 0,
      arScans: 0,
      joinDate: serverTimestamp(),
      lastActive: serverTimestamp(),
    });
  },

  // Get user profile
  async getProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      return snapshot.data() as UserProfile;
    }
    return null;
  },

  // Update user profile
  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...data,
      lastActive: serverTimestamp(),
    });
  },

  // Add points to user
  async addPoints(uid: string, points: number): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      points: increment(points),
      lastActive: serverTimestamp(),
    });

    // Check and update level
    await this.checkAndUpdateLevel(uid);
  },

  // Check and update user level based on points
  async checkAndUpdateLevel(uid: string): Promise<void> {
    const profile = await this.getProfile(uid);
    if (!profile) return;

    const levels = [
      { name: 'Beginner Explorer', minPoints: 0 },
      { name: 'Junior Explorer', minPoints: 500 },
      { name: 'Explorer', minPoints: 1500 },
      { name: 'Senior Explorer', minPoints: 3000 },
      { name: 'Expert Explorer', minPoints: 5000 },
      { name: 'Master Explorer', minPoints: 10000 },
      { name: 'Legendary Explorer', minPoints: 20000 },
    ];

    const newLevel =
      levels.filter((l) => profile.points >= l.minPoints).pop()?.name ||
      'Beginner Explorer';

    if (newLevel !== profile.level) {
      await this.updateProfile(uid, { level: newLevel });
    }
  },

  // Subscribe to profile changes (real-time)
  subscribeToProfile(
    uid: string,
    callback: (profile: UserProfile | null) => void,
  ) {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserProfile);
      } else {
        callback(null);
      }
    });
  },
};

// ============================================
// AR SCAN SERVICES
// ============================================
export const arScanService = {
  // Record a completed AR scan
  async recordScan(
    userId: string,
    relicId: string,
    relicName: string,
    location: { latitude: number; longitude: number },
    xpEarned: number,
    hotspotsExplored: number,
    totalHotspots: number,
  ): Promise<string> {
    if (!userId) {
      console.error('recordScan: userId is missing');
      return '';
    }

    try {
      // Step 1: Add scan record to arScans collection
      const scansRef = collection(db, 'arScans');
      const docRef = await addDoc(scansRef, {
        userId,
        relicId,
        relicName,
        location,
        xpEarned,
        hotspotsExplored,
        totalHotspots,
        completedAt: serverTimestamp(),
      });

      // Step 2: Update user scan count
      // Use a simpler approach - just increment without checking if doc exists
      // The user document should already exist from signup, but if not, this will fail gracefully
      const userRef = doc(db, 'users', userId);
      try {
        await updateDoc(userRef, {
          arScans: increment(1),
          lastActive: serverTimestamp(),
        });
      } catch (updateErr: any) {
        // If update fails (e.g., user doc doesn't exist), log but don't fail the entire scan
        console.warn('⚠️ Failed to update user scan count:', updateErr.message);
        // Still consider the scan successful since the arScans record was created
      }

      return docRef.id;
    } catch (err: any) {
      console.error('❌ recordScan failed:', err);
      throw err;
    }
  },

  // Get user's AR scan history
  // Tries a server-side ordered query; if Firestore requires a missing composite index,
  // fall back to a client-side sort (safer for development and avoids crash).
  async getUserScans(
    userId: string,
    limitCount: number = 20,
  ): Promise<ARScan[]> {
    if (!userId) return [];

    const scansRef = collection(db, 'arScans');

    try {
      const q = query(
        scansRef,
        where('userId', '==', userId),
        orderBy('completedAt', 'desc'),
        limit(limitCount),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as ARScan,
      );
    } catch (err: any) {
      // Firestore often throws an error when a composite index is required.
      // Fall back to fetching user scans without ordering and sort client-side.
      console.warn(
        'getUserScans: server-side query failed, falling back to client-side sort.',
        err?.message ?? err,
      );

      const q2 = query(scansRef, where('userId', '==', userId));
      const snapshot2 = await getDocs(q2);
      const docs = snapshot2.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ARScan,
      );

      docs.sort((a: any, b: any) => {
        const at = a.completedAt?.toDate
          ? a.completedAt.toDate().getTime()
          : new Date(a.completedAt || 0).getTime();
        const bt = b.completedAt?.toDate
          ? b.completedAt.toDate().getTime()
          : new Date(b.completedAt || 0).getTime();
        return bt - at; // descending
      });

      return docs.slice(0, limitCount);
    }
  },

  // Check if user has scanned a specific relic
  async hasScannedRelic(userId: string, relicId: string): Promise<boolean> {
    const scansRef = collection(db, 'arScans');
    const q = query(
      scansRef,
      where('userId', '==', userId),
      where('relicId', '==', relicId),
      limit(1),
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  // Record a single hotspot exploration (prevents duplicates)
  async recordHotspotExploration(
    userId: string,
    relicId: string,
    relicName: string,
    hotspotId: string,
    xpEarned: number,
  ): Promise<boolean> {
    const explorationsRef = collection(db, 'hotspotExplorations');

    // Check for existing exploration by user for the same hotspot
    const q = query(
      explorationsRef,
      where('userId', '==', userId),
      where('relicId', '==', relicId),
      where('hotspotId', '==', hotspotId),
      limit(1),
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      // Already recorded
      return false;
    }

    // Add exploration record
    await addDoc(explorationsRef, {
      userId,
      relicId,
      relicName,
      hotspotId,
      xpEarned,
      exploredAt: serverTimestamp(),
    });

    // Add points to user profile
    await userService.addPoints(userId, xpEarned);

    // Optionally trigger achievements checks elsewhere
    return true;
  },

  async getExploredHotspotsForRelic(
    userId: string,
    relicId: string,
  ): Promise<string[]> {
    if (!userId) return [];
    const explorationsRef = collection(db, 'hotspotExplorations');
    const q = query(
      explorationsRef,
      where('userId', '==', userId),
      where('relicId', '==', relicId),
    );
    const snapshot = await getDocs(q);
    const ids: string[] = [];
    snapshot.forEach((doc) => {
      const data: any = doc.data();
      if (data.hotspotId) ids.push(data.hotspotId);
    });
    return ids;
  },

  // Compute user's total XP by summing completed scans and per-hotspot explorations
  async getUserTotalXP(userId: string): Promise<number> {
    if (!userId) return 0;

    let total = 0;

    // Prefer summing hotspotExplorations (they represent the canonical per-hotspot XP awards).
    // If none exist, fall back to summing arScans.xpEarned as a historical fallback.
    const explorationsRef = collection(db, 'hotspotExplorations');
    const q2 = query(explorationsRef, where('userId', '==', userId));
    const expSnap = await getDocs(q2);
    if (!expSnap.empty) {
      expSnap.forEach((d) => {
        const data: any = d.data();
        total += data.xpEarned || 0;
      });
    } else {
      // fallback to summing scans
      const scansRef = collection(db, 'arScans');
      const q1 = query(scansRef, where('userId', '==', userId));
      const scanSnap = await getDocs(q1);
      scanSnap.forEach((d) => {
        const data: any = d.data();
        total += data.xpEarned || 0;
      });
    }

    return total;
  },

  // Count all hotspot explorations a user has completed across relics
  async getUserHotspotCount(userId: string): Promise<number> {
    if (!userId) return 0;
    const explorationsRef = collection(db, 'hotspotExplorations');
    const q = query(explorationsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  // Compute aggregated stats for a user (total scans, hotspots, and day streak)
  async getUserStats(userId: string): Promise<{
    totalScans: number;
    totalHotspots: number;
    streakDays: number;
  }> {
    const scansRef = collection(db, 'arScans');
    let docs: any[] = [];

    try {
      // Try server-side ordered query first
      const q = query(
        scansRef,
        where('userId', '==', userId),
        orderBy('completedAt', 'desc'),
      );
      const snapshot = await getDocs(q);
      docs = snapshot.docs.map((d) => d.data());
    } catch (err: any) {
      // Fallback if composite index is required
      console.warn(
        'getUserStats: server-side query failed, falling back to client-side sort.',
        err?.message ?? err,
      );

      // Query without orderBy
      const q2 = query(scansRef, where('userId', '==', userId));
      const snapshot2 = await getDocs(q2);
      docs = snapshot2.docs.map((d) => d.data());

      // Sort client-side
      docs.sort((a: any, b: any) => {
        const at = a.completedAt?.toDate
          ? a.completedAt.toDate().getTime()
          : new Date(a.completedAt || 0).getTime();
        const bt = b.completedAt?.toDate
          ? b.completedAt.toDate().getTime()
          : new Date(b.completedAt || 0).getTime();
        return bt - at; // descending
      });
    }

    const totalScans = docs.length;

    let totalHotspots = 0;
    const timestamps: Date[] = [];

    for (const d of docs) {
      totalHotspots += d.hotspotsExplored || 0;
      const ts = d.completedAt;
      if (ts && ts.toDate) {
        timestamps.push(ts.toDate());
      } else if (ts instanceof Date) {
        timestamps.push(ts);
      }
    }

    // Calculate streak (consecutive days with scans) from sorted timestamps
    let streakDays = 0;
    let lastDate: Date | null = null;

    for (const t of timestamps) {
      const scanDate = new Date(t);
      scanDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (
          scanDate.getTime() === today.getTime() ||
          scanDate.getTime() === yesterday.getTime()
        ) {
          streakDays = 1;
          lastDate = scanDate;
        } else {
          break;
        }
      } else {
        const dayDiff = Math.floor(
          (lastDate.getTime() - scanDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (dayDiff === 1) {
          streakDays++;
          lastDate = scanDate;
        } else if (dayDiff === 0) {
          continue;
        } else {
          break;
        }
      }
    }

    return { totalScans, totalHotspots, streakDays };
  },
};

// ============================================
// ACHIEVEMENT SERVICES
// ============================================
export const achievementService = {
  // Award an achievement
  async awardAchievement(
    userId: string,
    type: string,
    title: string,
    description: string,
    xpEarned: number,
  ): Promise<string> {
    // Check if already has this achievement
    const existing = await this.hasAchievement(userId, type);
    if (existing) return '';

    const achievementsRef = collection(db, 'achievements');
    const docRef = await addDoc(achievementsRef, {
      userId,
      type,
      title,
      description,
      xpEarned,
      earnedAt: serverTimestamp(),
    });

    // Add points
    await userService.addPoints(userId, xpEarned);

    return docRef.id;
  },

  // Get user's achievements
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    const achievementsRef = collection(db, 'achievements');
    const q = query(
      achievementsRef,
      where('userId', '==', userId),
      orderBy('earnedAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Achievement,
    );
  },

  // Check if user has specific achievement
  async hasAchievement(userId: string, type: string): Promise<boolean> {
    const achievementsRef = collection(db, 'achievements');
    const q = query(
      achievementsRef,
      where('userId', '==', userId),
      where('type', '==', type),
      limit(1),
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  // Check and award achievements based on user actions
  async checkAchievements(userId: string): Promise<void> {
    const profile = await userService.getProfile(userId);
    if (!profile) return;

    // First AR Scan
    if (profile.arScans >= 1) {
      await this.awardAchievement(
        userId,
        'first_ar_scan',
        'First AR Scan',
        'Completed your first AR scan',
        50,
      );
    }

    // AR Master (10 scans)
    if (profile.arScans >= 10) {
      await this.awardAchievement(
        userId,
        'ar_master',
        'AR Master',
        'Completed 10 AR scans',
        200,
      );
    }

    // Explorer (5 places visited)
    if (profile.placesVisited >= 5) {
      await this.awardAchievement(
        userId,
        'temple_explorer',
        'Temple Explorer',
        'Visited 5 historic places',
        150,
      );
    }

    // Points milestones
    if (profile.points >= 1000) {
      await this.awardAchievement(
        userId,
        'points_1000',
        'Rising Star',
        'Earned 1000 XP points',
        100,
      );
    }
  },
};

// ============================================
// PLACES SERVICES
// ============================================
export const placesService = {
  // Get all places
  async getAllPlaces(): Promise<Place[]> {
    const placesRef = collection(db, 'places');
    const snapshot = await getDocs(placesRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Place);
  },

  // Get place by ID
  async getPlace(placeId: string): Promise<Place | null> {
    const placeRef = doc(db, 'places', placeId);
    const snapshot = await getDoc(placeRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Place;
    }
    return null;
  },

  // Get nearby places
  async getNearbyPlaces(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
  ): Promise<Place[]> {
    // Note: For proper geo queries, consider using geohash or Firebase GeoFire
    // This is a simplified version
    const places = await this.getAllPlaces();
    return places.filter((place) => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        place.location.latitude,
        place.location.longitude,
      );
      return distance <= radiusKm;
    });
  },

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Mark place as visited
  async markVisited(userId: string, placeId: string): Promise<void> {
    const visitRef = doc(db, 'visits', `${userId}_${placeId}`);
    await setDoc(visitRef, {
      userId,
      placeId,
      visitedAt: serverTimestamp(),
    });

    // Update user's places visited count
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      placesVisited: increment(1),
    });

    // Check for achievements
    await achievementService.checkAchievements(userId);
  },
};

// ============================================
// LEADERBOARD SERVICES
// ============================================
export const leaderboardService = {
  // Get top users by points
  async getTopUsers(limitCount: number = 10): Promise<UserProfile[]> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('points', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as UserProfile);
  },

  // Get user's rank
  async getUserRank(userId: string): Promise<number> {
    const profile = await userService.getProfile(userId);
    if (!profile) return -1;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('points', '>', profile.points));
    const snapshot = await getDocs(q);
    return snapshot.size + 1;
  },
};

// ============================================
// CONFIG / APP SETTINGS SERVICES
// ============================================
export const configService = {
  // Returns an ordered array of level titles with minLevel thresholds
  // Expected doc path: config/levelTitles with shape: { titles: [{ minLevel: number, title: string }, ...] }
  async getLevelTitles(): Promise<Array<{ minLevel: number; title: string }>> {
    try {
      const docRef = doc(db, 'config', 'levelTitles');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.titles)) {
          return data.titles.map((t: any) => ({
            minLevel: t.minLevel ?? t.min ?? 1,
            title: t.title ?? 'Explorer',
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch level titles', err);
    }

    // Fallback default mapping
    return [
      { minLevel: 1, title: 'Novice Explorer' },
      { minLevel: 5, title: 'Relic Seeker' },
      { minLevel: 10, title: 'Artifact Hunter' },
      { minLevel: 20, title: 'History Scholar' },
      { minLevel: 30, title: 'Master Archaeologist' },
      { minLevel: 50, title: 'Legendary Curator' },
    ];
  },

  // Returns level thresholds by minPoints for XP-based leveling
  // Expected doc path: config/levels with shape: { levels: [{ level: number, minPoints: number, title?: string }, ...] }
  async getLevelConfig(): Promise<
    Array<{ level: number; minPoints: number; title?: string }>
  > {
    try {
      const docRef = doc(db, 'config', 'levels');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.levels)) {
          return data.levels.map((l: any, idx: number) => ({
            level: l.level ?? idx + 1,
            minPoints: l.minPoints ?? l.min ?? 0,
            title: l.title,
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch level config', err);
    }

    // Fallback default thresholds
    return [
      { level: 1, minPoints: 0, title: 'Beginner Explorer' },
      { level: 2, minPoints: 500, title: 'Junior Explorer' },
      { level: 3, minPoints: 1500, title: 'Explorer' },
      { level: 4, minPoints: 3000, title: 'Senior Explorer' },
      { level: 5, minPoints: 5000, title: 'Expert Explorer' },
      { level: 6, minPoints: 10000, title: 'Master Explorer' },
      { level: 7, minPoints: 20000, title: 'Legendary Explorer' },
    ];
  },
};
