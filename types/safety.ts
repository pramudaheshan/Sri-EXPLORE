// ==========================================
// SRI-SAFESPOT - Type Definitions
// Final Year Project - Safety Module
// ==========================================

// ============ DANGER ZONES ============
export type DangerSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DangerCategory = 'crime' | 'scam' | 'natural' | 'health' | 'traffic' | 'other';
export type IncidentStatus = 'active' | 'resolved' | 'investigating' | 'verified';

export interface DangerZone {
  id: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  category: DangerCategory;
  severity: DangerSeverity;
  title: string;
  description: string;
  reportCount: number;
  lastReported: string;
  verified: boolean;
  tips: string[];
  source: 'community' | 'official' | 'dmc' | 'police';
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number; // 0-1 intensity
}

// ============ SAFETY ALERTS ============
export type AlertType = 'critical' | 'warning' | 'info' | 'success';
export type AlertCategory = 'fire' | 'flood' | 'earthquake' | 'landslide' | 'tsunami' | 'storm' | 'crime' | 'health' | 'traffic' | 'general';

export interface SafetyAlert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  severity: DangerSeverity; // Added severity field
  title: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  description: string;
  instructions?: string[];
  time: string;
  timestamp: number;
  distance?: string;
  source: 'dmc' | 'weather' | 'community' | 'police' | 'system';
  expiresAt?: number;
  affectedAreas?: string[];
}

// ============ INCIDENT REPORTS ============
export type IncidentType = 
  | 'theft'
  | 'robbery'
  | 'scam'
  | 'fraud'
  | 'harassment'
  | 'assault'
  | 'accident'
  | 'medical'
  | 'natural_disaster'
  | 'suspicious_activity'
  | 'lost_item'
  | 'overcharging'
  | 'other';

export interface IncidentReport {
  id: string;
  type?: IncidentType;
  category?: DangerCategory; // Allow category for easier use
  title: string;
  description: string;
  location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  latitude?: number; // Direct coordinates
  longitude?: number;
  timestamp: number | string; // Allow string timestamp
  reportedBy?: string; // user ID or 'anonymous'
  anonymous?: boolean;
  status?: IncidentStatus | 'pending'; // Added pending status
  severity?: DangerSeverity;
  attachments?: {
    type: 'image' | 'video';
    url: string;
  }[];
  verifications?: number; // number of users who verified
  verified?: boolean;
  resolvedAt?: number;
}

// ============ EMERGENCY CONTACTS ============
export interface EmergencyContact {
  id: string;
  name: string;
  nameLocalized?: {
    si: string; // Sinhala
    ta: string; // Tamil
  };
  number: string;
  category: 'police' | 'medical' | 'fire' | 'embassy' | 'tourism' | 'personal' | 'other';
  icon: string;
  color: string;
  available24h: boolean;
  description?: string;
}

// ============ SCAM DATABASE ============
export interface ScamEntry {
  id: string;
  title: string;
  category: 'transport' | 'shopping' | 'accommodation' | 'tour' | 'money' | 'other';
  description: string;
  howItWorks: string;
  warningSign: string[]; // Added warning signs
  howToAvoid: string[];
  commonLocations: string[];
  reportCount: number;
  lastReported: string;
  severity: DangerSeverity;
  riskLevel: 'low' | 'medium' | 'high'; // Added risk level
}

// ============ PRICE GUIDE ============
export interface PriceGuide {
  id: string;
  item: string;
  category: 'transport' | 'food' | 'accommodation' | 'attraction' | 'service';
  fairPriceMin: number;
  fairPriceMax: number;
  currency: 'LKR' | 'USD';
  unit: string; // e.g., 'per km', 'per day', 'per person'
  tips?: string;
  lastUpdated: string;
  location?: string; // if location-specific
}

// ============ SAFE PLACES ============
export type SafePlaceType = 'hospital' | 'police' | 'embassy' | 'hotel' | 'tourist_center' | 'pharmacy' | 'airport';

export interface SafePlace {
  id: string;
  name: string;
  type: SafePlaceType;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  openHours?: string;
  is24h: boolean;
  rating?: number;
  distance?: number; // calculated dynamically
}

// ============ USER LOCATION ============
export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

// ============ OFFLINE DATA ============
export interface OfflineData {
  dangerZones: DangerZone[];
  emergencyContacts: EmergencyContact[];
  scamDatabase: ScamEntry[];
  priceGuide: PriceGuide[];
  safePlaces: SafePlace[];
  lastSynced: number;
}

// ============ DMC DISASTER DATA ============
export interface DMCDisasterAlert {
  id: string;
  type: 'flood' | 'landslide' | 'drought' | 'cyclone' | 'tsunami' | 'earthquake' | 'other';
  title: string;
  description: string;
  affectedDistricts: string[];
  severity: DangerSeverity;
  startDate: string;
  status: 'active' | 'warning' | 'resolved';
  instructions: string[];
  source: string;
  lastUpdated: string;
}

// ============ WEATHER ALERT ============
export interface WeatherAlert {
  id: string;
  type: 'storm' | 'heavy_rain' | 'flood' | 'heat' | 'cold' | 'wind';
  title: string;
  description: string;
  severity: DangerSeverity;
  affectedAreas: string[];
  validFrom: string;
  validUntil: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
}

// ============ APP STATE ============
export interface SafetyState {
  alerts: SafetyAlert[];
  dangerZones: DangerZone[];
  userLocation: UserLocation | null;
  isOnline: boolean;
  lastSync: number;
  selectedFilters: DangerCategory[];
}
