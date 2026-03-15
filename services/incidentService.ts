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
} from 'firebase/firestore';
import { db, auth } from './firebase';

// SafeSpot uses its own Firestore collection — completely isolated from teammates' data
const COLLECTION = 'safespot_incidents';

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
 * If flagCount reaches 5, it is hidden from the map.
 */
export async function flagIncidentReport(incidentId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, incidentId), {
    flagCount: increment(1),
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

const CLUSTER_RADIUS_M = 800; // 800m cluster radius

/** Haversine distance in metres between two points */
function distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Map incident category to a severity score 0–1 */
function categorySeverity(category: string): number {
  const map: Record<string, number> = {
    robbery: 1.0,
    natural_disaster: 1.0,
    harassment: 0.67,
    accident: 0.67,
    unsafe_area: 0.67,
    scam: 0.33,
    other: 0.33,
  };
  return map[category] ?? 0.33;
}

/** Recentness score: fresher = higher weight */
function recentnessScore(timestamp: any): number {
  let ts: number;
  if (timestamp?.seconds) ts = timestamp.seconds * 1000;
  else if (timestamp?.toDate) ts = timestamp.toDate().getTime();
  else ts = new Date(timestamp).getTime();
  const ageHours = (Date.now() - ts) / 3600000;
  if (ageHours < 6)  return 1.0;
  if (ageHours < 24) return 0.7;
  if (ageHours < 72) return 0.5;
  return 0.2;
}

/**
 * Compute density-based heatmap points.
 * weight = (severity × 0.6) + (recentness × 0.3) + (clusterDensity × 0.1)
 * Each incident produces one point — nearby reports naturally stack in the heatmap.
 */
export function computeHeatmapPoints(
  incidents: FirestoreIncident[]
): { latitude: number; longitude: number; weight: number }[] {
  const valid = incidents.filter(i => i.latitude && i.longitude);
  if (!valid.length) return [];

  return valid.map(incident => {
    const severity    = categorySeverity(incident.category);
    const recentness  = recentnessScore(incident.timestamp);

    // count neighbours within 800m (excluding self)
    const neighbours  = valid.filter(
      other => other.id !== incident.id &&
        distanceMetres(incident.latitude, incident.longitude, other.latitude, other.longitude) <= CLUSTER_RADIUS_M
    ).length;
    const clusterDensity = Math.min(1.0, neighbours / 5);

    const weight = (severity * 0.6) + (recentness * 0.3) + (clusterDensity * 0.1);
    return {
      latitude: incident.latitude,
      longitude: incident.longitude,
      weight: Math.min(1.0, weight),
    };
  });
}
