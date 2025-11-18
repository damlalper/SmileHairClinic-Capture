// Photo capture angle types
export enum CaptureAngle {
  FRONT = 'FRONT',
  RIGHT_45 = 'RIGHT_45',
  LEFT_45 = 'LEFT_45',
  VERTEX = 'VERTEX',
  BACK_DONOR = 'BACK_DONOR',
}

// Validation strategy type
export type ValidationStrategy = 'FACE_DETECTION' | 'SENSOR_ONLY';

// Face requirements for validation
export interface FaceRequirements {
  yawRange: [number, number]; // [min, max] degrees for face yaw
  pitchRange: [number, number]; // [min, max] degrees for face pitch
  rollRange: [number, number]; // [min, max] degrees for face roll
}

// Angle configuration for each capture
export interface AngleConfig {
  id: CaptureAngle;
  title: string;
  description: string;
  targetArea: string;
  instructions: string;
  phoneAngle: {
    pitch: number; // Up/down tilt (degrees)
    roll: number; // Left/right tilt (degrees)
    yaw?: number; // Rotation around vertical axis (degrees) - optional
    tolerance: number; // Acceptable deviation
  };
  distanceRange: {
    min: number; // cm
    max: number; // cm
  };
  validationStrategy: ValidationStrategy; // How to validate this angle
  faceRequirements?: FaceRequirements; // Only for FACE_DETECTION strategy
  centeringTolerance?: number; // Optional: ±% tolerance for centering
  stabilityDuration?: number; // Optional: ms duration for conditions to be stable
  iouThreshold?: number;      // Optional: 0-1 IoU match threshold
}

// Captured photo data
export interface CapturedPhoto {
  angle: CaptureAngle;
  uri: string;
  timestamp: number;
  metadata: {
    pitch: number;
    roll: number;
    distance: number;
  };
}

// Sensor data
export interface SensorData {
  pitch: number;
  roll: number;
  yaw: number;
}

// Position validation result
export interface PositionValidation {
  isValid: boolean;
  angleAccuracy: number; // 0-100%
  distanceAccuracy: number; // 0-100%
  feedback: string;
}

// Navigation types
export type RootStackParamList = {
  Welcome: undefined;
  Instructions: { angle: CaptureAngle };
  Review: undefined; // Navigates to review all photos in context
  Completion: undefined; // Navigates to the final completion screen
  FrontFaceCapture: undefined;
  Left45Capture: undefined;
  Right45Capture: undefined;
  VertexCapture: undefined;
  BackDonorCapture: undefined;
};
