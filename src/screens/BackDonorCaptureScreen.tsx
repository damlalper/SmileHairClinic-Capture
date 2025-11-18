/**
 * ═══════════════════════════════════════════════════════════════════
 * BACK DONOR CAPTURE SCREEN - PRODUCTION VERSION
 * ═══════════════════════════════════════════════════════════════════
 *
 * Açı 5: Ense/Arka (Back Donor Area)
 * - Yüz algılama YOK (kamera enseye bakar)
 * - Sadece telefon sensör validasyonu
 * - Telefon pitch: -85° ~ -100° (yukarıdan aşağı/hafif arkaya eğik)
 * - Telefon yaw: ~180° (arka yöne bakmalı) - KRİTİK!
 * - Telefon roll: ±5° tolerans (NOT ±10°)
 * - Mesafe: sensör tabanlı yaklaşım (%25-40)
 * - Auto-capture only (stabilization timer ile)
 * - Haptic feedback
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { useAdvancedCapture } from '../hooks/useAdvancedCapture';
import DynamicFaceGuide from '../components/DynamicFaceGuide';
import { CaptureAngle } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type RootStackParamList = {
  BackDonorCapture: undefined;
  Review: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'BackDonorCapture'>;

const BackDonorCaptureScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');

  const [isCapturing, setIsCapturing] = useState(false);

  // Back Donor için useAdvancedCapture hook
  const {
    isReadyToCapture,
    smartFeedback,
    validationState,
    phoneOrientation,
  } = useAdvancedCapture({
    captureAngle: CaptureAngle.BACK_DONOR,
  });

  // Haptic feedback helper with fallback
  const triggerHaptic = async (type: 'trigger' | 'success' | 'error' | 'warning') => {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        switch (type) {
          case 'trigger':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          case 'warning':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
        }
      }
    } catch {
      // Fallback to vibration
      const pattern = type === 'success' ? [0, 100, 50, 100] : [0, 100];
      Vibration.vibrate(pattern);
    }
  };

  // Sensor-based distance estimation for Back Donor
  // Similar to Vertex, we use pitch stability as heuristic
  const estimateSensorBasedDistance = (): number => {
    if (!phoneOrientation) return 50; // Default 50cm

    const pitchDeviation = Math.abs(phoneOrientation.pitch + 92.5); // Target mid-point: -92.5°
    const rollDeviation = Math.abs(phoneOrientation.roll);

    // If both pitch and roll are stable, assume good distance control
    if (pitchDeviation < 3 && rollDeviation < 3) return 35; // Good distance ~35cm
    if (pitchDeviation < 7 && rollDeviation < 5) return 40; // Acceptable
    return 50; // Too uncertain
  };

  // Calculate phone yaw (for back-facing verification)
  // Yaw should be ~180° for back donor (camera pointing backward)
  const calculateYaw = (): number => {
    if (!phoneOrientation) return 0;
    // Assuming phoneOrientation.yaw is already calculated in sensor fusion
    // For back donor, we expect yaw close to 180° or -180°
    return phoneOrientation.yaw;
  };

  // Auto-capture when ready
  useEffect(() => {
    if (isReadyToCapture && !isCapturing) {
      handleAutoCapture();
    }
  }, [isReadyToCapture]);

  const handleAutoCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    await triggerHaptic('success');

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      });

      const distance = estimateSensorBasedDistance();
      const pitchDeviation = phoneOrientation ? Math.abs(phoneOrientation.pitch + 92.5) : 999;
      const rollDeviation = phoneOrientation ? Math.abs(phoneOrientation.roll) : 999;
      const yaw = calculateYaw();
      const yawDeviation = Math.abs(Math.abs(yaw) - 180); // Distance from 180° or -180°

      // Calculate capture confidence
      const pitchOk = pitchDeviation < 5;
      const rollOk = rollDeviation < 5;
      const yawOk = yawDeviation < 15; // Tolerance for yaw
      const captureConfidence = pitchOk && rollOk && yawOk ? 95 : pitchOk && rollOk ? 85 : 70;

      const metadata = {
        captureType: 'back_donor',
        captureAngle: CaptureAngle.BACK_DONOR,
        timestamp: new Date().toISOString(),
        phoneOrientation: phoneOrientation || { pitch: 0, roll: 0, yaw: 0 },
        pitch: phoneOrientation?.pitch || 0,
        roll: phoneOrientation?.roll || 0,
        yaw: yaw,
        pitchDeviation, // How far from -92.5° (mid-point of -85 to -100)
        rollDeviation, // How far from 0°
        yawDeviation, // How far from 180°
        distance,
        distanceConfidence: pitchDeviation < 5 && rollDeviation < 5 ? 90 : 70,
        validationState,
        headPose: null, // No face in Back Donor
        captureConfidence,
        stabilizationDuration: 1.0, // From useAdvancedCapture hook
        deviceModel: Platform.OS,
        phoneElevation: phoneOrientation?.pitch || 0, // Same as pitch for back donor
      };

      // Navigate to review with photo data
      navigation.navigate('Review', {
        photo: {
          uri: `file://${photo.path}`,
          angle: CaptureAngle.BACK_DONOR,
          timestamp: Date.now(),
          metadata: {
            pitch: phoneOrientation?.pitch || 0,
            roll: phoneOrientation?.roll || 0,
            distance,
          },
        },
      });
    } catch (error) {
      console.error('Back donor capture error:', error);
      await triggerHaptic('error');
    } finally {
      setIsCapturing(false);
    }
  };

  // Calculate pitch deviation percentage for UI
  const getPitchDeviationPercent = (): number => {
    if (!phoneOrientation) return 100;
    const deviation = Math.abs(phoneOrientation.pitch + 92.5); // Mid-point of -85 to -100
    return Math.max(0, 100 - (deviation / 15) * 100); // 15° max deviation
  };

  // Calculate roll deviation percentage for UI
  const getRollDeviationPercent = (): number => {
    if (!phoneOrientation) return 100;
    const deviation = Math.abs(phoneOrientation.roll);
    return Math.max(0, 100 - (deviation / 5) * 100);
  };

  // Calculate yaw deviation percentage for UI
  const getYawDeviationPercent = (): number => {
    if (!phoneOrientation) return 100;
    const yaw = calculateYaw();
    const deviation = Math.abs(Math.abs(yaw) - 180);
    return Math.max(0, 100 - (deviation / 30) * 100); // 30° max deviation
  };

  // Pitch validation (target: -92.5°, range: -85° to -100°)
  const isPitchValid = phoneOrientation
    ? phoneOrientation.pitch >= -100 && phoneOrientation.pitch <= -85
    : false;

  // Roll validation (target: 0°, tolerance: ±5° NOT ±10°)
  const isRollValid = phoneOrientation ? Math.abs(phoneOrientation.roll) <= 5 : false;

  // Yaw validation (target: ~180° or -180°, tolerance: ±15°)
  const yaw = calculateYaw();
  const isYawValid = Math.abs(Math.abs(yaw) - 180) <= 15;

  // Wrong direction warning (phone not pointing backward)
  const showWrongDirectionWarning = !isYawValid && phoneOrientation;

  // Extreme pitch warning
  const showPitchWarning = phoneOrientation
    ? phoneOrientation.pitch > -85 || phoneOrientation.pitch < -100
    : false;

  if (!device) {
    return (
      <View style={styles.container}>
        <Text>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        ref={cameraRef}
        photo={true}
      />

      {/* Dynamic Face Guide Overlay - for Back Donor we show neck/donor area target */}
      <DynamicFaceGuide
        width={SCREEN_WIDTH * 0.7}
        height={SCREEN_WIDTH * 0.9}
        pitch={phoneOrientation?.pitch || 0}
        roll={phoneOrientation?.roll || 0}
        yaw={phoneOrientation?.yaw || 0}
        accuracy={validationState?.angleAccuracy || 0}
        isValid={isReadyToCapture}
        countdown={null}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ense/Arka (Donor) Çekimi</Text>
        <Text style={styles.subtitle}>
          Telefonu başınızın arkasından tutun - Kamera enseye bakmalı
        </Text>
      </View>

      {/* Pitch, Roll & Yaw Angle Panel */}
      {phoneOrientation && (
        <View style={styles.anglePanel}>
          <Text style={styles.panelTitle}>Telefon Açıları</Text>

          {/* Pitch (Vertical tilt) */}
          <AngleIndicator
            label="Pitch (Dikey)"
            value={phoneOrientation.pitch}
            isValid={isPitchValid}
            targetRange="-85° to -100°"
            deviationPercent={getPitchDeviationPercent()}
          />

          {/* Roll (Horizontal tilt) - CORRECTED: ±5° NOT ±10° */}
          <AngleIndicator
            label="Roll (Yatay)"
            value={phoneOrientation.roll}
            isValid={isRollValid}
            targetRange="0° (±5°)"
            deviationPercent={getRollDeviationPercent()}
          />

          {/* Yaw (Direction) - CRITICAL: Should be ~180° */}
          <AngleIndicator
            label="Yaw (Yön)"
            value={yaw}
            isValid={isYawValid}
            targetRange="~180° (arka)"
            deviationPercent={getYawDeviationPercent()}
          />

          <View style={styles.divider} />

          {/* Distance (Sensor-based estimate) */}
          <View style={styles.distanceInfo}>
            <Text style={styles.distanceLabel}>Tahmini Mesafe:</Text>
            <Text style={styles.distanceValue}>{estimateSensorBasedDistance()} cm</Text>
          </View>
        </View>
      )}

      {/* Validation Status Panel */}
      {validationState && (
        <View style={styles.validationPanel}>
          <Text style={styles.panelTitle}>Doğrulama Durumu</Text>
          <ValidationItem label="Pitch Açısı" isValid={validationState.isPhonePitchValid} />
          <ValidationItem label="Roll Açısı" isValid={validationState.isPhoneRollValid} />
          <ValidationItem label="Yön (Yaw)" isValid={isYawValid} />
        </View>
      )}

      {/* Feedback Message */}
      <View style={styles.feedbackContainer}>
        <Text
          style={[
            styles.feedbackText,
            {
              color: isReadyToCapture ? '#4CAF50' : '#FFFFFF',
              backgroundColor: isReadyToCapture
                ? 'rgba(76, 175, 80, 0.25)'
                : 'rgba(0, 0, 0, 0.85)',
            },
          ]}
        >
          {smartFeedback}
        </Text>
      </View>

      {/* Wrong Direction Warning (Yaw not ~180°) */}
      {showWrongDirectionWarning && (
        <View style={styles.wrongDirectionOverlay}>
          <Text style={styles.warningTitle}>⚠️ YANLIŞ YÖN!</Text>
          <Text style={styles.warningMessage}>
            Telefon ARKAYA bakmalı (enseye doğru)
          </Text>
          <Text style={styles.warningDetail}>
            Mevcut Yaw: {yaw.toFixed(0)}° | Hedef: ~180° (arka yön)
          </Text>
          <Text style={styles.warningSubDetail}>
            Telefonu başınızın arkasına doğru çevirin
          </Text>
        </View>
      )}

      {/* Extreme Pitch Warning Overlay */}
      {showPitchWarning && !showWrongDirectionWarning && (
        <View style={styles.extremeWarningOverlay}>
          <Text style={styles.warningTitle}>⚠️ TELEFON AÇISI YANLIŞ</Text>
          <Text style={styles.warningMessage}>
            {phoneOrientation && phoneOrientation.pitch > -85
              ? 'Telefonu YUKARI ve ARKAYA kaldırın'
              : 'Telefonu hafif ÖNE getirin'}
          </Text>
          <Text style={styles.warningDetail}>
            Mevcut: {phoneOrientation?.pitch.toFixed(0)}° | Hedef: -85° to -100°
          </Text>
        </View>
      )}
    </View>
  );
};

