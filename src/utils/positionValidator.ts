import { AngleConfig, SensorData, PositionValidation } from '../types';
import { FaceAnalysis } from './faceDetection';

/**
 * Validates if the current phone position matches the target angle configuration
 * Supports two strategies: FACE_DETECTION and SENSOR_ONLY
 */
export const validatePosition = (
  currentSensor: SensorData,
  targetConfig: AngleConfig,
  estimatedDistance: number = 40, // Default distance in cm
  faceAnalysis?: FaceAnalysis // Optional - only for FACE_DETECTION strategy
): PositionValidation => {
  const { phoneAngle, distanceRange, validationStrategy } = targetConfig;

  // STRATEGY 1: FACE_DETECTION (for angles 1-3)
  if (validationStrategy === 'FACE_DETECTION') {
    return validateWithFaceDetection(currentSensor, targetConfig, estimatedDistance, faceAnalysis);
  }

  // STRATEGY 2: SENSOR_ONLY (for angles 4-5: VERTEX and BACK_DONOR)
  return validateWithSensorOnly(currentSensor, targetConfig, estimatedDistance);
};

/**
 * Validation using face detection (for front, right 45°, left 45°)
 */
function validateWithFaceDetection(
  currentSensor: SensorData,
  targetConfig: AngleConfig,
  estimatedDistance: number,
  faceAnalysis?: FaceAnalysis
): PositionValidation {
  const { phoneAngle, distanceRange, faceRequirements } = targetConfig;

  // Check if face is detected
  if (!faceAnalysis || !faceAnalysis.faceDetected) {
    return {
      isValid: false,
      angleAccuracy: 0,
      distanceAccuracy: 0,
      feedback: 'Yüzünüz algılanamıyor. Kamerayı yüzünüze doğrultun.',
    };
  }

  // Calculate phone angle accuracy
  const pitchDiff = Math.abs(currentSensor.pitch - phoneAngle.pitch);
  const rollDiff = Math.abs(currentSensor.roll - phoneAngle.roll);
  const pitchAccuracy = Math.max(0, 100 - (pitchDiff / phoneAngle.tolerance) * 100);
  const rollAccuracy = Math.max(0, 100 - (rollDiff / phoneAngle.tolerance) * 100);
  const phoneAngleAccuracy = (pitchAccuracy + rollAccuracy) / 2;

  // Calculate face angle accuracy (yaw, pitch, roll)
  const faceYaw = faceAnalysis.faceAngles.yaw.angle;
  const facePitch = faceAnalysis.faceAngles.pitch.angle;
  const faceRoll = faceAnalysis.faceAngles.roll.angle;

  const [minYaw, maxYaw] = faceRequirements!.yawRange;
  const [minPitch, maxPitch] = faceRequirements!.pitchRange;
  const [minRoll, maxRoll] = faceRequirements!.rollRange;

  const yawInRange = faceYaw >= minYaw && faceYaw <= maxYaw;
  const pitchInRange = facePitch >= minPitch && facePitch <= maxPitch;
  const rollInRange = faceRoll >= minRoll && faceRoll <= maxRoll;

  // Calculate face angle accuracy as percentage
  const yawCenter = (minYaw + maxYaw) / 2;
  const yawRange = maxYaw - minYaw;
  const yawDiff = Math.abs(faceYaw - yawCenter);
  const faceYawAccuracy = Math.max(0, 100 - (yawDiff / (yawRange / 2)) * 100);

  const faceAngleAccuracy = faceYawAccuracy; // Primary metric for face turning

  // Calculate distance accuracy
  const distanceMid = (distanceRange.min + distanceRange.max) / 2;
  const distanceMargin = (distanceRange.max - distanceRange.min) / 2;
  const distanceDiff = Math.abs(estimatedDistance - distanceMid);
  const distanceAccuracy = Math.max(0, 100 - (distanceDiff / distanceMargin) * 100);

  // Overall accuracy (weighted average)
  const angleAccuracy = phoneAngleAccuracy * 0.3 + faceAngleAccuracy * 0.7; // Face angle is more important

  // Position is valid if all criteria met
  const isValid = angleAccuracy >= 70 && distanceAccuracy >= 60 && yawInRange && pitchInRange && rollInRange;

  // Generate feedback message
  let feedback = '';
  if (!isValid) {
    if (!yawInRange) {
      if (faceYaw < minYaw) {
        feedback = targetConfig.id === 'RIGHT_45'
          ? 'Başınızı daha fazla SAĞA çevirin'
          : 'Başınızı daha fazla SOLA çevirin';
      } else {
        feedback = targetConfig.id === 'RIGHT_45'
          ? 'Başınızı biraz geri çevirin (çok fazla döndü)'
          : 'Başınızı biraz geri çevirin (çok fazla döndü)';
      }
    } else if (!pitchInRange) {
      feedback = facePitch > maxPitch ? 'Başınızı biraz kaldırın' : 'Başınızı biraz indirin';
    } else if (phoneAngleAccuracy < 60) {
      if (pitchDiff > phoneAngle.tolerance / 2) {
        feedback = currentSensor.pitch > phoneAngle.pitch
          ? 'Telefonu biraz aşağı eğin'
          : 'Telefonu biraz yukarı eğin';
      }
    } else if (distanceAccuracy < 60) {
      feedback = estimatedDistance < distanceMid
        ? 'Telefonu biraz uzaklaştırın'
        : 'Telefonu biraz yaklaştırın';
    }
  } else {
    feedback = 'Mükemmel! Pozisyon doğru.';
  }

  return {
    isValid,
    angleAccuracy: Math.round(angleAccuracy),
    distanceAccuracy: Math.round(distanceAccuracy),
    feedback,
  };
}

