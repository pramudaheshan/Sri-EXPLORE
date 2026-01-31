import React from 'react';
import { View, Text } from 'react-native';
import { RadarDot } from '../../types';
import {
  relicHunterStyles as styles,
  SIZES,
  COLORS,
  getRarityColor,
} from '../../styles/RelicHunterStyles';

interface CompassRadarProps {
  radarDots: RadarDot[];
  compassHeading: number;
}

export const CompassRadar: React.FC<CompassRadarProps> = ({
  radarDots,
  compassHeading,
}) => {
  const radarRadius = (SIZES.radarSize - 24) / 2;

  // Calculate dot position on radar
  const getDotPosition = (dot: RadarDot) => {
    // Adjust angle based on compass heading
    const adjustedAngle = (dot.angle - compassHeading + 360) % 360;
    const radians = (adjustedAngle - 90) * (Math.PI / 180);
    const distance = dot.distance * radarRadius * 0.85;

    return {
      left:
        SIZES.radarSize / 2 +
        Math.cos(radians) * distance -
        SIZES.radarDotSize / 2,
      top:
        SIZES.radarSize / 2 +
        Math.sin(radians) * distance -
        SIZES.radarDotSize / 2,
    };
  };

  // Get cardinal direction based on heading
  const getCardinalDirection = (): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(compassHeading / 45) % 8;
    return directions[index];
  };

  return (
    <View style={styles.radarContainer}>
      {/* Direction indicator at top */}
      <View style={styles.radarDirectionIndicator} />

      {/* Inner radar circle */}
      <View style={styles.radarInner}>
        {/* Cardinal direction labels */}
        <Text style={[styles.compassLabel, { top: 2 }]}>
          {getCardinalDirection()}
        </Text>

        {/* Center dot (user position) */}
        <View style={styles.radarCenterDot} />

        {/* Relic dots */}
        {radarDots.map((dot) => {
          const position = getDotPosition(dot);
          const color = getRarityColor(dot.rarity);

          return (
            <View
              key={dot.id}
              style={[
                styles.radarDot,
                {
                  backgroundColor: color,
                  left: position.left,
                  top: position.top,
                  shadowColor: color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Compass heading */}
      <Text
        style={[
          styles.compassLabel,
          { bottom: 6, color: COLORS.textSecondary },
        ]}
      >
        {Math.round(compassHeading)}°
      </Text>
    </View>
  );
};

export default CompassRadar;
