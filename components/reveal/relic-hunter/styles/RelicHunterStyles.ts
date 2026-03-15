import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Color palette for the Relic Hunter UI
export const COLORS = {
  // Base colors
  background: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(10, 15, 20, 0.75)',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',

  // Primary accent
  primary: '#00D4AA',
  primaryGlow: 'rgba(0, 212, 170, 0.3)',
  primaryDark: '#00A080',

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',

  // Rarity colors
  rarityCommon: '#B0B0B0',
  rarityRare: '#4DA6FF',
  rarityLegendary: '#FFD700',
  rarityMythical: '#FF6B9D',

  // Status colors
  success: '#00E676',
  warning: '#FFAB40',
  danger: '#FF5252',
  inactive: 'rgba(255, 255, 255, 0.3)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const SIZES = {
  // Radar
  radarSize: 100,
  radarDotSize: 8,

  // Action button
  actionButtonSize: 72,
  actionButtonRingSize: 88,

  // Inventory
  inventorySize: 56,

  // Discovery bar
  discoveryBarHeight: 64,
};

export const relicHunterStyles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    position: 'relative',
  },

  // HUD Layout
  hudContainer: {
    ...StyleSheet.absoluteFillObject,
    padding: SPACING.lg,
    paddingTop: 60, // Account for status bar
    paddingBottom: 40,
  },

  hudTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  hudBottom: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
  },

  // Glass morphism base
  glassPanel: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Discovery Bar (Top Left)
  discoveryBar: {
    backgroundColor: COLORS.overlay,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 16,
    padding: SPACING.md,
    minWidth: 180,
  },

  discoveryRegion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },

  discoverySubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  levelBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },

  levelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },

  experienceBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },

  experienceFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // Compass Radar (Top Right)
  radarContainer: {
    width: SIZES.radarSize,
    height: SIZES.radarSize,
    borderRadius: SIZES.radarSize / 2,
    backgroundColor: COLORS.overlay,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarInner: {
    width: SIZES.radarSize - 16,
    height: SIZES.radarSize - 16,
    borderRadius: (SIZES.radarSize - 16) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radarCenterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },

  radarDot: {
    position: 'absolute',
    width: SIZES.radarDotSize,
    height: SIZES.radarDotSize,
    borderRadius: SIZES.radarDotSize / 2,
  },

  radarDirectionIndicator: {
    position: 'absolute',
    top: 8,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.primary,
  },

  compassLabel: {
    position: 'absolute',
    fontSize: 8,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // Action Floating Button (Bottom Center)
  actionButtonContainer: {
    alignItems: 'center',
  },

  actionButtonOuter: {
    width: SIZES.actionButtonRingSize,
    height: SIZES.actionButtonRingSize,
    borderRadius: SIZES.actionButtonRingSize / 2,
    borderWidth: 2,
    borderColor: COLORS.inactive,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionButtonOuterActive: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },

  actionButton: {
    width: SIZES.actionButtonSize,
    height: SIZES.actionButtonSize,
    borderRadius: SIZES.actionButtonSize / 2,
    backgroundColor: COLORS.inactive,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionButtonActive: {
    backgroundColor: COLORS.primary,
  },

  actionButtonScanning: {
    backgroundColor: COLORS.warning,
  },

  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },

  actionHint: {
    marginTop: SPACING.sm,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Inventory Quick Access (Bottom Right)
  inventoryContainer: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 50,
    alignItems: 'center',
  },

  inventoryButton: {
    width: SIZES.inventorySize,
    height: SIZES.inventorySize,
    borderRadius: 16,
    backgroundColor: COLORS.overlay,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inventoryBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },

  inventoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },

  inventoryLabel: {
    marginTop: SPACING.xs,
    fontSize: 10,
    color: COLORS.textMuted,
  },

  // Scanning overlay effects
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: COLORS.primary,
    opacity: 0.3,
  },

  targetReticle: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reticleCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.primary,
  },
});

// Utility function to get rarity color
export const getRarityColor = (rarity: string): string => {
  switch (rarity) {
    case 'common':
      return COLORS.rarityCommon;
    case 'rare':
      return COLORS.rarityRare;
    case 'legendary':
      return COLORS.rarityLegendary;
    case 'mythical':
      return COLORS.rarityMythical;
    default:
      return COLORS.rarityCommon;
  }
};