/**
 * Validation using only sensor data (for VERTEX and BACK_DONOR)
 */
function validateWithSensorOnly(
  currentSensor: SensorData,
  targetConfig: AngleConfig,
  estimatedDistance: number
): PositionValidation {
  const { phoneAngle, distanceRange } = targetConfig;

  // Calculate angle accuracy (0-100%)
  const pitchDiff = Math.abs(currentSensor.pitch - phoneAngle.pitch);
  const rollDiff = Math.abs(currentSensor.roll - phoneAngle.roll);

  // For BACK_DONOR, also check yaw if specified
  let yawDiff = 0;
  if (phoneAngle.yaw !== undefined) {
    // Normalize yaw to 0-360 range for comparison
    const normalizeYaw = (angle: number) => ((angle % 360) + 360) % 360;
    const currentYaw = normalizeYaw(currentSensor.yaw);
    const targetYaw = normalizeYaw(phoneAngle.yaw);
    yawDiff = Math.min(
      Math.abs(currentYaw - targetYaw),
      360 - Math.abs(currentYaw - targetYaw)
    );
  }

  const pitchAccuracy = Math.max(0, 100 - (pitchDiff / phoneAngle.tolerance) * 100);
  const rollAccuracy = Math.max(0, 100 - (rollDiff / phoneAngle.tolerance) * 100);
  const yawAccuracy = phoneAngle.yaw !== undefined
    ? Math.max(0, 100 - (yawDiff / phoneAngle.tolerance) * 100)
    : 100;

  const angleAccuracy = phoneAngle.yaw !== undefined
    ? (pitchAccuracy + rollAccuracy + yawAccuracy) / 3
    : (pitchAccuracy + rollAccuracy) / 2;

  // Calculate distance accuracy (0-100%)
  const distanceMid = (distanceRange.min + distanceRange.max) / 2;
  const distanceMargin = (distanceRange.max - distanceRange.min) / 2;
  const distanceDiff = Math.abs(estimatedDistance - distanceMid);
  const distanceAccuracy = Math.max(0, 100 - (distanceDiff / distanceMargin) * 100);

  // For sensor-only validation, be more lenient (no face to detect)
  const isValid = angleAccuracy >= 65 && distanceAccuracy >= 50;

  // Generate feedback message
  let feedback = '';
  if (!isValid) {
    if (angleAccuracy < 65) {
      if (pitchDiff > phoneAngle.tolerance / 2) {
        feedback = currentSensor.pitch > phoneAngle.pitch
          ? 'Telefonu biraz aşağı eğin (daha yatay)'
          : 'Telefonu biraz yukarı eğin (daha dik)';
      }
      if (rollDiff > phoneAngle.tolerance / 2) {
        feedback = currentSensor.roll > phoneAngle.roll
          ? 'Telefonu biraz sola eğin'
          : 'Telefonu biraz sağa eğin';
      }
      if (phoneAngle.yaw !== undefined && yawDiff > phoneAngle.tolerance / 2) {
        feedback = targetConfig.id === 'BACK_DONOR'
          ? 'Telefonu başınızın arkasına götürün'
          : 'Telefonu başınızın üzerine götürün';
      }
    }
    if (distanceAccuracy < 50) {
      feedback = estimatedDistance < distanceMid
        ? 'Telefonu biraz uzaklaştırın (20-35 cm ideal)'
        : 'Telefonu biraz yaklaştırın (20-35 cm ideal)';
    }
  } else {
    feedback = 'Mükemmel! Pozisyon doğru.';
  }

  return {
    isValid,
    angleAccuracy: Math.round(angleAccuracy),
    distanceAccuracy: Math.round(distanceAccuracy),
    feedback,
  };
}

/**
 * Calculates estimated distance based on face/head size in frame
 * This is a simplified estimation - in production, you'd use ML models
 */
export const estimateDistance = (faceWidth: number, frameWidth: number): number => {
  // Simplified calculation: assuming average head width is 15cm
  const averageHeadWidth = 15; // cm
  const focalLength = 500; // Approximate focal length for mobile cameras

  if (faceWidth === 0) return 40; // Default distance

  const distance = (averageHeadWidth * focalLength) / faceWidth;
  return Math.max(20, Math.min(60, distance)); // Clamp between 20-60cm
};

/**
 * Generates audio feedback frequency based on position accuracy
 * Returns frequency in Hz (higher = closer to correct position)
 */
export const getAudioFeedbackFrequency = (accuracy: number): number => {
  // Map accuracy (0-100) to frequency (200-800 Hz)
  const minFreq = 200;
  const maxFreq = 800;
  return minFreq + (accuracy / 100) * (maxFreq - minFreq);
};

/**
 * Gets color code for visual feedback based on accuracy
 */
export const getFeedbackColor = (accuracy: number): string => {
  if (accuracy >= 80) return '#4CAF50'; // Green
  if (accuracy >= 60) return '#FF9800'; // Orange
  if (accuracy >= 40) return '#FF5722'; // Deep Orange
  return '#F44336'; // Red
};
