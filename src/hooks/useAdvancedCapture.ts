import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceFeature } from 'expo-face-detector';
import { DeviceMotion } from 'expo-sensors';
import { Dimensions } from 'react-native';

import { estimateHybridHeadPose, HeadPoseEstimate, resetOpticalFlowState } from '../utils/hybridHeadPose';
import { AdvancedSensorFusion, PhoneOrientation, RawSensorData } from '../utils/advancedSensorFusion';
import { CaptureAngle, AngleConfig } from '../types';
import { ANGLE_CONFIGS } from '../constants/angles';
import { calculateIoU } from '../utils/iou'; // YENİ: IoU yardımcı fonksiyonu

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Hook arayüzü
interface UseAdvancedCaptureOptions {
  captureAngle: CaptureAngle;
}

interface ValidationState {
  isHeadYawValid: boolean;
  isHeadPitchValid: boolean;
  isHeadRollValid: boolean;
  isPhonePitchValid: boolean;
  isPhoneRollValid: boolean;
  isCentered: boolean;
}

interface UseAdvancedCaptureReturn {
  isReadyToCapture: boolean;
  smartFeedback: string;
  validationState: ValidationState | null;
  processFace: (face: FaceFeature) => void;
  reset: () => void;
  // Orijinal state'leri de dışa aktarabiliriz (debug için)
  headPose: HeadPoseEstimate | null;
  phoneOrientation: PhoneOrientation | null;
}

