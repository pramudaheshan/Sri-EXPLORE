import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HUDState, Relic } from '../../types';
import {
  relicHunterStyles as styles,
  COLORS,
} from '../../styles/RelicHunterStyles';

interface ActionFloatingButtonProps {
  hudState: HUDState;
  onCapture: () => void;
  targetRelic?: Relic | null;
}

export const ActionFloatingButton: React.FC<ActionFloatingButtonProps> = ({
  hudState,
  onCapture,
  targetRelic,
}) => {
  const { isScanning, canCapture } = hudState;

  const getButtonContent = () => {
    if (isScanning) {
      return (
        <>
          <ActivityIndicator size="small" color="#000" />
          <Text style={[styles.actionButtonText, { color: '#000' }]}>
            SCANNING
          </Text>
        </>
      );
    }

    if (canCapture) {
      return (
        <>
          <Ionicons name="scan" size={28} color="#000" />
          <Text style={[styles.actionButtonText, { color: '#000' }]}>
            CAPTURE
          </Text>
        </>
      );
    }

    return (
      <>
        <Ionicons name="search-outline" size={28} color={COLORS.textMuted} />
        <Text style={styles.actionButtonText}>SCAN</Text>
      </>
    );
  };

  const getHintText = () => {
    if (isScanning) {
      return 'Hold steady...';
    }
    if (canCapture && targetRelic) {
      return `${targetRelic.name} detected!`;
    }
    return 'Point at a relic to scan';
  };

  return (
    <View style={styles.actionButtonContainer}>
      {/* Outer ring */}
      <View
        style={[
          styles.actionButtonOuter,
          canCapture && styles.actionButtonOuterActive,
        ]}
      >
        {/* Main button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            canCapture && styles.actionButtonActive,
            isScanning && styles.actionButtonScanning,
          ]}
          onPress={onCapture}
          disabled={!canCapture || isScanning}
          activeOpacity={0.8}
        >
          {getButtonContent()}
        </TouchableOpacity>
      </View>

      {/* Hint text */}
      <Text style={styles.actionHint}>{getHintText()}</Text>
    </View>
  );
};

export default ActionFloatingButton;
