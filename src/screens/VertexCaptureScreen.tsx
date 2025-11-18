/**
 * ═══════════════════════════════════════════════════════════════════
 * VERTEX (TOP) CAPTURE SCREEN - PRODUCTION VERSION
 * ═══════════════════════════════════════════════════════════════════
 *
 * Açı 4: Tepe (Vertex)
 * - Yüz algılama YOK (kamera yukarıdan aşağı bakar)
 * - Sadece telefon sensör validasyonu
 * - Telefon pitch: -85° ~ -95° (yukarıdan aşağı, ideal -90°)
 * - Telefon roll: ±5° tolerans
 * - Mesafe: sensör tabanlı yaklaşım (yüz yok)
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
import { CameraView } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { useAdvancedCapture } from '../hooks/useAdvancedCapture';
import { DynamicFaceGuide } from '../components/DynamicFaceGuide';
import { CaptureAngle } from '../types';
import { usePhotoContext } from '../context/PhotoContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type RootStackParamList = {
  VertexCapture: undefined;
  BackDonorCapture: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'VertexCapture'>;

const VertexCaptureScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const cameraRef = useRef<any>(null);
  const { addPhoto } = usePhotoContext();

  const [isCapturing, setIsCapturing] = useState(false);

  // Vertex için useAdvancedCapture hook
  const {
    isReadyToCapture,
    smartFeedback,
    validationState,
    processFace,
    reset,
    headPose,
    phoneOrientation,
  } = useAdvancedCapture({
    captureAngle: CaptureAngle.VERTEX,
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

  // Sensor-based distance estimation for Vertex
  // Since there's no face, we use approximate heuristic based on phone pitch stability
  const estimateSensorBasedDistance = (): number => {
    if (!phoneOrientation) return 50; // Default 50cm

    // For vertex capture, ideal distance is when phone pitch is stable at -90°
    // We approximate: more stable pitch = better distance control
    const pitchDeviation = Math.abs(phoneOrientation.pitch + 90);

    // If pitch is close to -90°, assume user has good control = proper distance
    if (pitchDeviation < 3) return 35; // Good distance ~35cm
    if (pitchDeviation < 7) return 40; // Acceptable
    return 50; // Too uncertain
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
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: false,
        exif: true,
      });

      const distance = estimateSensorBasedDistance();
      const pitchDeviation = phoneOrientation ? Math.abs(phoneOrientation.pitch + 90) : 999;
      const rollDeviation = phoneOrientation ? Math.abs(phoneOrientation.roll) : 999;

      const metadata = {
        captureType: 'vertex',
        captureAngle: CaptureAngle.VERTEX,
        timestamp: new Date().toISOString(),
        phoneOrientation: phoneOrientation || { pitch: 0, roll: 0, yaw: 0 },
        pitch: phoneOrientation?.pitch || 0,
        roll: phoneOrientation?.roll || 0,
        yaw: phoneOrientation?.yaw || 0,
        pitchDeviation, // How far from -90°
        rollDeviation, // How far from 0°
        distance,
        validationState,
        headPose: null, // No face in Vertex
        captureConfidence: pitchDeviation < 5 && rollDeviation < 5 ? 95 : 75,
        stabilizationDuration: 1.0, // From useAdvancedCapture hook
        deviceModel: Platform.OS,
      };

      addPhoto({
        uri: photo.uri,
        angle: CaptureAngle.VERTEX,
        timestamp: metadata.timestamp,
        metadata,
      });

      reset();
      navigation.navigate('BackDonorCapture');
    } catch (error) {
      console.error('Vertex capture error:', error);
      await triggerHaptic('error');
    } finally {
      setIsCapturing(false);
    }
  };

  // Calculate pitch deviation percentage for UI
  const getPitchDeviationPercent = (): number => {
    if (!phoneOrientation) return 100;
    const deviation = Math.abs(phoneOrientation.pitch + 90);
    return Math.max(0, 100 - (deviation / 10) * 100);
  };

  // Calculate roll deviation percentage for UI
  const getRollDeviationPercent = (): number => {
    if (!phoneOrientation) return 100;
    const deviation = Math.abs(phoneOrientation.roll);
    return Math.max(0, 100 - (deviation / 5) * 100);
  };

  // Pitch validation (target: -90°, range: -85° to -95°)
  const isPitchValid = phoneOrientation
    ? phoneOrientation.pitch >= -95 && phoneOrientation.pitch <= -85
    : false;

  // Roll validation (target: 0°, tolerance: ±5°)
  const isRollValid = phoneOrientation ? Math.abs(phoneOrientation.roll) <= 5 : false;

  // Extreme pitch warning (too far from -90°)
  const showPitchWarning = phoneOrientation ? Math.abs(phoneOrientation.pitch + 90) > 15 : false;

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
        enableTorch={false}
        zoom={0}
      />

      {/* Dynamic Face Guide Overlay - for Vertex we show hair mass target */}
      <DynamicFaceGuide
        bounds={null} // No face bounds in Vertex
        validationState={validationState}
        isStable={isReadyToCapture}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tepe (Vertex) Çekimi</Text>
        <Text style={styles.subtitle}>
          Telefonu başınızın üstünden tutun - Kamera aşağı bakmalı
        </Text>
      </View>

      {/* Pitch & Roll Angle Panel */}
      {phoneOrientation && (
        <View style={styles.anglePanel}>
          <Text style={styles.panelTitle}>Telefon Açıları</Text>

          {/* Pitch (Vertical tilt) */}
          <AngleIndicator
            label="Pitch (Dikey)"
            value={phoneOrientation.pitch}
            isValid={isPitchValid}
            targetRange="-90° (±5°)"
            deviationPercent={getPitchDeviationPercent()}
          />

          {/* Roll (Horizontal tilt) */}
          <AngleIndicator
            label="Roll (Yatay)"
            value={phoneOrientation.roll}
            isValid={isRollValid}
            targetRange="0° (±5°)"
            deviationPercent={getRollDeviationPercent()}
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

      {/* Extreme Pitch Warning Overlay */}
      {showPitchWarning && (
        <View style={styles.extremeWarningOverlay}>
          <Text style={styles.warningTitle}>⚠️ TELEFON AÇISI YANLIŞ</Text>
          <Text style={styles.warningMessage}>
            {phoneOrientation && phoneOrientation.pitch > -85
              ? 'Telefonu YUKARI kaldırın - kamera aşağıya bakmalı'
              : 'Telefonu hafif AŞAĞI indirin'}
          </Text>
          <Text style={styles.warningDetail}>
            Mevcut: {phoneOrientation?.pitch.toFixed(0)}° | Hedef: -90° (±5°)
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
  },
});

export default VertexCaptureScreen;
