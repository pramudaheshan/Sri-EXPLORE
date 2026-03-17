// ==========================================
// SriSafeSpot - Incident Service
// Handles saving/reading safety incidents in Firestore
//
// Firestore Structure:
// incidents/                        (collection)
//   {incidentId}/                   (document – auto-id)
//     title:       string
//     description: string
//     category:    string           ('robbery'|'harassment'|'accident'|'unsafe_area'|'scam'|'other')
//     latitude:    number
//     longitude:   number
//     timestamp:   Timestamp        (Firestore server timestamp)
//     userId:      string           (anonymous session id or auth uid)
//     imageUrl:    string | null    (optional uploaded photo URL)
//     status:      string           ('pending'|'verified'|'resolved')
//     locationName:string           (human-readable address / place name)
// ==========================================

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  getDocs,
  GeoPoint,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  limit,
  deleteDoc,
  getDoc,
  setDoc,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from './firebase';

// SafeSpot uses its own Firestore collection — completely isolated from teammates' data
export const COLLECTION = 'safespot_incidents';

// Helper: get current user ID (falls back to anonymous session ID)
export function getCurrentUserId(): string {
  return auth.currentUser?.uid ?? 'anon_' + Math.random().toString(36).slice(2, 10);
}

export interface IncidentReport {
  title: string;
  description: string;
  category: IncidentCategory;
  latitude: number;
  longitude: number;
  locationName?: string;
  userId: string;
  imageUrl?: string | null;
}

export type IncidentCategory =
  | 'robbery'
  | 'harassment'
  | 'accident'
  | 'unsafe_area'
  | 'scam'
  | 'natural_disaster'
  | 'other';

export const INCIDENT_CATEGORIES: { value: IncidentCategory; label: string; emoji: string; color: string }[] = [
  { value: 'robbery',          label: 'Robbery / Theft',    emoji: '🔓', color: '#EF4444' },
  { value: 'harassment',       label: 'Harassment',          emoji: '⚠️', color: '#F97316' },
  { value: 'accident',         label: 'Accident',            emoji: '🚗', color: '#F59E0B' },
  { value: 'unsafe_area',      label: 'Unsafe Area',         emoji: '🚧', color: '#8B5CF6' },
  { value: 'scam',             label: 'Scam / Fraud',        emoji: '💸', color: '#EC4899' },
  { value: 'natural_disaster', label: 'Natural Disaster',    emoji: '🌊', color: '#3B82F6' },
  { value: 'other',            label: 'Other',               emoji: '📌', color: '#6B7280' },
];

/**
 * Submit a new incident report to Firestore.
 * Returns the auto-generated document ID on success.
 */
export async function submitIncidentReport(report: IncidentReport): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    title: report.title.trim(),
    description: report.description.trim(),
    category: report.category,
    location: new GeoPoint(report.latitude, report.longitude),
    latitude: report.latitude,
    longitude: report.longitude,
    locationName: report.locationName ?? null,
    userId: report.userId,
    imageUrl: report.imageUrl ?? null,
    status: 'pending',
    timestamp: serverTimestamp(),
  });
  return docRef.id;
}

// ==========================================
// FIRESTORE INCIDENT TYPE (with id)
// ==========================================

export interface FirestoreIncident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  latitude: number;
  longitude: number;
  locationName?: string;
  userId: string;
  imageUrl?: string | null;
  status: string;
  timestamp: any;
  flagCount?: number;
}

/**
 * Real-time subscription to all incidents (newest first).
 * Automatically filters out heavily-flagged reports.
 * Returns the unsubscribe function.
 */
export function subscribeToIncidents(
  callback: (incidents: FirestoreIncident[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(500)
  );
  return onSnapshot(q, (snapshot) => {
    const incidents = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as FirestoreIncident))
      .filter(i => (i.flagCount ?? 0) < 5); // hide heavily flagged reports
    callback(incidents);
  });
}

/**
 * Flag a report as potentially false/incorrect.
 * Auto-deletes the document if flagCount reaches 3.
 */
export async function flagIncidentReport(incidentId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, incidentId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists()) return;
    const current = (snap.data().flagCount ?? 0) as number;
    if (current + 1 >= 3) {
      tx.delete(docRef);
    } else {
      tx.update(docRef, { flagCount: increment(1) });
    }
  });
}

