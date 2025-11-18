import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { scanFaces, Face } from 'vision-camera-face-detector';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, CapturedPhoto } from '../types';
import { COLORS, ANGLE_CONFIGS } from '../constants/angles';
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
  const cameraRef = useRef<Camera>(null);
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

  // Animated values for feedback
  const accuracyAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Determine if this angle uses face detection
  const useFaceDetection = config.validationStrategy === 'FACE_DETECTION';

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

  // For SENSOR_ONLY angles (VERTEX, BACK_DONOR), update validation continuously with RADAR SOUND
  useEffect(() => {
    if (!useFaceDetection) {
      // Update validation based on sensor data only
      const v = validatePosition(sensorData, config, 30); // Assume 30cm distance for sensor-only
      setValidationState(v);

      // RADAR SOUND: Play sound based on pitch delta (how close to target angle)
      const targetPitch = config.phoneAngle.pitch;
      const pitchDelta = Math.abs(sensorData.pitch - targetPitch);

      // Play radar sound every 300-800ms based on accuracy
      const now = Date.now();
      const accuracy = v.angleAccuracy;

      // Interval: 800ms when far, 200ms when close
      const interval = 800 - (accuracy / 100) * 600;

      if (now - lastRadarSoundTime.current > interval) {
        audioFeedbackRef.current.playRadarSound(pitchDelta);
        lastRadarSoundTime.current = now;
      }
    }
  }, [sensorData, config, useFaceDetection]);

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

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      });

      const capturedPhoto: CapturedPhoto = {
        angle,
        uri: `file://${photo.path}`,
        timestamp: Date.now(),
        metadata: {
          pitch: sensorData.pitch,
          roll: sensorData.roll,
          distance: 40,
        },
      };

      navigation.navigate('Review', { photo: capturedPhoto });
    } catch (error) {
      console.error('Capture error:', error);
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