export const useAdvancedCapture = (
  options: UseAdvancedCaptureOptions
): UseAdvancedCaptureReturn => {
  const { captureAngle } = options;
  const angleConfig = useRef<AngleConfig>(ANGLE_CONFIGS[captureAngle]).current;

  // --- States ---
  const [headPose, setHeadPose] = useState<HeadPoseEstimate | null>(null);
  const [phoneOrientation, setPhoneOrientation] = useState<PhoneOrientation | null>(null);
  const [validationState, setValidationState] = useState<ValidationState | null>(null);
  const [isAllConditionsMet, setIsAllConditionsMet] = useState(false);
  const [isStable, setIsStable] = useState(false);
  const [isCaptureTriggered, setIsCaptureTriggered] = useState(false); // Tek çekim kilidi

  // --- Refs ---
  const sensorFusionRef = useRef<AdvancedSensorFusion | null>(null);
  const sensorSubscriptionRef = useRef<any>(null);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sensörleri başlatma
  useEffect(() => {
    sensorFusionRef.current = new AdvancedSensorFusion();
    const setupSensors = async () => {
      const available = await DeviceMotion.isAvailableAsync();
      if (!available) return;
      DeviceMotion.setUpdateInterval(16); // ~60 Hz
      sensorSubscriptionRef.current = DeviceMotion.addListener((data) => {
        const orientation = sensorFusionRef.current?.fuse(data as any);
        if (orientation) setPhoneOrientation(orientation);
      });
    };
    setupSensors();
    return () => sensorSubscriptionRef.current?.remove();
  }, []);

  // Yüz işleme
  const processFace = useCallback((face: FaceFeature) => {
    const pose = estimateHybridHeadPose(face);
    setHeadPose(pose);
  }, []);

  // YENİ: Çekirdek Doğrulama Mantığı
  useEffect(() => {
    if (!headPose || !phoneOrientation) return;

    const {
      faceRequirements,
      phoneAngle,
      iouThreshold,
    } = angleConfig;

    const vState: ValidationState = {
      isHeadYawValid:
        faceRequirements ?
        headPose.yaw >= faceRequirements.yawRange[0] &&
        headPose.yaw <= faceRequirements.yawRange[1] : true,
      isHeadPitchValid:
        faceRequirements ?
        headPose.pitch >= faceRequirements.pitchRange[0] &&
        headPose.pitch <= faceRequirements.pitchRange[1] : true,
      isHeadRollValid:
        faceRequirements ?
        headPose.roll >= faceRequirements.rollRange[0] &&
        headPose.roll <= faceRequirements.rollRange[1] : true,
      isPhonePitchValid:
        Math.abs(phoneOrientation.pitch - phoneAngle.pitch) <= phoneAngle.tolerance,
      isPhoneRollValid:
        Math.abs(phoneOrientation.roll - phoneAngle.roll) <= phoneAngle.tolerance,
      isCentered: iouThreshold ? calculateIoU(
        { x: headPose.bounds.x, y: headPose.bounds.y, width: headPose.bounds.width, height: headPose.bounds.height },
        // Hedef kutu: Ekranın merkezinde, %50 genişlik ve yükseklikte bir alan
        { x: screenWidth * 0.25, y: screenHeight * 0.25, width: screenWidth * 0.5, height: screenHeight * 0.5 }
      ) >= iouThreshold : true,
    };
    
    setValidationState(vState);
    setIsAllConditionsMet(Object.values(vState).every(Boolean));

  }, [headPose, phoneOrientation, angleConfig]);

  // YENİ: Stabilizasyon Mantığı
  useEffect(() => {
    const stabilityDuration = angleConfig.stabilityDuration || 1000;

    if (isAllConditionsMet) {
      if (!stabilityTimerRef.current) {
        stabilityTimerRef.current = setTimeout(() => {
          if (!isCaptureTriggered) {
            setIsStable(true);
          }
        }, stabilityDuration);
      }
    } else {
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
      setIsStable(false);
    }
  }, [isAllConditionsMet, angleConfig.stabilityDuration, isCaptureTriggered]);

  // YENİ: Akıllı Geri Bildirim
  const generateSmartFeedback = (): string => {
    if (!validationState) return "Kamera hazırlanıyor...";
    if (isStable) return "Harika! Çekim yapılıyor...";
    if (isAllConditionsMet) return `Pozisyonu ${((angleConfig.stabilityDuration || 1000) / 1000).toFixed(1)} saniye koruyun...`;
    
    if (!validationState.isCentered) return "Yüzünüzü çerçevenin ortasına getirin";
    if (!validationState.isHeadYawValid) return headPose && headPose.yaw > angleConfig.faceRequirements!.yawRange[1] ? "Başınızı hafifçe sola çevirin" : "Başınızı hafifçe sağa çevirin";
    if (!validationState.isHeadPitchValid) return headPose && headPose.pitch > angleConfig.faceRequirements!.pitchRange[1] ? "Başınızı hafifçe aşağı eğin" : "Başınızı hafifçe yukarı kaldırın";
    if (!validationState.isHeadRollValid) return headPose && headPose.roll > angleConfig.faceRequirements!.rollRange[1] ? "Başınızı sola yatırın" : "Başınızı sağa yatırın";
    if (!validationState.isPhonePitchValid) return phoneOrientation && phoneOrientation.pitch > angleConfig.phoneAngle.pitch ? "Telefonu aşağı eğin" : "Telefonu yukarı kaldırın";
    if (!validationState.isPhoneRollValid) return "Telefonu düz tutun";

    return "Yönlendirmeleri takip edin";
  };
  
  const isReadyToCapture = isStable && !isCaptureTriggered;
  if(isReadyToCapture) {
    setIsCaptureTriggered(true); // Kilidi etkinleştir
  }

  const reset = useCallback(() => {
    setHeadPose(null);
    setValidationState(null);
    setIsAllConditionsMet(false);
    setIsStable(false);
    setIsCaptureTriggered(false); // Kilidi aç
    resetOpticalFlowState();
    if (sensorFusionRef.current) {
      sensorFusionRef.current.reset();
    }
    if(stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current)
      stabilityTimerRef.current = null
    }
  }, []);

  return {
    isReadyToCapture,
    smartFeedback: generateSmartFeedback(),
    validationState,
    processFace,
    reset,
    headPose,
    phoneOrientation,
  };
};
