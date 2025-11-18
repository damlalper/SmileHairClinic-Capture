import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, CapturedPhoto } from '../types';
import { COLORS, ANGLE_CONFIGS, CAPTURE_SEQUENCE } from '../constants/angles';
import { usePhotos } from '../context/PhotoContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ReviewScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Review'>;
  route: RouteProp<RootStackParamList, 'Review'>;
};

// Helper: Calculate pitch accuracy correctly (range-based)
const calculatePitchAccuracy = (
  measuredPitch: number,
  targetMin: number,
  targetMax: number
): number => {
  const targetMid = (targetMin + targetMax) / 2;
  const rangeSize = targetMax - targetMin;
  const deviation = Math.abs(measuredPitch - targetMid);
  const maxDeviation = rangeSize / 2;

  if (deviation > maxDeviation * 2) return 0; // Too far off
  const accuracy = Math.max(0, 100 - (deviation / maxDeviation) * 100);
  return Math.min(100, accuracy);
};

// Helper: Calculate roll accuracy
const calculateRollAccuracy = (measuredRoll: number, tolerance: number = 5): number => {
  const deviation = Math.abs(measuredRoll);
  if (deviation > tolerance * 2) return 0;
  const accuracy = Math.max(0, 100 - (deviation / tolerance) * 100);
  return Math.min(100, accuracy);
};

// Helper: Calculate yaw accuracy
const calculateYawAccuracy = (
  measuredYaw: number,
  targetYaw: number,
  tolerance: number = 15
): number => {
  const deviation = Math.abs(measuredYaw - targetYaw);
  if (deviation > tolerance * 2) return 0;
  const accuracy = Math.max(0, 100 - (deviation / tolerance) * 100);
  return Math.min(100, accuracy);
};

// Helper: Calculate distance quality
const calculateDistanceQuality = (
  distance: number,
  targetMin: number = 30,
  targetMax: number = 50
): number => {
  if (distance < targetMin || distance > targetMax) {
    const deviation = distance < targetMin
      ? (targetMin - distance)
      : (distance - targetMax);
    return Math.max(0, 100 - (deviation / 20) * 100);
  }
  return 100;
};

