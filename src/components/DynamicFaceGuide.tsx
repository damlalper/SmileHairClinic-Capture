import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  width?: number;
  height?: number;
  pitch: number;
  roll: number;
  yaw: number;
  accuracy: number;
  isValid: boolean;
  countdown?: number | null;
}

export const DynamicFaceGuide: React.FC<Props> = ({
  width = 260,
  height = 330,
  pitch,
  roll,
  yaw,
  accuracy,
  isValid,
  countdown = null,
}) => {
  const borderColor = isValid ? '#28a745' : accuracy > 50 ? '#ff9800' : '#e53935';

  return (
    <View style={[styles.container, { width, height }] as any} pointerEvents="none">
      <View style={[styles.frame, { borderColor }]}>
        {/* Dynamic arrows for left/right centering */}
        <View style={styles.arrowsRow}>
          <Text style={styles.arrow}>{roll < -5 ? '⬅️' : roll > 5 ? '➡️' : '⬆️'}</Text>
        </View>

        {/* Angle readouts */}
        <View style={styles.angleContainer}>
          <Text style={styles.angleText}>Pitch: {pitch.toFixed(0)}°</Text>
          <Text style={styles.angleText}>Roll: {roll.toFixed(0)}°</Text>
          <Text style={styles.angleText}>Yaw: {yaw.toFixed(0)}°</Text>
        </View>

        {/* Accuracy badge */}
        <View style={[styles.badge, { backgroundColor: borderColor }] as any}>
          <Text style={styles.badgeText}>{accuracy}%</Text>
        </View>

        {/* Countdown bubble */}
        {countdown !== null && (
          <Animated.View style={styles.countdownBubble}>
            <Text style={styles.countdownText}>{countdown > 0 ? countdown : '📸'}</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderRadius: 120,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  arrowsRow: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  arrow: {
    fontSize: 28,
  },
  angleContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  angleText: {
    color: '#fff',
    fontSize: 12,
    marginVertical: 2,
    fontFamily: 'monospace',
  },
  badge: {
    position: 'absolute',
    right: 12,
    top: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  countdownBubble: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#222',
  },
});

export default DynamicFaceGuide;