/**
 * Check if the given user has already submitted a report.
 * Used to enforce one-report-per-user limit.
 */
export async function checkUserHasReport(userId: string): Promise<boolean> {
  if (userId.startsWith('anon_')) return false; // anonymous users can always report
  const q = query(collection(db, COLLECTION), where('userId', '==', userId), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ── Heatmap computation ──────────────────────────────────────────────────────

/**
 * Base influence radius at max zoom-in.
 * Matches INFLUENCE_RADIUS_METERS constant in safety-map.tsx.
 */
export const INFLUENCE_RADIUS_BASE_M = 300;

/**
 * Haversine distance in metres between two coordinate pairs.
 * Used for neighbour-counting and geofence proximity alerts.
 */
export function haversineMeters(
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const R = 6_371_000;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLon = (bLng - aLng) * Math.PI / 180;
  const lat1 = aLat * Math.PI / 180;
  const lat2 = bLat * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Map nearby-incident count → heat weight.
 *
 * | total in zone (self + nearby) | weight | colour  |
 * |-------------------------------|--------|---------|
 * | 1                             |  0.25  | green   |
 * | 2                             |  0.50  | yellow  |
 * | 3                             |  0.75  | orange  |
 * | 3 or more                     |  1.0   | red     |
 *
 * nearbyCount = OTHER incidents within 300 m (excluding self).
 * totalInZone = nearbyCount + 1 (counting self).
 */
function densityWeight(nearbyCount: number): number {
  const total = nearbyCount + 1;
  if (total === 1) return 0.25;  // lone report       → green
  if (total === 2) return 0.50;  // 2 in zone         → yellow
  if (total === 3) return 0.75;  // 3 in zone         → orange
  return 1.0;                    // 4+ in zone        → red
}

/**
 * Convert Firestore incidents into weighted heatmap points for
 * react-native-maps <Heatmap points={...} />.
 *
 * Neighbour radius is fixed at INFLUENCE_RADIUS_BASE_M (300 m).
 * The actual rendered pixel radius is computed separately in the
 * map component using the current zoom level (latitudeDelta).
 */
export function computeHeatmapPoints(
  incidents: FirestoreIncident[]
): { latitude: number; longitude: number; weight: number }[] {
  const valid = incidents.filter(
    i => typeof i.latitude === 'number' && typeof i.longitude === 'number'
  );
  if (!valid.length) return [];

  return valid.map(inc => {
    const nearbyCount = valid.filter(
      other =>
        other.id !== inc.id &&
        haversineMeters(
          inc.latitude, inc.longitude,
          other.latitude, other.longitude
        ) <= INFLUENCE_RADIUS_BASE_M
    ).length;

    return {
      latitude:  inc.latitude,
      longitude: inc.longitude,
      weight:    densityWeight(nearbyCount),
    };
  });
}

// ── User-specific incident functions ─────────────────────────────────────────

/**
 * Fetch all incidents submitted by the given user, newest first.
 */
export async function getUserIncidents(userId: string): Promise<FirestoreIncident[]> {
  // Only filter by userId — no orderBy to avoid needing a composite Firestore index.
  // Sort newest-first in JS after fetching.
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreIncident));
  // Sort by timestamp descending (client-side)
  return docs.sort((a, b) => {
    const ta = a.timestamp?.seconds ?? 0;
    const tb = b.timestamp?.seconds ?? 0;
    return tb - ta;
  });
}

/**
 * Delete a specific incident (user can only delete their own — enforce in UI).
 */
export async function deleteUserIncident(incidentId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, incidentId));
}

// ── Emergency contact ─────────────────────────────────────────────────────────

const USERS_COL = 'safespot_users';

export interface EmergencyContact {
  name: string;
  phone: string;
}

/**
 * Save (or replace) the user's emergency contact in Firestore.
 */
export async function saveEmergencyContact(userId: string, contact: EmergencyContact): Promise<void> {
  await setDoc(doc(db, USERS_COL, userId), { emergencyContact: contact }, { merge: true });
}

/**
 * Load the user's saved emergency contact. Returns null if none saved.
 */
export async function getEmergencyContact(userId: string): Promise<EmergencyContact | null> {
  const snap = await getDoc(doc(db, USERS_COL, userId));
  if (!snap.exists()) return null;
  return (snap.data().emergencyContact as EmergencyContact) ?? null;
}
