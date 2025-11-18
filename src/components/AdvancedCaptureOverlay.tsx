/**
 * ═══════════════════════════════════════════════════════════════════
 * ADVANCED CAPTURE OVERLAY - TÜM SİSTEMLERİ BİRLEŞTİREN UI
 * ═══════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { AngleConfidenceScore, AutoShutterState } from '../utils/advancedCaptureIntelligence';
import { PhoneOrientation } from '../utils/advancedSensorFusion';
import { HeadPoseEstimate } from '../utils/hybridHeadPose';
import { getConfidenceColor } from '../utils/advancedCaptureIntelligence';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  // Yeni gelişmiş sistemler
  shutterState: AutoShutterState;
  phoneOrientation: PhoneOrientation;
  headPose: HeadPoseEstimate | null; // null for sensor-only screens (Vertex, BackDonor)

  // Opsiyonel görünürlük kontrolleri
  showAngleBars?: boolean;
  showConfidenceScore?: boolean;
  showConditions?: boolean;
  showCountdown?: boolean;
}

export const AdvancedCaptureOverlay: React.FC<Props> = ({
  shutterState,
  phoneOrientation,
  headPose,
  showAngleBars = true,
  showConfidenceScore = true,
  showConditions = true,
  showCountdown = true,
}) => {
  const { confidenceScore, conditions, countdown, ready, blockers } = shutterState;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ANGLE BARS - Pitch/Roll/Yaw Göstergeleri */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showAngleBars && (
        <View style={styles.angleBarsContainer}>
          <Text style={styles.sectionTitle}>Açı Göstergeleri</Text>

          {/* Head Pose Bars - Only show if headPose is available */}
          {headPose && (
            <>
              <AngleBar
                label="Head Yaw"
                value={headPose.yaw}
                min={-90}
                max={90}
                valid={Math.abs(headPose.yaw) <= 15}
              />
              <AngleBar
                label="Head Pitch"
                value={headPose.pitch}
                min={-90}
                max={90}
                valid={Math.abs(headPose.pitch) <= 15}
              />
              <AngleBar
                label="Head Roll"
                value={headPose.roll}
                min={-90}
                max={90}
                valid={Math.abs(headPose.roll) <= 10}
              />
              <View style={styles.divider} />
            </>
          )}

          {/* Phone Orientation Bars */}
          <AngleBar
            label="Phone Pitch"
            value={phoneOrientation.pitch}
            min={-180}
            max={180}
            valid={conditions.phoneAngleValid}
          />
          <AngleBar
            label="Phone Roll"
            value={phoneOrientation.roll}
            min={-180}
            max={180}
            valid={conditions.phoneAngleValid}
          />
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONFIDENCE SCORE - Master Kalite Skoru */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showConfidenceScore && (
        <View style={styles.confidenceContainer}>
          <Text style={styles.sectionTitle}>Kalite Skoru</Text>

          {/* Overall Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${confidenceScore.percentage}%`,
                    backgroundColor: getConfidenceColor(confidenceScore.overall),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(confidenceScore.percentage)}%
            </Text>
          </View>

          {/* Level Badge */}
          <View
            style={[
              styles.levelBadge,
              { backgroundColor: getConfidenceColor(confidenceScore.overall) },
            ]}
          >
            <Text style={styles.levelText}>{confidenceScore.level}</Text>
          </View>

          {/* Individual Scores */}
          <View style={styles.scoresGrid}>
            <ScoreItem label="Pose" value={confidenceScore.poseScore} />
            <ScoreItem label="Phone" value={confidenceScore.phoneAngleScore} />
            <ScoreItem label="Center" value={confidenceScore.centeringScore} />
            <ScoreItem label="Distance" value={confidenceScore.distanceScore} />
            <ScoreItem label="Region" value={confidenceScore.regionMatchScore} />
            <ScoreItem label="Light" value={confidenceScore.qualityScore} />
          </View>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 7 CONDITIONS - Otomatik Deklanşör Koşulları */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showConditions && (
        <View style={styles.conditionsContainer}>
          <Text style={styles.sectionTitle}>Koşullar (7/7)</Text>
          <ConditionItem label="Baş Açısı" valid={conditions.headAngleValid} />
          <ConditionItem label="Telefon Açısı" valid={conditions.phoneAngleValid} />
          <ConditionItem label="Bölge" valid={conditions.regionCorrect} />
          <ConditionItem label="Mesafe" valid={conditions.distanceValid} />
          <ConditionItem label="Işık" valid={conditions.lightingOk} />
          <ConditionItem label="Stabilite" valid={conditions.maskStable} />
          <ConditionItem label="Jitter" valid={conditions.angleJitterLow} />
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* COUNTDOWN - Geri Sayım */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showCountdown && countdown !== null && countdown > 0 && (
        <View style={styles.countdownContainer}>
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FEEDBACK - Kullanıcı Geri Bildirimi */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <View style={styles.feedbackContainer}>
        <View
          style={[
            styles.feedbackBubble,
            {
              backgroundColor: ready
                ? 'rgba(76, 175, 80, 0.9)'
                : 'rgba(255, 152, 0, 0.9)',
            },
          ]}
        >
          <Text style={styles.feedbackText}>
            {ready ? '✓ Harika! Çekilmeye hazır' : blockers[0] || confidenceScore.feedback}
          </Text>
        </View>
      </View>

      {/* Ready Indicator */}
      {ready && (
        <View style={styles.readyIndicator}>
          <Text style={styles.readyText}>🎯 READY TO CAPTURE</Text>
        </View>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// YARDIMCI BİLEŞENLER
// ═══════════════════════════════════════════════════════════════════

interface AngleBarProps {
  label: string;
  value: number;
  min: number;
  max: number;
  valid: boolean;
}

const AngleBar: React.FC<AngleBarProps> = ({ label, value, min, max, valid }) => {
  // Normalize to 0-100%
  const normalizedValue = ((value - min) / (max - min)) * 100;
  const clampedValue = Math.max(0, Math.min(100, normalizedValue));

  return (
    <View style={styles.angleBarRow}>
      <Text style={styles.angleLabel}>{label}</Text>
      <View style={styles.angleBarTrack}>
        <View
          style={[
            styles.angleBarFill,
            {
              width: `${clampedValue}%`,
              backgroundColor: valid ? '#4CAF50' : '#F44336',
            },
          ]}
        />
        {/* Center marker (50%) */}
        <View style={styles.centerMarker} />
      </View>
      <Text style={styles.angleValue}>{value.toFixed(0)}°</Text>
    </View>
  );
};

interface ScoreItemProps {
  label: string;
  value: number;
}

const ScoreItem: React.FC<ScoreItemProps> = ({ label, value }) => {
  const percentage = Math.round(value * 100);
  const color = percentage >= 70 ? '#4CAF50' : percentage >= 50 ? '#FF9800' : '#F44336';

  return (
    <View style={styles.scoreItem}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={[styles.scoreValue, { color }]}>{percentage}%</Text>
    </View>
  );
};

interface ConditionItemProps {
  label: string;
  valid: boolean;
}

const ConditionItem: React.FC<ConditionItemProps> = ({ label, valid }) => {
  return (
    <View style={styles.conditionRow}>
      <Text style={styles.conditionIcon}>{valid ? '✓' : '○'}</Text>
      <Text style={[styles.conditionText, { color: valid ? '#4CAF50' : '#FFF' }]}>
        {label}
      </Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
  },

  // Section Title
  sectionTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 8,
  },

  // ═══════════════════════════════════════════════════════════════
  // ANGLE BARS
  // ═══════════════════════════════════════════════════════════════
  angleBarsContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    minWidth: 240,
  },

  angleBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  angleLabel: {
    color: '#FFF',
    fontSize: 11,
    width: 80,
    fontFamily: 'monospace',
  },

  angleBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    marginHorizontal: 8,
    position: 'relative',
    overflow: 'hidden',
  },

  angleBarFill: {
    height: 8,
    borderRadius: 4,
  },

  centerMarker: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFF',
    opacity: 0.5,
  },

  angleValue: {
    color: '#FFF',
    fontSize: 11,
    width: 40,
    textAlign: 'right',
    fontFamily: 'monospace',
  },

  // ═══════════════════════════════════════════════════════════════
  // CONFIDENCE SCORE
  // ═══════════════════════════════════════════════════════════════
  confidenceContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    minWidth: 200,
  },

  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressBarBackground: {
    flex: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: 20,
    borderRadius: 10,
  },

  progressText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    width: 45,
  },

  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },

  levelText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },

  scoreItem: {
    width: '33%',
    marginBottom: 4,
  },

  scoreLabel: {
    color: '#AAA',
    fontSize: 9,
    textTransform: 'uppercase',
  },

  scoreValue: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },

  // ═══════════════════════════════════════════════════════════════
  // CONDITIONS
  // ═══════════════════════════════════════════════════════════════
  conditionsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    minWidth: 180,
  },

  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  conditionIcon: {
    color: '#FFF',
    fontSize: 14,
    width: 20,
  },

  conditionText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },

  // ═══════════════════════════════════════════════════════════════
  // COUNTDOWN
  // ═══════════════════════════════════════════════════════════════
  countdownContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -75 }],
  },

  countdownCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#4CAF50',
  },

  countdownText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#4CAF50',
  },

  // ═══════════════════════════════════════════════════════════════
  // FEEDBACK
  // ═══════════════════════════════════════════════════════════════
  feedbackContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  feedbackBubble: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '80%',
  },

  feedbackText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ═══════════════════════════════════════════════════════════════
  // READY INDICATOR
  // ═══════════════════════════════════════════════════════════════
  readyIndicator: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  readyText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default AdvancedCaptureOverlay;
