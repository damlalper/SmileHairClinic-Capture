/**
 * ═══════════════════════════════════════════════════════════════════
 * CAMERA SCREEN - UNIVERSAL TEMPLATE FOR ALL 5 CAPTURE ANGLES
 * ═══════════════════════════════════════════════════════════════════
 *
 * This screen is a generic template that adapts to any of the 5 capture angles:
 * - FRONT (face detection)
 * - RIGHT_45 (face detection)
 * - LEFT_45 (face detection)
 * - VERTEX (sensor only)
 * - BACK_DONOR (sensor only)
 *
 * It uses ANGLE_CONFIGS to determine:
 * - validation strategy (FACE_DETECTION vs SENSOR_ONLY)
 * - target angles (head pose & phone orientation)
 * - distance ranges
 * - UI elements to display
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { scanFaces, Face } from 'vision-camera-face-detector';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList, CapturedPhoto, CaptureAngle } from '../types';
import { COLORS, ANGLE_CONFIGS, CAPTURE_SEQUENCE } from '../constants/angles';
import { useSensorData } from '../hooks/useSensorData';
import DynamicFaceGuide from '../components/DynamicFaceGuide';
import { analyzeFace, FaceAnalysis } from '../utils/faceDetection';
import { DistanceEstimator } from '../utils/distanceEstimator';
import { validatePosition, getFeedbackColor } from '../utils/positionValidator';
import { AudioFeedback } from '../utils/audioFeedback';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type CameraScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Camera'>;
  route: RouteProp<RootStackParamList, 'Camera'>;
};

export default function CameraScreen({ navigation, route }: Readonly<CameraScreenProps>) {
  const { angle } = route.params;
  const config = ANGLE_CONFIGS[angle];
  const insets = useSafeAreaInsets();

  // ═══════════════════════════════════════════════════════════════════
  // CAMERA SETUP - Adapts based on angle
  // ═══════════════════════════════════════════════════════════════════
  const cameraRef = useRef<Camera>(null);

  // ✅ ALL angles use FRONT camera (selfie mode)
  // User will position phone above head (VERTEX) or behind head (BACK_DONOR)
  const device = useCameraDevice('front');

  const distanceEstimatorRef = useRef(new DistanceEstimator());
  const audioFeedbackRef = useRef(new AudioFeedback({ enableSound: true, enableHaptics: true }));
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);
  const [validationState, setValidationState] = useState<any>(null);
  const lastRadarSoundTime = useRef<number>(0);

  const [hasPermission, setHasPermission] = useState(false);
  const { sensorData, isAvailable } = useSensorData();

  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasPlayedBeep, setHasPlayedBeep] = useState(false);
  const [wrongDirectionWarned, setWrongDirectionWarned] = useState(false);

  // Animated values for feedback
  const accuracyAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Determine if this angle uses face detection
  const useFaceDetection = config.validationStrategy === 'FACE_DETECTION';

  // ═══════════════════════════════════════════════════════════════════
  // HAPTIC FEEDBACK HELPER - With fallback to vibration
  // ═══════════════════════════════════════════════════════════════════
  const triggerHaptic = useCallback(async (type: 'trigger' | 'success' | 'error' | 'warning') => {
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
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // NAVIGATION TO NEXT ANGLE
  // ═══════════════════════════════════════════════════════════════════
  const navigateToNextAngle = useCallback(() => {
    const currentIndex = CAPTURE_SEQUENCE.indexOf(angle);
    const nextIndex = currentIndex + 1;

    if (nextIndex < CAPTURE_SEQUENCE.length) {
      // Navigate to next angle
      const nextAngle = CAPTURE_SEQUENCE[nextIndex];
      navigation.replace('Camera', { angle: nextAngle });
    } else {
      // All angles captured, go to Review
      navigation.navigate('Review', {});
    }
  }, [angle, navigation]);

  // Request camera permission
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Validate position based on strategy
  let validation = validationState;
  if (!validation) {
    // Fallback validator
    if (useFaceDetection) {
      // For face detection angles, wait for face analysis
      validation = validatePosition(sensorData, config, 40, faceAnalysis || undefined);
    } else {
      // For sensor-only angles (VERTEX, BACK_DONOR), use sensor data only
      validation = validatePosition(sensorData, config, 40);
    }
  }

  // Process detected faces from frame processor
  const processFaces = async (faces: Face[]) => {
    if (!useFaceDetection || !faces || faces.length === 0) {
      setFaceAnalysis(null);
      const v = validatePosition(sensorData, config, 40);
      setValidationState(v);
      return;
    }

    try {
      const face = faces[0];
      const analysis = await analyzeFace(face);
      setFaceAnalysis(analysis);

      const faceMetrics = {
        faceWidth: analysis.facePosition.width,
        faceHeight: analysis.facePosition.height,
        leftEyeX: analysis.landmarks.leftEye.x,
        rightEyeX: analysis.landmarks.rightEye.x,
        noseTipY: analysis.landmarks.noseBase.y,
        chinTipY: analysis.landmarks.bottomMouth.y,
      } as any;

      const distanceResult = distanceEstimatorRef.current.estimateDistance(faceMetrics);
      const v = validatePosition(sensorData, config, distanceResult.estimatedDistance, analysis);
      const merged = { ...v, faceAnalysis: analysis, distanceResult };
      setValidationState(merged);
    } catch (error) {
      console.warn('Face handling error:', error);
    }
  };

  // Frame processor for real-time face detection
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (useFaceDetection) {
      const faces = scanFaces(frame);
      runOnJS(processFaces)(faces);
    }
  }, [useFaceDetection]);

  // Play beep sound when position becomes valid
  const playBeepSound = async () => {
    try {
      // Play haptic feedback only (audio removed)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasPlayedBeep(true);
    } catch (error) {
      console.log('Haptic feedback error:', error);
      setHasPlayedBeep(true);
    }
  };

  // Audio feedback handled by `src/utils/audioFeedback.ts` (separate system)

  // ✅ RADAR SOUND: For ALL angles (continuous audio guidance)
  // Brief requirement: "Kullanıcı ekrana bakmasada doğru açıya ne kadar yaklaştığını hissedebilmeli"
  useEffect(() => {
    if (!validationState) return;

    // Determine deviation for radar sound
    let deviation = 0;

    if (useFaceDetection) {
      // For FACE_DETECTION angles (FRONT, RIGHT_45, LEFT_45)
      // Use face yaw deviation as primary metric
      if (faceAnalysis && config.faceRequirements) {
        const targetYaw = (config.faceRequirements.yawRange[0] + config.faceRequirements.yawRange[1]) / 2;
        deviation = Math.abs(faceAnalysis.faceAngles.yaw.angle - targetYaw);
      }
    } else {
      // For SENSOR_ONLY angles (VERTEX, BACK_DONOR)
      // Use pitch deviation
      const targetPitch = config.phoneAngle.pitch;
      deviation = Math.abs(sensorData.pitch - targetPitch);
    }

    // Play radar sound based on accuracy
    const now = Date.now();
    const accuracy = validationState.angleAccuracy;

    // Interval: 800ms when far (low accuracy), 200ms when close (high accuracy)
    const interval = 800 - (accuracy / 100) * 600;

    if (now - lastRadarSoundTime.current > interval) {
      audioFeedbackRef.current.playRadarSound(deviation);
      lastRadarSoundTime.current = now;
    }
  }, [sensorData, faceAnalysis, config, useFaceDetection, validationState]);

  // Animate accuracy indicator
  useEffect(() => {
    Animated.timing(accuracyAnimation, {
      toValue: validation.angleAccuracy,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [validation.angleAccuracy]);

  // Pulse animation when position is valid
  useEffect(() => {
    if (validation.isValid && !isCapturing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [validation.isValid, isCapturing]);

  // Auto-capture when position is valid
  useEffect(() => {
    let countdownTimer: NodeJS.Timeout;

    if (validation.isValid && !isCapturing && countdown === null && !hasPlayedBeep) {
      // Play beep sound first, then start countdown after 500ms
      playBeepSound();
      setTimeout(() => {
        setCountdown(3);
      }, 500);
    } else if (!validation.isValid && countdown !== null) {
      // Reset countdown and beep flag if position becomes invalid
      setCountdown(null);
      setHasPlayedBeep(false);
    }

    if (countdown !== null && countdown > 0) {
      // ✅ Play countdown sound (3, 2, 1)
      audioFeedbackRef.current.playCountdownSound(countdown);

      countdownTimer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      capturePhoto();
    }

    return () => {
      if (countdownTimer) clearTimeout(countdownTimer);
    };
  }, [validation.isValid, countdown, isCapturing, hasPlayedBeep]);

  // ═══════════════════════════════════════════════════════════════════
  // DISTANCE ESTIMATION - Adapts based on angle and available data
  // ═══════════════════════════════════════════════════════════════════
  const estimateDistance = useCallback((): number => {
    if (useFaceDetection && faceAnalysis) {
      // For face detection angles: use face bounding box
      const faceMetrics = {
        faceWidth: faceAnalysis.facePosition.width,
        faceHeight: faceAnalysis.facePosition.height,
        leftEyeX: faceAnalysis.landmarks.leftEye.x,
        rightEyeX: faceAnalysis.landmarks.rightEye.x,
        noseTipY: faceAnalysis.landmarks.noseBase.y,
        chinTipY: faceAnalysis.landmarks.bottomMouth.y,
      } as any;

      const distanceResult = distanceEstimatorRef.current.estimateDistance(faceMetrics);
      return distanceResult.estimatedDistance;
    } else {
      // For sensor-only angles (VERTEX, BACK_DONOR): sensor-based heuristic
      if (!sensorData) return 50; // Default 50cm

      const targetPitch = config.phoneAngle.pitch;
      const pitchDeviation = Math.abs(sensorData.pitch - targetPitch);

      // If pitch is close to target, assume user has good control = proper distance
      if (pitchDeviation < 3) return 35; // Good distance ~35cm
      if (pitchDeviation < 7) return 40; // Acceptable
      return 50; // Too uncertain
    }
  }, [useFaceDetection, faceAnalysis, sensorData, config]);

  // ═══════════════════════════════════════════════════════════════════
  // CAPTURE PHOTO - Universal for all angles
  // ═══════════════════════════════════════════════════════════════════
  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      await triggerHaptic('success');

      // ✅ Play capture sound
      await audioFeedbackRef.current.playCaptureSound();

      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      });

      const distance = estimateDistance();
      const pitchDeviation = Math.abs(sensorData.pitch - config.phoneAngle.pitch);
      const rollDeviation = Math.abs(sensorData.roll - config.phoneAngle.roll);

      // Calculate capture confidence
      const captureConfidence = pitchDeviation < 5 && rollDeviation < 5 ? 95 : 75;

      const capturedPhoto: CapturedPhoto = {
        angle,
        uri: `file://${photo.path}`,
        timestamp: Date.now(),
        metadata: {
          pitch: sensorData.pitch,
          roll: sensorData.roll,
          distance,
          yaw: sensorData.yaw,
          pitchDeviation,
          rollDeviation,
          captureConfidence,
          validationState,
          headPose: faceAnalysis ? {
            pitch: faceAnalysis.faceAngles.pitch.angle,
            roll: faceAnalysis.faceAngles.roll.angle,
            yaw: faceAnalysis.faceAngles.yaw.angle,
          } : undefined,
        },
      };

      // ✅ Navigate to PhotoPreview instead of directly to next angle
      navigation.navigate('PhotoPreview', { photo: capturedPhoto });
    } catch (error) {
      console.error('Capture error:', error);
      await triggerHaptic('error');
      setIsCapturing(false);
      setCountdown(null);
      setHasPlayedBeep(false);
    }
  };

  if (!device) {
    return (
      <View style={styles.container}>
        <Text>Kamera cihazı yükleniyor...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Fotoğraf çekebilmek için kamera iznine ihtiyacımız var
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.permissionButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const accuracyColor = getFeedbackColor(validation.angleAccuracy);

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        ref={cameraRef}
        photo={true}
        frameProcessor={useFaceDetection ? frameProcessor : undefined}
      />
      {/* Overlay Guide - Outside CameraView for compatibility */}
      <View style={styles.overlay}>
          {/* Top Section - Instructions */}
          <View style={styles.topSection}>
            <View style={styles.instructionBox}>
              <Text style={styles.angleTitle}>{config.title}</Text>
              <Text style={styles.targetText}>{config.targetArea}</Text>
            </View>
          </View>

          {/* ✅ WRONG DIRECTION WARNING - For FRONT angle */}
          {angle === CaptureAngle.FRONT && faceAnalysis &&
           Math.abs(faceAnalysis.faceAngles.yaw.angle) > 10 && (
            <View style={styles.wrongDirectionWarning}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>YANLIŞ YÖN!</Text>
              <Text style={styles.warningText}>
                Kameraya tam karşı bakın
              </Text>
              <Text style={styles.warningDetail}>
                Yaw: {faceAnalysis.faceAngles.yaw.angle.toFixed(0)}° (Hedef: 0°)
              </Text>
            </View>
          )}

          {/* ✅ WRONG DIRECTION WARNING - For RIGHT_45 angle (IMPROVED) */}
          {angle === CaptureAngle.RIGHT_45 && faceAnalysis && (
            <>
              {/* Case 1: Turned LEFT instead of RIGHT (critical error) */}
              {faceAnalysis.faceAngles.yaw.angle < 0 && (
                <View style={[styles.wrongDirectionWarning, styles.criticalWarning]}>
                  <Text style={styles.warningIcon}>🔴</Text>
                  <Text style={styles.warningTitle}>KRİTİK HATA!</Text>
                  <Text style={styles.warningText}>
                    SOLA değil SAĞA çevirin!
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {faceAnalysis.faceAngles.yaw.angle.toFixed(0)}° (Sol) | Hedef: 40° - 50° (Sağ)
                  </Text>
                </View>
              )}

              {/* Case 2: Not turned enough (0-10 degrees) */}
              {faceAnalysis.faceAngles.yaw.angle >= 0 && faceAnalysis.faceAngles.yaw.angle < 10 && (
                <View style={styles.wrongDirectionWarning}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>YETERSIZ DÖNÜŞ</Text>
                  <Text style={styles.warningText}>
                    Başınızı DAHA FAZLA SAĞA çevirin
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {faceAnalysis.faceAngles.yaw.angle.toFixed(0)}° | Hedef: 40° - 50°
                  </Text>
                </View>
              )}

              {/* Case 3: Getting close but not enough (10-40 degrees) */}
              {faceAnalysis.faceAngles.yaw.angle >= 10 && faceAnalysis.faceAngles.yaw.angle < 40 && (
                <View style={[styles.wrongDirectionWarning, { backgroundColor: 'rgba(255, 152, 0, 0.95)' }]}>
                  <Text style={styles.warningIcon}>📍</Text>
                  <Text style={styles.warningTitle}>NEREDEYSE TAMAM</Text>
                  <Text style={styles.warningText}>
                    Biraz daha sağa çevirin
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {faceAnalysis.faceAngles.yaw.angle.toFixed(0)}° | Hedef: 40° - 50°
                  </Text>
                </View>
              )}

              {/* Case 4: Turned too much (> 50 degrees) */}
              {faceAnalysis.faceAngles.yaw.angle > 50 && (
                <View style={styles.wrongDirectionWarning}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>ÇOK FAZLA DÖNDÜ</Text>
                  <Text style={styles.warningText}>
                    Başınızı biraz geri alın (daha az sağa)
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {faceAnalysis.faceAngles.yaw.angle.toFixed(0)}° | Hedef: 40° - 50°
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ✅ WRONG DIRECTION WARNING - For LEFT_45 angle (IMPROVED) */}
          {angle === CaptureAngle.LEFT_45 && faceAnalysis && (
            <>
              {/* Case 1: Turned RIGHT instead of LEFT (critical error) */}
              {faceAnalysis.faceAngles.yaw.angle > 0 && (
                <View style={[styles.wrongDirectionWarning, styles.criticalWarning]}>
                  <Text style={styles.warningIcon}>🔴</Text>
                  <Text style={styles.warningTitle}>KRİTİK HATA!</Text>
                  <Text style={styles.warningText}>
                    SAĞA değil SOLA çevirin!
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {faceAnalysis.faceAngles.yaw.angle.toFixed(0)}° (Sağ) | Hedef: -40° - -50° (Sol)
                  </Text>
                </View>
              )}

              {/* Case 2: Not turned enough (0 to -10 degrees) */}
              {faceAnalysis.faceAngles.yaw.angle <= 0 && faceAnalysis.faceAngles.yaw.angle > -10 && (
                <View style={styles.wrongDirectionWarning}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>YETERSIZ DÖNÜŞ</Text>
                  <Text style={styles.warningText}>
                    Başınızı DAHA FAZLA SOLA çevirin
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {faceAnalysis.faceAngles.yaw.angle.toFixed(0)}° | Hedef: -40° - -50°
                  </Text>
                </View>
              )}

              {/* Case 3: Getting close but not enough (-10 to -40 degrees) */}
              {faceAnalysis.faceAngles.yaw.angle <= -10 && faceAnalysis.faceAngles.yaw.angle > -40 && (
                <View style={[styles.wrongDirectionWarning, { backgroundColor: 'rgba(255, 152, 0, 0.95)' }]}>
                  <Text style={styles.warningIcon}>📍</Text>
                  <Text style={styles.warningTitle}>NEREDEYSE TAMAM</Text>
                  <Text style={styles.warningText}>
                    Biraz daha sola çevirin
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {faceAnalysis.faceAngles.yaw.angle.toFixed(0)}° | Hedef: -40° - -50°
                  </Text>
                </View>
              )}

              {/* Case 4: Turned too much (< -50 degrees) */}
              {faceAnalysis.faceAngles.yaw.angle < -50 && (
                <View style={styles.wrongDirectionWarning}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>ÇOK FAZLA DÖNDÜ</Text>
                  <Text style={styles.warningText}>
                    Başınızı biraz geri alın (daha az sola)
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {faceAnalysis.faceAngles.yaw.angle.toFixed(0)}° | Hedef: -40° - -50°
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ✅ WRONG DIRECTION WARNING - For VERTEX angle (PITCH-BASED) */}
          {angle === CaptureAngle.VERTEX && (
            <>
              {/* Case 1: Telefon düz tutuluyor (pitch çok az) - CRITICAL */}
              {sensorData.pitch > -45 && (
                <View style={[styles.wrongDirectionWarning, styles.criticalWarning]}>
                  <Text style={styles.warningIcon}>🔴</Text>
                  <Text style={styles.warningTitle}>KRİTİK HATA!</Text>
                  <Text style={styles.warningText}>
                    Telefonu başınızın ÜZERİNE kaldırın!
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {sensorData.pitch.toFixed(0)}° | Hedef: -85° ~ -95° (Dik)
                  </Text>
                </View>
              )}

              {/* Case 2: Yeterince dik değil (-45 to -70°) */}
              {sensorData.pitch <= -45 && sensorData.pitch > -70 && (
                <View style={styles.wrongDirectionWarning}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>TELEFONU DAHA DİK TUTUN</Text>
                  <Text style={styles.warningText}>
                    Telefonu başınızın üzerine kaldırın
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {sensorData.pitch.toFixed(0)}° | Hedef: -85° ~ -95°
                  </Text>
                </View>
              )}

              {/* Case 3: Yaklaşıyor (-70 to -85°) */}
              {sensorData.pitch <= -70 && sensorData.pitch > -85 && (
                <View style={[styles.wrongDirectionWarning, { backgroundColor: 'rgba(255, 152, 0, 0.95)' }]}>
                  <Text style={styles.warningIcon}>📍</Text>
                  <Text style={styles.warningTitle}>NEREDEYSE TAMAM</Text>
                  <Text style={styles.warningText}>
                    Biraz daha dik tutun
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {sensorData.pitch.toFixed(0)}° | Hedef: -85° ~ -95°
                  </Text>
                </View>
              )}

              {/* Case 4: Çok fazla geriye yatmış (< -95°) */}
              {sensorData.pitch < -95 && (
                <View style={styles.wrongDirectionWarning}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>ÇOK FAZLA GERİYE EĞİK</Text>
                  <Text style={styles.warningText}>
                    Telefonu biraz öne getirin
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {sensorData.pitch.toFixed(0)}° | Hedef: -85° ~ -95°
                  </Text>
                </View>
              )}

              {/* Roll Warning - Telefon yana eğik */}
              {Math.abs(sensorData.roll) > 10 && (
                <View style={styles.wrongDirectionWarning}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>TELEFON YANA EĞİK</Text>
                  <Text style={styles.warningText}>
                    {sensorData.roll > 0 ? 'Telefonu sola düzeltin ←' : 'Telefonu sağa düzeltin →'}
                  </Text>
                  <Text style={styles.warningDetail}>
                    Roll: {sensorData.roll.toFixed(0)}° | Hedef: 0° (Düz)
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ✅ WRONG DIRECTION WARNING - For BACK_DONOR angle (PITCH-BASED) */}
          {angle === CaptureAngle.BACK_DONOR && (
            <>
              {/* Case 1: Telefon düz tutuluyor (pitch çok az veya negatif) - CRITICAL */}
              {sensorData.pitch < 40 && (
                <View style={[styles.wrongDirectionWarning, styles.criticalWarning]}>
                  <Text style={styles.warningIcon}>🔴</Text>
                  <Text style={styles.warningTitle}>KRİTİK HATA!</Text>
                  <Text style={styles.warningText}>
                    Telefonu başınızın ARKASINA götürün!
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {sensorData.pitch.toFixed(0)}° | Hedef: 70° ~ 100° (Hafif Dik)
                  </Text>
                </View>
              )}

              {/* Case 2: Yeterince arkada değil (40 to 60°) */}
              {sensorData.pitch >= 40 && sensorData.pitch < 60 && (
                <View style={styles.wrongDirectionWarning}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>TELEFONU DAHA ARKAYA GÖTÜRüN</Text>
                  <Text style={styles.warningText}>
                    Telefonu başınızın arkasına konumlandırın
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {sensorData.pitch.toFixed(0)}° | Hedef: 70° ~ 100°
                  </Text>
                </View>
              )}

              {/* Case 3: Yaklaşıyor (60 to 70°) */}
              {sensorData.pitch >= 60 && sensorData.pitch < 70 && (
                <View style={[styles.wrongDirectionWarning, { backgroundColor: 'rgba(255, 152, 0, 0.95)' }]}>
                  <Text style={styles.warningIcon}>📍</Text>
                  <Text style={styles.warningTitle}>NEREDEYSE TAMAM</Text>
                  <Text style={styles.warningText}>
                    Biraz daha arkaya götürün
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {sensorData.pitch.toFixed(0)}° | Hedef: 70° ~ 100°
                  </Text>
                </View>
              )}

              {/* Case 4: Çok fazla dik (> 100°) */}
              {sensorData.pitch > 100 && (
                <View style={styles.wrongDirectionWarning}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>ÇOK FAZLA DİK</Text>
                  <Text style={styles.warningText}>
                    Telefonu biraz öne eğin
                  </Text>
                  <Text style={styles.warningDetail}>
                    Mevcut: {sensorData.pitch.toFixed(0)}° | Hedef: 70° ~ 100°
                  </Text>
                </View>
              )}

              {/* Roll Warning - Telefon yana eğik */}
              {Math.abs(sensorData.roll) > 10 && (
                <View style={styles.wrongDirectionWarning}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningTitle}>TELEFON YANA EĞİK</Text>
                  <Text style={styles.warningText}>
                    {sensorData.roll > 0 ? 'Telefonu sola düzeltin ←' : 'Telefonu sağa düzeltin →'}
                  </Text>
                  <Text style={styles.warningDetail}>
                    Roll: {sensorData.roll.toFixed(0)}° | Hedef: 0° (Düz)
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Center Section - Visual Guide */}
          <View style={styles.centerSection}>
            <DynamicFaceGuide
              width={SCREEN_WIDTH * 0.7}
              height={SCREEN_WIDTH * 0.9}
              pitch={sensorData.pitch}
              roll={sensorData.roll}
              yaw={sensorData.yaw}
              accuracy={validation.angleAccuracy}
              isValid={validation.isValid}
              countdown={countdown}
              angle={angle} // ✅ Pass angle to show silhouette hint
            />
          </View>

          {/* Bottom Section - Feedback */}
          <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
            {/* Accuracy Meter */}
            <View style={styles.accuracyContainer}>
              <Text style={styles.accuracyLabel}>Doğruluk</Text>
              <View style={styles.accuracyBar}>
                <Animated.View
                  style={[
                    styles.accuracyFill,
                    {
                      width: accuracyAnimation.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: accuracyColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.accuracyPercent}>
                {validation.angleAccuracy}%
              </Text>
            </View>

            {/* Feedback Message */}
            <View style={styles.feedbackBox}>
              <Text
                style={[
                  styles.feedbackText,
                  { color: validation.isValid ? COLORS.success : COLORS.warning },
                ]}
              >
                {validation.feedback}
              </Text>
            </View>

            {/* Sensor Status */}
            {!isAvailable && (
              <Text style={styles.warningText}>
                ⚠️ Sensör verisi kullanılamıyor
              </Text>
            )}

            {/* Debug Info (remove in production) */}
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>
                Pitch: {sensorData.pitch.toFixed(1)}° (Hedef: {config.phoneAngle.pitch}°)
              </Text>
              <Text style={styles.debugText}>
                Roll: {sensorData.roll.toFixed(1)}° (Hedef: {config.phoneAngle.roll}°)
              </Text>
              <Text style={styles.debugText}>
                Pitch Fark: {Math.abs(sensorData.pitch - config.phoneAngle.pitch).toFixed(1)}°
              </Text>
              <Text style={styles.debugText}>
                Roll Fark: {Math.abs(sensorData.roll - config.phoneAngle.roll).toFixed(1)}°
              </Text>
              {faceAnalysis && (
                <Text style={styles.debugText}>Alignment: {faceAnalysis.alignmentScore}</Text>
              )}
            </View>

            {/* Manual Skip Button (for testing) */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={capturePhoto}
            >
              <Text style={styles.skipButtonText}>Manuel Çekim / Geç</Text>
            </TouchableOpacity>
          </View>
        </View>
      {/* Close Button */}
      <View style={styles.closeButtonContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  instructionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
  },
  angleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  targetText: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.9,
    borderWidth: 3,
    borderRadius: 120,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFF',
    borderWidth: 3,
    top: -3,
    left: -3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  guideCornerTopRight: {
    left: undefined,
    right: -3,
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  guideCornerBottomLeft: {
    top: undefined,
    bottom: -3,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  guideCornerBottomRight: {
    top: undefined,
    bottom: -3,
    left: undefined,
    right: -3,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  countdownContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bottomSection: {
    padding: 16,
    // paddingBottom set dynamically using insets
  },
  accuracyContainer: {
    marginBottom: 16,
  },
  accuracyLabel: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 8,
    fontWeight: '600',
  },
  accuracyBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  accuracyFill: {
    height: '100%',
  },
  accuracyPercent: {
    fontSize: 12,
    color: '#FFF',
    textAlign: 'right',
  },
  feedbackBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    color: COLORS.warning,
    textAlign: 'center',
    marginTop: 8,
  },
  debugContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  debugText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'left',
    marginVertical: 2,
    fontFamily: 'monospace',
  },
  // ✅ WRONG DIRECTION WARNING STYLES
  wrongDirectionWarning: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
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
    zIndex: 100,
  },
  // ✅ CRITICAL WARNING (for opposite direction)
  criticalWarning: {
    backgroundColor: 'rgba(139, 0, 0, 0.98)', // Dark red for critical
    borderColor: '#FF0000',
    borderWidth: 4,
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
  warningDetail: {
    color: '#FFE082',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  skipButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16, // Extra space for Android navigation bar
    alignSelf: 'center',
  },
  skipButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  closeButton: {
    width: 44,
    height: 44,
    margin: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
