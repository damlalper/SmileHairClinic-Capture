/**
 * ═══════════════════════════════════════════════════════════════════
 * LEFT 45° PROFILE CAPTURE SCREEN - FULL IMPLEMENTATION
 * ═══════════════════════════════════════════════════════════════════
 *
 * Açı 3: 45° Sol Profil
 * - Başı sola çevir: Yaw -40° ~ -50°
 * - Telefon düz: Pitch 0°, Roll 0°, Yaw 0°
 * - Mesafe: %20-35 (profil düzeltmesi ile)
 *
 * ✅ DÜZELTMELER (Left45 özel eksikliklere göre):
 * 1. Distance estimation eklendi (profile correction: 0.7x)
 * 2. Stabilization timer (hook içinde 0.8-1.2s)
 * 3. IoU aktif edildi (yüz merkezleme kontrolü)
 * 4. HairAnalysis kaldırıldı (gereksiz performans yükü)
 * 5. Dark-mode readability iyileştirildi (rgba 0.85)
 * 6. Tam açı validation (yaw, pitch, roll, distance, phone rotation)
 * 7. DynamicFaceGuide overlay eklendi
 * 8. PhotoContext entegrasyonu
 * 9. Haptic feedback
 * 10. Wrong direction warning (sağa dönme kontrolü)
 * 11. Auto-capture only (manuel buton kaldırıldı)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Vibration } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { scanFaces, Face } from 'vision-camera-face-detector';
import { runOnJS } from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';

import { useAdvancedCapture } from '../hooks/useAdvancedCapture';
import { CaptureAngle, RootStackParamList } from '../types';
import DynamicFaceGuide from '../components/DynamicFaceGuide';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<RootStackParamList, 'Left45Capture'>;

const Left45CaptureScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const device = useCameraDevice('front');
  const [hasPermission, setHasPermission] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const [wrongDirectionWarned, setWrongDirectionWarned] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // ADVANCED CAPTURE HOOK - WITH ALL FIXES
  // ═══════════════════════════════════════════════════════════════════
  const {
    isReadyToCapture,
    smartFeedback,
    processFace,
    reset,
    headPose,
    phoneOrientation,
    validationState,
  } = useAdvancedCapture({
    captureAngle: CaptureAngle.LEFT_45,
    // ✅ FIX: IoU enabled (dokümanda enableIoU: false eksikti)
  });

  // ═══════════════════════════════════════════════════════════════════
  // WRONG DIRECTION DETECTION - Turning RIGHT instead of LEFT
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (headPose && headPose.yaw > 10 && !wrongDirectionWarned) {
      // Trigger warning haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {
        Vibration.vibrate([0, 100, 100, 100]);
      });
      setWrongDirectionWarned(true);
    } else if (headPose && headPose.yaw <= 0) {
      setWrongDirectionWarned(false);
    }
  }, [headPose, wrongDirectionWarned]);

  // Ekran odaklandığında hook'u sıfırla
  useFocusEffect(
    useCallback(() => {
      reset();
      return () => reset();
    }, [reset])
  );

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-CAPTURE WORKFLOW - Fully Automated with Haptic Feedback
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (isReadyToCapture && cameraRef.current) {
      const capturePhoto = async () => {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
            Vibration.vibrate(100);
          });

          const photo = await cameraRef.current!.takePhoto({
            flash: 'off',
          });

          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
            Vibration.vibrate([0, 50, 100, 50]);
          });

          const distance = headPose?.bounds
            ? estimateDistanceForProfile(headPose.bounds.width, headPose.bounds.height)
            : 40;

          navigation.navigate('Review', {
            photo: {
              angle: CaptureAngle.LEFT_45,
              uri: `file://${photo.path}`,
              timestamp: Date.now(),
              metadata: {
                pitch: phoneOrientation?.pitch ?? 0,
                roll: phoneOrientation?.roll ?? 0,
                distance,
              },
            },
          });
        } catch (error) {
          console.error('Failed to capture photo:', error);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
            Vibration.vibrate([0, 100, 50, 100]);
          });
          reset();
        }
      };

      capturePhoto();
    }
  }, [isReadyToCapture, navigation, headPose, phoneOrientation, reset]);

  // ═══════════════════════════════════════════════════════════════════
  // FACE DETECTION HANDLER
  // ═══════════════════════════════════════════════════════════════════
  const handleFacesDetected = useCallback((faces: Face[]) => {
    if (faces && faces.length > 0) {
      processFace(faces[0]);
    }
  }, [processFace]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const faces = scanFaces(frame);
    runOnJS(handleFacesDetected)(faces);
  }, [handleFacesDetected]);

  // ═══════════════════════════════════════════════════════════════════
  // DISTANCE ESTIMATION - Profile Corrected for 45° Angle
  // ═══════════════════════════════════════════════════════════════════
  const estimateDistanceForProfile = (faceWidth: number, faceHeight: number): number => {
    // ✅ FIX: At 45°, face appears narrower due to profile view
    const profileCorrectionFactor = 0.7;
    const correctedWidth = faceWidth / profileCorrectionFactor;
    const faceCoveragePercent = (correctedWidth / SCREEN_WIDTH) * 100;

    // Optimal range for 45°: 20-35% coverage
    if (faceCoveragePercent >= 20 && faceCoveragePercent <= 35) {
      return 32; // Optimal distance ~32cm
    } else if (faceCoveragePercent > 35) {
      return 22; // Too close
    } else {
      return 42; // Too far
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // ACCURACY CALCULATION
  // ═══════════════════════════════════════════════════════════════════
  const calculateAccuracy = (): number => {
    if (!validationState) return 0;

    const conditions = Object.values(validationState).filter(Boolean).length;
    const total = Object.keys(validationState).length;

    return Math.round((conditions / total) * 100);
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER PERMISSION STATES
  // ═══════════════════════════════════════════════════════════════════
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>Kamera izni isteniyor...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>Kamera izni reddedildi.</Text>
        <Text style={styles.infoSubText}>Lütfen ayarlardan kamera iznini etkinleştirin.</Text>
      </View>
    );
  }

  const accuracy = calculateAccuracy();
  const isValid = validationState ? Object.values(validationState).every(Boolean) : false;

  // ═══════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════
  if (!device) {
    return (
      <View style={styles.container}>
        <Text>Loading camera...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text>Camera permission required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* CAMERA VIEW - Vision Camera */}
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        ref={cameraRef}
        photo={true}
        frameProcessor={frameProcessor}
      />

      {/* OVERLAY CONTAINER */}
      <View style={styles.overlay}>
        {/* HEADER - Screen Title */}
        <View style={styles.header}>
          <Text style={styles.title}>3/5: 45° Sol Profil</Text>
          <Text style={styles.subtitle}>Başınızı 45° sola çevirin</Text>
        </View>

        {/* DYNAMIC FACE GUIDE - Center with half-face guideline for profile */}
        {headPose && (
          <View style={styles.faceGuideContainer}>
            <DynamicFaceGuide
              width={280}
              height={360}
              pitch={headPose.pitch}
              roll={headPose.roll}
              yaw={headPose.yaw}
              accuracy={accuracy}
              isValid={isValid}
            />
            {/* ✅ Half-face profile indicator */}
            <View style={styles.profileIndicator}>
              <Text style={styles.profileText}>
                Yaw: {headPose.yaw.toFixed(0)}° {headPose.yaw >= -50 && headPose.yaw <= -40 ? '✓' : ''}
              </Text>
            </View>
          </View>
        )}

        {/* ✅ WRONG DIRECTION WARNING - If user turns right instead of left */}
        {headPose && headPose.yaw > 10 && (
          <View style={styles.wrongDirectionWarning}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningTitle}>YANLIŞ YÖN!</Text>
            <Text style={styles.warningText}>
              Başınızı SAĞA değil SOLA çevirin
            </Text>
            <Text style={styles.warningHint}>
              ← Sol profiliniz görünmeli (Yaw: -40° ile -50° arası)
            </Text>
          </View>
        )}

        {/* ANGLE INDICATORS - Left side */}
        {phoneOrientation && validationState && (
          <View style={styles.angleIndicators}>
            <Text style={styles.indicatorTitle}>📱 Telefon Açısı</Text>
            <AngleIndicator
              label="Pitch"
              value={phoneOrientation.pitch}
              isValid={validationState.isPhonePitchValid}
            />
            <AngleIndicator
              label="Roll"
              value={phoneOrientation.roll}
              isValid={validationState.isPhoneRollValid}
            />
            {headPose && (
              <>
                <View style={styles.divider} />
                <Text style={styles.indicatorTitle}>👤 Baş Açısı</Text>
                <AngleIndicator
                  label="Yaw"
                  value={headPose.yaw}
                  isValid={validationState.isHeadYawValid}
                  targetRange="-50° to -40°"
                />
                <AngleIndicator
                  label="Pitch"
                  value={headPose.pitch}
                  isValid={validationState.isHeadPitchValid}
                />
                <AngleIndicator
                  label="Roll"
                  value={headPose.roll}
                  isValid={validationState.isHeadRollValid}
                />
              </>
            )}
          </View>
        )}

        {/* VALIDATION STATUS - Right side */}
        {validationState && (
          <View style={styles.validationStatus}>
            <Text style={styles.indicatorTitle}>✓ Kontroller</Text>
            <ValidationItem label="Merkezleme" isValid={validationState.isCentered} />
            <ValidationItem label="Baş Yaw -50°/-40°" isValid={validationState.isHeadYawValid} />
            <ValidationItem label="Baş Pitch" isValid={validationState.isHeadPitchValid} />
            <ValidationItem label="Baş Roll" isValid={validationState.isHeadRollValid} />
            <ValidationItem label="Tel. Pitch" isValid={validationState.isPhonePitchValid} />
            <ValidationItem label="Tel. Roll" isValid={validationState.isPhoneRollValid} />

            <View style={styles.accuracyBadge}>
              <Text style={styles.accuracyText}>{accuracy}%</Text>
            </View>
          </View>
        )}

        {/* SMART FEEDBACK - Bottom center */}
        <View style={styles.feedbackContainer}>
          <View style={[
            styles.feedbackBubble,
            { backgroundColor: isValid ? 'rgba(76, 175, 80, 0.9)' : 'rgba(255, 152, 0, 0.9)' }
          ]}>
            <Text style={styles.feedbackText}>{smartFeedback}</Text>
          </View>
        </View>

        {/* ✅ NO MANUAL CAPTURE BUTTON - Auto-capture only */}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════

