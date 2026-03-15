// ==========================================
// SRI-SAFESPOT - Theme & Constants
// Professional Glassmorphism Design System
// ==========================================

export const COLORS = {
  // Primary Brand Colors
  primary: '#20B2AA',
  primaryLight: '#48D1CC',
  primaryDark: '#008B8B',
  
  // Alert Colors
  critical: '#FF4757',
  warning: '#FF8C00',
  info: '#3498DB',
  success: '#2ED573',
  
  // Danger Zone Colors
  dangerHigh: '#FF4757',
  dangerMedium: '#FF8C00',
  dangerLow: '#F1C40F',
  safe: '#2ED573',
  
  // Category Colors
  crime: '#E74C3C',
  scam: '#9B59B6',
  natural: '#3498DB',
  health: '#2ED573',
  traffic: '#F39C12',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#6C757D',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
  },
  
  // Glass Effect Colors
  glass: {
    light: 'rgba(255, 255, 255, 0.25)',
    medium: 'rgba(255, 255, 255, 0.15)',
    dark: 'rgba(0, 0, 0, 0.25)',
    darker: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Gradient Presets
  gradients: {
    primary: ['#20B2AA', '#48D1CC'] as const,
    danger: ['#FF4757', '#FF6B7A'] as const,
    warning: ['#FF8C00', '#FFA500'] as const,
    safe: ['#2ED573', '#7BED9F'] as const,
    dark: ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)'] as const,
    glass: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)'] as const,
    hero: ['#1a2a3a', '#2d4a5a', '#1a3a4a'] as const,
  },
};

export const FONTS = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
};

export const SIZES = {
  // Font Sizes
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 48,
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  
  // Border Radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },
  
  // Icon Sizes
  icon: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }),
};

// Sri Lanka Districts for filtering
export const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Mullaitivu', 'Vavuniya', 'Trincomalee', 'Batticaloa', 'Ampara',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

// Tourist Hotspots with coordinates
export const TOURIST_HOTSPOTS = [
  { name: 'Colombo', lat: 6.9271, lng: 79.8612 },
  { name: 'Kandy', lat: 7.2906, lng: 80.6337 },
  { name: 'Galle', lat: 6.0535, lng: 80.2210 },
  { name: 'Sigiriya', lat: 7.9570, lng: 80.7603 },
  { name: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891 },
  { name: 'Ella', lat: 6.8667, lng: 81.0466 },
  { name: 'Mirissa', lat: 5.9483, lng: 80.4716 },
  { name: 'Anuradhapura', lat: 8.3114, lng: 80.4037 },
  { name: 'Polonnaruwa', lat: 7.9403, lng: 81.0188 },
  { name: 'Trincomalee', lat: 8.5874, lng: 81.2152 },
  { name: 'Bentota', lat: 6.4213, lng: 79.9977 },
  { name: 'Hikkaduwa', lat: 6.1395, lng: 80.1063 },
  { name: 'Dambulla', lat: 7.8742, lng: 80.6511 },
  { name: 'Negombo', lat: 7.2094, lng: 79.8358 },
  { name: 'Arugam Bay', lat: 6.8406, lng: 81.8364 },
];

// Professional Background Images (Nature/Travel themed)
export const BACKGROUND_IMAGES = {
  safety: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', // Mountain landscape
  map: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80', // Travel map
  emergency: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80', // Abstract gradient
  report: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80', // City skyline
  default: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80', // Nature scenic
};

// Map Styles for dark/light themes
export const MAP_STYLES = {
  dark: [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
  ],
  light: [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  ],
};
