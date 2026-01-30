// Relic Hunter Type Definitions

export interface Relic {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'legendary' | 'mythical';
  region: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance: number; // in meters
  angle: number; // relative to user's facing direction (0-360)
  isInView: boolean;
  isCollected: boolean;
  points: number;
  model3D?: string;
  thumbnail?: string;
}

export interface Region {
  id: string;
  name: string;
  subtitle: string;
  totalRelics: number;
  collectedRelics: number;
}

export interface UserProgress {
  level: number;
  experience: number;
  experienceToNextLevel: number;
  totalRelicsCollected: number;
  currentStreak: number;
}

export interface RadarDot {
  id: string;
  angle: number;
  distance: number; // normalized 0-1
  rarity: Relic['rarity'];
}

export interface InventoryState {
  collected: number;
  total: number;
  relics: Relic[];
}

export interface HUDState {
  isScanning: boolean;
  canCapture: boolean;
  targetRelic: Relic | null;
  compassHeading: number;
}
