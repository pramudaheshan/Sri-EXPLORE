import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InventoryState } from '../../types';
import {
  relicHunterStyles as styles,
  COLORS,
} from '../../styles/RelicHunterStyles';

interface InventoryQuickAccessProps {
  inventory: InventoryState;
  onPress: () => void;
}

export const InventoryQuickAccess: React.FC<InventoryQuickAccessProps> = ({
  inventory,
  onPress,
}) => {
  const { collected, total } = inventory;
  const hasNewItems = collected > 0;

  return (
    <View style={styles.inventoryContainer}>
      <TouchableOpacity
        style={styles.inventoryButton}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons
          name="cube-outline"
          size={26}
          color={hasNewItems ? COLORS.primary : COLORS.textMuted}
        />

        {/* Badge showing collected count */}
        <View style={styles.inventoryBadge}>
          <Text style={styles.inventoryBadgeText}>
            {collected}/{total}
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.inventoryLabel}>Relics</Text>
    </View>
  );
};

export default InventoryQuickAccess;
