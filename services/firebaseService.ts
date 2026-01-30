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

    // Update user stats
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      arScans: increment(1),
      points: increment(xpEarned),
    });

    return docRef.id;
  },

  // Get user's AR scan history
  async getUserScans(
    userId: string,
    limitCount: number = 20,
  ): Promise<ARScan[]> {
    const scansRef = collection(db, 'arScans');
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