// Helper Component: Angle Indicator with Deviation Bar
interface AngleIndicatorProps {
  label: string;
  value: number;
  isValid: boolean;
  targetRange?: string;
  deviationPercent?: number;
}

const AngleIndicator: React.FC<AngleIndicatorProps> = ({
  label,
  value,
  isValid,
  targetRange,
  deviationPercent,
}) => (
  <View style={styles.angleItem}>
    <View style={styles.angleHeader}>
      <Text style={styles.angleLabel}>{label}</Text>
      {targetRange && <Text style={styles.targetRange}>{targetRange}</Text>}
    </View>
    <View style={styles.angleValueContainer}>
      {/* Deviation Heat Bar */}
      {deviationPercent !== undefined && (
        <View style={styles.deviationBar}>
          <View
            style={[
              styles.deviationFill,
              {
                width: `${deviationPercent}%`,
                backgroundColor: isValid ? '#4CAF50' : deviationPercent > 50 ? '#FFA726' : '#F44336',
              },
            ]}
          />
        </View>
      )}
      <View style={styles.angleRow}>
        <Text style={[styles.angleValue, { color: isValid ? '#4CAF50' : '#F44336' }]}>
          {value.toFixed(1)}°
        </Text>
        <Text style={[styles.angleStatus, { color: isValid ? '#4CAF50' : '#F44336' }]}>
          {isValid ? '✓' : '✗'}
        </Text>
      </View>
    </View>
  </View>
);