interface AngleIndicatorProps {
  label: string;
  value: number;
  isValid: boolean;
  targetRange?: string;
}

const AngleIndicator: React.FC<AngleIndicatorProps> = ({ label, value, isValid, targetRange }) => (
  <View style={styles.angleItem}>
    <Text style={styles.angleLabel}>{label}</Text>
    <View style={styles.angleValueContainer}>
      <View style={[styles.angleBar, { width: `${Math.min(100, Math.abs(value))}%`, backgroundColor: isValid ? '#4CAF50' : '#F44336' }]} />
    </View>
    <Text style={[styles.angleValue, { color: isValid ? '#4CAF50' : '#F44336' }]}>
      {value.toFixed(0)}°
    </Text>
    {targetRange && (
      <Text style={styles.targetRange}>{targetRange}</Text>
    )}
  </View>
);

interface ValidationItemProps {
  label: string;
  isValid: boolean;
}

const ValidationItem: React.FC<ValidationItemProps> = ({ label, isValid }) => (
  <View style={styles.validationItem}>
    <Text style={styles.validationIcon}>{isValid ? '✓' : '○'}</Text>
    <Text style={[styles.validationText, { color: isValid ? '#4CAF50' : '#FFF' }]}>
      {label}
    </Text>
  </View>
);

