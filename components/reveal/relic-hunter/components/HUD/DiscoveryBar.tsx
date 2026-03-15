import React from 'react';
import { View, Text } from 'react-native';
import { Region, UserProgress } from '../../types';
import {
  relicHunterStyles as styles,
  COLORS,
} from '../../styles/RelicHunterStyles';

interface DiscoveryBarProps {
  region: Region;
  userProgress: UserProgress;
  levelProgress: number;
}

export const DiscoveryBar: React.FC<DiscoveryBarProps> = ({
  region,
  userProgress,
  levelProgress,
}) => {
  return (
    <View style={styles.discoveryBar}>
      {/* Region Info */}
      <Text style={styles.discoveryRegion}>{region.name}</Text>
      <Text style={styles.discoverySubtitle}>{region.subtitle}</Text>

      {/* Level & Experience */}
      <View style={styles.levelContainer}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LV {userProgress.level}</Text>
        </View>
        <View style={styles.experienceBar}>
          <View
            style={[styles.experienceFill, { width: `${levelProgress}%` }]}
          />
        </View>
      </View>
    </View>
  );
};

export default DiscoveryBar;
