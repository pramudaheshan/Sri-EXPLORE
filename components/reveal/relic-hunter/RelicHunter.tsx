// @ts-nocheck
import React, { useState, useCallback, useMemo } from 'react';
import { View, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

// Components
import {
  HUDLayout,
  ActionFloatingButton,
  InventoryQuickAccess,
  ARRelicViewer,
} from './components';

// Hooks
import { useRelicDetection } from './hooks/useRelicDetection';
import { useInventory } from './hooks/useInventory';

// Styles
import { relicHunterStyles as styles } from './styles/RelicHunterStyles';

interface RelicHunterProps {
  onOpenInventory?: () => void;
}

export const RelicHunter: React.FC<RelicHunterProps> = ({
  onOpenInventory,
}) => {
  const [permission, requestPermission] = useCameraPermissions();

  // Custom hooks for relic detection and inventory
  const {
    relics,
    radarDots,
    hudState,
    compassHeading,
    hasGPS,
    getTargetRelicPosition,
    startScanning,
    captureRelic,
  } = useRelicDetection();

  const {
    inventory,
    currentRegion,
    userProgress,
    addToInventory,
    calculateLevelProgress,
  } = useInventory();

  // Handle capture action
  const handleCapture = useCallback(async () => {
    if (!hudState.canCapture || hudState.isScanning) return;

    startScanning();

    const success = await captureRelic();

    if (success && hudState.targetRelic) {
      addToInventory(hudState.targetRelic);
      Alert.alert(
        '🎉 Relic Captured!',
        `You found: ${hudState.targetRelic.name}\n+${hudState.targetRelic.points} XP`,
        [{ text: 'Awesome!' }]
      );
    }
  }, [hudState, startScanning, captureRelic, addToInventory]);

  // Handle inventory press
  const handleInventoryPress = useCallback(() => {
    if (onOpenInventory) {
      onOpenInventory();
    } else {
      Alert.alert(
        'Inventory',
        `Collected: ${inventory.collected}/${inventory.total} relics in ${currentRegion.name}`
      );
    }
  }, [onOpenInventory, inventory, currentRegion]);

  // Permission handling
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // You can create a custom permission screen here
    requestPermission();
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView style={styles.container} facing="back">
        {/* AR 3D Relic - Placed in world space, can walk around */}
        {hudState.targetRelic && (
          <ARRelicViewer
            relic={hudState.targetRelic}
            visible={hudState.canCapture && !hudState.isScanning}
            relativeAngle={getTargetRelicPosition()?.relativeAngle ?? 0}
            compassHeading={compassHeading}
            useGPS={hasGPS}
          />
        )}

        {/* HUD Overlay */}
        <HUDLayout
          region={currentRegion}
          userProgress={userProgress}
          levelProgress={calculateLevelProgress()}
          radarDots={radarDots}
          compassHeading={compassHeading}
        >
          {/* Bottom Section */}
          <View style={styles.hudBottom}>
            {/* Action Button - Bottom Center */}
            <ActionFloatingButton
              hudState={hudState}
              onCapture={handleCapture}
              targetRelic={hudState.targetRelic}
            />
          </View>

          {/* Inventory - Bottom Right */}
          <InventoryQuickAccess
            inventory={inventory}
            onPress={handleInventoryPress}
          />
        </HUDLayout>
      </CameraView>
    </View>
  );
};

export default RelicHunter;
