import React from 'react';
import { View } from 'react-native';
import { DiscoveryBar } from './DiscoveryBar';
import { CompassRadar } from './CompassRadar';
import { Region, UserProgress, RadarDot } from '../../types';
import { relicHunterStyles as styles } from '../../styles/RelicHunterStyles';

interface HUDLayoutProps {
  region: Region;
  userProgress: UserProgress;
  levelProgress: number;
  radarDots: RadarDot[];
  compassHeading: number;
  children?: React.ReactNode;
}

export const HUDLayout: React.FC<HUDLayoutProps> = ({
  region,
  userProgress,
  levelProgress,
  radarDots,
  compassHeading,
  children,
}) => {
  return (
    <View style={styles.hudContainer} pointerEvents="box-none">
      {/* Top Section */}
      <View style={styles.hudTop}>
        {/* Discovery Bar - Top Left */}
        <DiscoveryBar
          region={region}
          userProgress={userProgress}
          levelProgress={levelProgress}
        />

        {/* Compass Radar - Top Right */}
        <CompassRadar radarDots={radarDots} compassHeading={compassHeading} />
      </View>

      {/* Additional HUD elements */}
      {children}
    </View>
  );
};

export default HUDLayout;