export default function ReviewScreen({ navigation, route }: ReviewScreenProps) {
  const { photos, addPhoto } = usePhotos();
  const { photo } = route.params;
  const config = ANGLE_CONFIGS[photo.angle];
  const currentIndex = CAPTURE_SEQUENCE.indexOf(photo.angle);
  const isLastPhoto = currentIndex === CAPTURE_SEQUENCE.length - 1;

  // Extract metadata
  const metadata = photo.metadata || {};
  const pitch = metadata.pitch || 0;
  const roll = metadata.roll || 0;
  const yaw = metadata.yaw || 0;
  const distance = metadata.distance || 0;
  const validationState = metadata.validationState || {};
  const captureConfidence = metadata.captureConfidence || 0;
  const stabilizationDuration = metadata.stabilizationDuration || 0;

  // Calculate accuracies based on angle type
  let pitchAccuracy = 0;
  let rollAccuracy = 0;
  let yawAccuracy = 0;
  let distanceQuality = 0;

  // Phone angle requirements from config
  const phoneAngle = config.phoneAngle || { pitch: 0, roll: 0, tolerance: 5 };

  // Different calculation for different angles
  if (photo.angle === 'FRONT') {
    // Front face: pitch ~0°, roll ~0°, yaw ~0°
    pitchAccuracy = calculatePitchAccuracy(pitch, -5, 5);
    rollAccuracy = calculateRollAccuracy(roll, 5);
    yawAccuracy = calculateYawAccuracy(yaw, 0, 10);
    distanceQuality = calculateDistanceQuality(distance, 30, 40);
  } else if (photo.angle === 'RIGHT_45' || photo.angle === 'LEFT_45') {
    // 45° angles: pitch ~0°, roll ~0°
    pitchAccuracy = calculatePitchAccuracy(pitch, -5, 5);
    rollAccuracy = calculateRollAccuracy(roll, 5);

    // Yaw for right/left
    const targetYaw = photo.angle === 'RIGHT_45' ? 45 : -45;
    yawAccuracy = calculateYawAccuracy(yaw, targetYaw, 10);

    distanceQuality = calculateDistanceQuality(distance, 30, 40);
  } else if (photo.angle === 'VERTEX') {
    // Vertex: pitch -85° to -95°, roll ~0°
    pitchAccuracy = calculatePitchAccuracy(pitch, -95, -85);
    rollAccuracy = calculateRollAccuracy(roll, 5);
    yawAccuracy = 100; // Yaw not critical for vertex
    distanceQuality = calculateDistanceQuality(distance, 30, 45);
  } else if (photo.angle === 'BACK_DONOR') {
    // Back donor: pitch -85° to -100°, roll ~0°, yaw ~180°
    pitchAccuracy = calculatePitchAccuracy(pitch, -100, -85);
    rollAccuracy = calculateRollAccuracy(roll, 5);
    yawAccuracy = calculateYawAccuracy(Math.abs(yaw), 180, 15);
    distanceQuality = calculateDistanceQuality(distance, 30, 50);
  }

  // Overall quality score
  const overallQuality = (
    pitchAccuracy * 0.3 +
    rollAccuracy * 0.2 +
    yawAccuracy * 0.2 +
    distanceQuality * 0.2 +
    captureConfidence * 0.1
  );

  const handleRetake = () => {
    // Go back to camera screen for the same angle
    navigation.navigate('Camera', { angle: photo.angle });
  };

  const handleContinue = () => {
    // Save photo using context
    addPhoto(photo);

    if (isLastPhoto) {
      // All photos captured, go to completion screen
      // Pass photos via context, they'll be accessed in CompletionScreen
      navigation.navigate('Completion', { photos: [...photos, photo] });
    } else {
      // Move to next angle
      const nextAngle = CAPTURE_SEQUENCE[currentIndex + 1];
      navigation.navigate('Instructions', { angle: nextAngle });
    }
  };

  // Quality color helper
  const getQualityColor = (value: number): string => {
    if (value >= 90) return COLORS.success;
    if (value >= 75) return '#FFA726'; // Orange
    return '#F44336'; // Red
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Fotoğraf İncelemesi</Text>
          <Text style={styles.subtitle}>{config.title}</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {CAPTURE_SEQUENCE.length} tamamlandı
          </Text>
        </View>

        {/* Photo Preview */}
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.preview} />
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkIcon}>✓</Text>
          </View>
        </View>

        {/* Medical Accuracy Panel - NEW */}
        <View style={styles.accuracyCard}>
          <View style={styles.accuracyHeader}>
            <Text style={styles.accuracyTitle}>📊 Açı Analizi</Text>
            <Text style={[styles.overallScore, { color: getQualityColor(overallQuality) }]}>
              {overallQuality.toFixed(0)}%
            </Text>
          </View>

          <View style={styles.metricsContainer}>
            {/* Pitch Accuracy */}
            <MetricRow
              label="Pitch Doğruluğu"
              value={pitchAccuracy}
              detail={`${pitch.toFixed(1)}°`}
            />

            {/* Roll Accuracy */}
            <MetricRow
              label="Roll Doğruluğu"
              value={rollAccuracy}
              detail={`${roll.toFixed(1)}°`}
            />

            {/* Yaw Accuracy - only show if relevant */}
            {(photo.angle === 'RIGHT_45' || photo.angle === 'LEFT_45' || photo.angle === 'BACK_DONOR') && (
              <MetricRow
                label="Yaw Doğruluğu"
                value={yawAccuracy}
                detail={`${yaw.toFixed(1)}°`}
              />
            )}

            {/* Distance Quality */}
            <MetricRow
              label="Mesafe Kalitesi"
              value={distanceQuality}
              detail={`${distance.toFixed(0)} cm`}
            />

            {/* Stabilization */}
            {stabilizationDuration > 0 && (
              <MetricRow
                label="Stabilizasyon"
                value={stabilizationDuration >= 0.8 ? 100 : 70}
                detail={`${stabilizationDuration.toFixed(1)}s`}
              />
            )}
          </View>
        </View>

        {/* AI AutoShot Conditions Summary - NEW */}
        <View style={styles.conditionsCard}>
          <Text style={styles.conditionsTitle}>🤖 AI AutoShot Koşulları</Text>
          <View style={styles.conditionsGrid}>
            <ConditionItem
              label="Açı Uygunluğu"
              isValid={validationState.isPhonePitchValid && validationState.isPhoneRollValid}
            />
            <ConditionItem
              label="Merkezleme"
              isValid={validationState.isCentered !== false}
            />
            <ConditionItem
              label="Stabilite"
              isValid={stabilizationDuration >= 0.8}
            />
            <ConditionItem
              label="Güven Skoru"
              isValid={captureConfidence >= 85}
            />
          </View>
        </View>

        {/* Original Info Card - Simplified */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Çekim Zamanı:</Text>
            <Text style={styles.infoValue}>
              {new Date(photo.timestamp).toLocaleTimeString('tr-TR')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Güven Skoru:</Text>
            <Text style={[styles.infoValue, { color: getQualityColor(captureConfidence) }]}>
              {captureConfidence.toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Feedback */}
        <View style={[
          styles.feedbackCard,
          { backgroundColor: overallQuality >= 85 ? COLORS.success + '20' : '#FFA72620' }
        ]}>
          <Text style={styles.feedbackIcon}>
            {overallQuality >= 85 ? '✨' : '⚠️'}
          </Text>
          <Text style={styles.feedbackText}>
            {overallQuality >= 85
              ? 'Harika! Fotoğraf başarıyla çekildi.'
              : 'Fotoğraf çekildi, ancak tekrar çekmeyi düşünebilirsiniz.'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              {isLastPhoto ? 'Tamamla' : 'Devam Et →'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Text style={styles.retakeButtonText}>🔄 Tekrar Çek</Text>
          </TouchableOpacity>
        </View>

        {/* Next Angle Preview */}
        {!isLastPhoto && (
          <View style={styles.nextAngleCard}>
            <Text style={styles.nextAngleLabel}>Sıradaki:</Text>
            <Text style={styles.nextAngleText}>
              {ANGLE_CONFIGS[CAPTURE_SEQUENCE[currentIndex + 1]].title}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Component: Metric Row
interface MetricRowProps {
  label: string;
  value: number;
  detail?: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, detail }) => {
  const getColor = (val: number): string => {
    if (val >= 90) return COLORS.success;
    if (val >= 75) return '#FFA726';
    return '#F44336';
  };

  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLabelContainer}>
        <Text style={styles.metricLabel}>{label}</Text>
        {detail && <Text style={styles.metricDetail}>{detail}</Text>}
      </View>
      <View style={styles.metricValueContainer}>
        <View style={styles.metricBar}>
          <View
            style={[
              styles.metricBarFill,
              { width: `${value}%`, backgroundColor: getColor(value) },
            ]}
          />
        </View>
        <Text style={[styles.metricValue, { color: getColor(value) }]}>
          {value.toFixed(0)}%
        </Text>
      </View>
    </View>
  );
};

// Helper Component: Condition Item
interface ConditionItemProps {
  label: string;
  isValid: boolean;
}

const ConditionItem: React.FC<ConditionItemProps> = ({ label, isValid }) => (
  <View style={styles.conditionItem}>
    <Text style={styles.conditionIcon}>{isValid ? '✓' : '✗'}</Text>
    <Text style={[styles.conditionLabel, { color: isValid ? COLORS.success : '#F44336' }]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  previewContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  preview: {
    width: SCREEN_WIDTH - 48,
    height: (SCREEN_WIDTH - 48) * 1.33,
    borderRadius: 16,
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkIcon: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: 'bold',
  },
  accuracyCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accuracyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accuracyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  overallScore: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricsContainer: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabelContainer: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  metricDetail: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
  },
  metricBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  conditionsCard: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  conditionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    minWidth: '45%',
  },
  conditionIcon: {
    fontSize: 16,
  },
  conditionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  feedbackIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  feedbackText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  retakeButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  retakeButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  nextAngleCard: {
    alignItems: 'center',
  },
  nextAngleLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  nextAngleText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