// Helper Component: Validation Item
interface ValidationItemProps {
  label: string;
  isValid: boolean;
}

const ValidationItem: React.FC<ValidationItemProps> = ({ label, isValid }) => (
  <View style={styles.validationItem}>
    <Text style={styles.validationLabel}>{label}</Text>
    <View style={[styles.validationDot, { backgroundColor: isValid ? '#4CAF50' : '#F44336' }]} />
    <Text style={[styles.validationStatus, { color: isValid ? '#4CAF50' : '#F44336' }]}>
      {isValid ? 'UYGUN' : 'DEĞİL'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  anglePanel: {
    position: 'absolute',
    top: 130,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  validationPanel: {
    position: 'absolute',
    bottom: 200,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  angleItem: {
    marginBottom: 12,
  },
  angleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  angleLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  targetRange: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
  angleValueContainer: {
    gap: 4,
  },
  deviationBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  deviationFill: {
    height: '100%',
    borderRadius: 3,
  },
  angleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  angleValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  angleStatus: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 10,
  },
  distanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  validationLabel: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  validationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  validationStatus: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  feedbackContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  feedbackText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  wrongDirectionOverlay: {
    position: 'absolute',
    top: '35%',
    left: 30,
    right: 30,
    backgroundColor: 'rgba(255, 87, 34, 0.95)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  extremeWarningOverlay: {
    position: 'absolute',
    top: '40%',
    left: 30,
    right: 30,
    backgroundColor: 'rgba(244, 67, 54, 0.95)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  warningMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningDetail: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 4,
  },
  warningSubDetail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default BackDonorCaptureScreen;
