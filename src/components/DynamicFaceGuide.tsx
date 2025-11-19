import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CaptureAngle } from '../types';

interface Props {
  width?: number;
  height?: number;
  pitch: number;
  roll: number;
  yaw: number;
  accuracy: number;
  isValid: boolean;
  countdown?: number | null;
  angle?: CaptureAngle; // ✅ NEW: To show angle-specific silhouettes
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
  angle,
}) => {
  const borderColor = isValid ? '#28a745' : accuracy > 50 ? '#ff9800' : '#e53935';

  // ✅ Determine silhouette shape based on angle
  const getSilhouetteHint = () => {
    switch (angle) {
      case CaptureAngle.FRONT:
        return '👤 Tam Yüz';
      case CaptureAngle.RIGHT_45:
        return '🌗 Sağ Profil →';
      case CaptureAngle.LEFT_45:
        return '🌓 ← Sol Profil';
      case CaptureAngle.VERTEX:
        return '⬆️ Tepe';
      case CaptureAngle.BACK_DONOR:
        return '⬇️ Ense';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, { width, height }] as any} pointerEvents="none">
      <View style={[styles.frame, { borderColor }]}>
        {/* ✅ CROSSHAIR - Center alignment guide */}
        <View style={styles.crosshair}>
          {/* Horizontal line */}
          <View style={[styles.crosshairLine, styles.crosshairHorizontal, { backgroundColor: borderColor }]} />
          {/* Vertical line */}
          <View style={[styles.crosshairLine, styles.crosshairVertical, { backgroundColor: borderColor }]} />
          {/* Center dot */}
          <View style={[styles.crosshairDot, { backgroundColor: borderColor }]} />
        </View>

        {/* Dynamic arrows for left/right centering */}
        <View style={styles.arrowsRow}>
          <Text style={styles.arrow}>{roll < -5 ? '⬅️' : roll > 5 ? '➡️' : '⬆️'}</Text>
        </View>

        {/* ✅ Silhouette Hint - Shows expected angle */}
        {angle && (
          <View style={styles.silhouetteHint}>
            <Text style={styles.silhouetteText}>{getSilhouetteHint()}</Text>
          </View>
        )}

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
  // ✅ CROSSHAIR STYLES
  crosshair: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairLine: {
    position: 'absolute',
    opacity: 0.6,
  },
  crosshairHorizontal: {
    width: 40,
    height: 2,
  },
  crosshairVertical: {
    width: 2,
    height: 40,
  },
  crosshairDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.8,
  },
  arrowsRow: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  arrow: {
    fontSize: 28,
  },
  // ✅ SILHOUETTE HINT STYLES
  silhouetteHint: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  silhouetteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
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