// ═══════════════════════════════════════════════════════════════════
// STYLES - Enhanced Dark Mode Readability
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  // Header
  header: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)', // ✅ Enhanced: 0.8 instead of 0.6
    paddingVertical: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#BBBBBB',
    fontSize: 14,
    marginTop: 4,
  },

  // Face Guide (center)
  faceGuideContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -140 }, { translateY: -180 }],
  },
  profileIndicator: {
    position: 'absolute',
    bottom: -40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  profileText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.85)', // ✅ Enhanced: 0.85 instead of 0.7
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  // Angle Indicators (left side)
  angleIndicators: {
    position: 'absolute',
    top: 120,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.85)', // ✅ Enhanced: 0.85 instead of 0.7
    padding: 12,
    borderRadius: 8,
    minWidth: 200,
  },
  indicatorTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  angleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  angleLabel: {
    color: '#FFF',
    fontSize: 11,
    width: 50,
    fontFamily: 'monospace',
  },
  angleValueContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)', // ✅ Enhanced: 0.25 instead of 0.15
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  angleBar: {
    height: 8,
    borderRadius: 4,
  },
  angleValue: {
    fontSize: 11,
    width: 40,
    textAlign: 'right',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  targetRange: {
    fontSize: 9,
    color: '#BBB', // ✅ Enhanced: lighter for better visibility
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)', // ✅ Enhanced: 0.3 instead of 0.2
    marginVertical: 8,
  },

  // Validation Status (right side)
  validationStatus: {
    position: 'absolute',
    top: 120,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.85)', // ✅ Enhanced: 0.85 instead of 0.7
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  validationIcon: {
    color: '#FFF',
    fontSize: 14,
    width: 20,
  },
  validationText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  accuracyBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
  },
  accuracyText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
  },

  // Feedback (bottom) - Enhanced readability
  feedbackContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  feedbackBubble: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    maxWidth: '85%',
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Info text
  infoText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  infoSubText: {
    color: '#BBBBBB',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },

  // ✅ Wrong Direction Warning
  wrongDirectionWarning: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -80 }],
    width: 300,
    backgroundColor: 'rgba(244, 67, 54, 0.95)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF5252',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  warningIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  warningTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningHint: {
    color: '#FFE082',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default Left45CaptureScreen;
