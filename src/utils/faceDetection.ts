import { Dimensions } from 'react-native';
import { Face } from 'vision-camera-face-detector';
import { estimateHybridHeadPose } from './hybridHeadPose';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
* Yüz doğrulama kriterleri
*/
export const FACE_VALIDATION_CRITERIA = {
  maxRollAngle: 10,    // maksimum yatay eğim
  maxYawAngle: 15,     // maksimum dönüş açısı
  maxPitchAngle: 10,   // maksimum baş eğimi
  minFaceSize: 0.3,    // yüzün ekranda minimum boyutu (oransal)
  maxFaceSize: 0.8,    // yüzün ekranda maksimum boyutu (oransal)
  minAlignmentScore: 70, // minimum kabul edilebilir hizalama skoru
};

export interface FaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseBase: { x: number; y: number };
  leftMouth: { x: number; y: number };
  rightMouth: { x: number; y: number };
  bottomMouth: { x: number; y: number };
  leftEar: { x: number; y: number };
  rightEar: { x: number; y: number };
  leftCheek: { x: number; y: number };
  rightCheek: { x: number; y: number };
}

export interface FaceAnalysis {
  faceDetected: boolean;
  facePosition: {
    centered: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    sizeValid?: boolean;
    relativeWidth?: number;
  };
  faceAngles: {
    roll: {
      angle: number;
      valid: boolean;
    };
    yaw: {
      angle: number;
      valid: boolean;
    };
    pitch: {
      angle: number;
      valid: boolean;
    };
  };
  landmarks: FaceLandmarks;
  hairlineVisible: boolean;
  foreheadExposure: number;
  faceQuality: {
    brightness: number;
    sharpness: number;
    contrast: number;
  };
  alignmentScore: number;
  eyeOpenScore: number;
  isSmiling: boolean;
  smilingProbability: number;
  timestamp: number;
  lightingScore?: number;
  sharpnessScore?: number;
}

/**
 * Gelişmiş yüz analizi için ana fonksiyon
 * Expo Face Detector ile yüz landmark'larını analiz eder
 *
 * YENİ: Hibrit Head Pose sistemi entegre edildi
 */
export const analyzeFace = async (face: any): Promise<FaceAnalysis> => {
  try {
    const facePosition = analyzeFacePosition(face);

    // YENİ: Hibrit Head Pose tahmini (Landmark + Surface Normal + Optical Flow)
    const hybridPose = estimateHybridHeadPose(face);

    // Hibrit pose'dan iyileştirilmiş açıları al
    const faceAngles = {
      roll: {
        angle: hybridPose.roll,
        valid: Math.abs(hybridPose.roll) <= FACE_VALIDATION_CRITERIA.maxRollAngle
      },
      yaw: {
        angle: hybridPose.yaw,
        valid: Math.abs(hybridPose.yaw) <= FACE_VALIDATION_CRITERIA.maxYawAngle
      },
      pitch: {
        angle: hybridPose.pitch,
        valid: Math.abs(hybridPose.pitch) <= FACE_VALIDATION_CRITERIA.maxPitchAngle
      }
    };

    const landmarks = extractLandmarks(face);
    const hairlineAnalysis = analyzeHairline(face, landmarks);
    const qualityAnalysis = analyzeImageQuality(face);

    // Alignment score'u hibrit pose confidence ile ağırlıklandır
    const baseAlignment = calculateAlignmentScore(facePosition, faceAngles, hairlineAnalysis);
    const alignmentScore = Math.round(baseAlignment * hybridPose.confidence);

    // Kalite skorlarını hesapla
    const lightingScore = qualityAnalysis.brightness * 100;
    const sharpnessScore = qualityAnalysis.sharpness * 100;

    // Göz açıklığı analizi
    const leftEyeOpen = face.leftEyeOpenProbability || 0;
    const rightEyeOpen = face.rightEyeOpenProbability || 0;
    const eyeOpenScore = ((leftEyeOpen + rightEyeOpen) / 2) * 100;

    // Gülümseme analizi
    const smilingProbability = face.smilingProbability || 0;
    const isSmiling = smilingProbability > 0.3; // %30'dan fazla gülümseme

    return {
      faceDetected: true,
      facePosition,
      faceAngles,
      landmarks,
      hairlineVisible: hairlineAnalysis.visible,
      foreheadExposure: hairlineAnalysis.foreheadExposure,
      faceQuality: qualityAnalysis,
      alignmentScore,
      eyeOpenScore,
      isSmiling,
      smilingProbability,
      timestamp: Date.now(),
      lightingScore,
      sharpnessScore,
    };
  } catch (error) {
    console.error('Yüz analizi hatası:', error);
    return getDefaultFaceAnalysis();
  }
};

/**
 * Yüz pozisyonunu analiz et
 */
const analyzeFacePosition = (face: FaceDetector.FaceFeature) => {
  const { boundingBox } = face;
  const faceCenterX = boundingBox.origin.x + boundingBox.size.width / 2;
  const faceCenterY = boundingBox.origin.y + boundingBox.size.height / 2;
  const screenCenterX = screenWidth / 2;
  const screenCenterY = screenHeight / 2;

  const centerThreshold = screenWidth * 0.15;
  const centered = Math.abs(faceCenterX - screenCenterX) < centerThreshold &&
                   Math.abs(faceCenterY - screenCenterY) < centerThreshold * 1.5;

  const relativeWidth = bounds.size.width / screenWidth;
  const sizeValid = relativeWidth >= 0.2 && relativeWidth <= 0.8;

  return {
    centered,
    x: faceCenterX,
    y: faceCenterY,
    width: bounds.size.width,
    height: bounds.size.height,
    sizeValid,
    relativeWidth,
  };
};

/**
 * Yüz açılarını analiz et
 */
const analyzeFaceAngles = (face: any) => {
  const roll = face.rollAngle || 0;
  const yaw = face.yawAngle || 0;
  const pitch = face.pitchAngle || 0;
  
  return {
    roll: {
      angle: roll,
      valid: Math.abs(roll) <= FACE_VALIDATION_CRITERIA.maxRollAngle
    },
    yaw: {
      angle: yaw,
      valid: Math.abs(yaw) <= FACE_VALIDATION_CRITERIA.maxYawAngle
    },
    pitch: {
      angle: pitch,
      valid: Math.abs(pitch) <= FACE_VALIDATION_CRITERIA.maxPitchAngle
    }
  };
};

/**
 * Landmark'ları çıkar ve normalize et
 */
const extractLandmarks = (face: any): FaceLandmarks => {
  const landmarks = face.landmarks || {};
  
  return {
    leftEye: landmarks.leftEyePosition || { x: 0, y: 0 },
    rightEye: landmarks.rightEyePosition || { x: 0, y: 0 },
    noseBase: landmarks.noseBasePosition || { x: 0, y: 0 },
    leftMouth: landmarks.leftMouthPosition || { x: 0, y: 0 },
    rightMouth: landmarks.rightMouthPosition || { x: 0, y: 0 },
    bottomMouth: landmarks.bottomMouthPosition || { x: 0, y: 0 },
    leftEar: landmarks.leftEarPosition || { x: 0, y: 0 },
    rightEar: landmarks.rightEarPosition || { x: 0, y: 0 },
    leftCheek: landmarks.leftCheekPosition || { x: 0, y: 0 },
    rightCheek: landmarks.rightCheekPosition || { x: 0, y: 0 },
  };
};

/**
 * Saç çizgisi ve alın analizi
 */
const analyzeHairline = (face: any, landmarks: FaceLandmarks) => {
  const { bounds } = face;
  const foreheadHeight = bounds.origin.y + bounds.size.height * 0.3;
  const eyeLevel = (landmarks.leftEye.y + landmarks.rightEye.y) / 2;
  
  // Alın yüksekliğini hesapla
  const foreheadExposure = Math.max(0, (eyeLevel - foreheadHeight) / bounds.size.height);
  
  // Saç çizgisi görünürlüğü (basit heuristic)
  const visible = foreheadExposure > 0.1 && foreheadExposure < 0.4;

  return {
    visible,
    foreheadExposure,
  };
};

/**
* Görüntü kalitesi analizi (basit hesaplamalar)
*/
const analyzeImageQuality = (face: any) => {
  // Expo Face Detector sınırlı veri sağlıyor, bu yüzden tahmini değerler kullanıyoruz
  const brightness = 0.7; // Placeholder - gerçek implementasyonda kamera preview analiz edilmeli
  const sharpness = 0.8;  // Placeholder
  const contrast = 0.75; // Placeholder

  return {
    brightness,
    sharpness,
    contrast,
  };
};

/**
* Toplam hizalama skoru hesapla
*/
const calculateAlignmentScore = (
  position: any,
  angles: any,
  hairline: any
): number => {
  let score = 0;

  // Pozisyon ağırlığı %40
  score += position.centered ? 40 : 20;

  // Açılar ağırlığı %40
  const angleScore = Math.max(0, 40 - (Math.abs(angles.roll.angle) + Math.abs(angles.yaw.angle)) * 2);
  score += angleScore;

  // Saç çizgisi ağırlığı %20
  score += hairline.visible ? 20 : 0;

  return Math.round(Math.min(100, Math.max(0, score)));
};

/**
* Varsayılan yüz analizi (yüz algılanamadığında)
*/
const getDefaultFaceAnalysis = (): FaceAnalysis => ({
  faceDetected: false,
  facePosition: {
    centered: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    sizeValid: false,
    relativeWidth: 0,
  },
  faceAngles: {
    roll: { angle: 0, valid: false },
    yaw: { angle: 0, valid: false },
    pitch: { angle: 0, valid: false },
  },
  landmarks: {
    leftEye: { x: 0, y: 0 },
    rightEye: { x: 0, y: 0 },
    noseBase: { x: 0, y: 0 },
    leftMouth: { x: 0, y: 0 },
    rightMouth: { x: 0, y: 0 },
    bottomMouth: { x: 0, y: 0 },
    leftEar: { x: 0, y: 0 },
    rightEar: { x: 0, y: 0 },
    leftCheek: { x: 0, y: 0 },
    rightCheek: { x: 0, y: 0 },
  },
  hairlineVisible: false,
  foreheadExposure: 0,
  faceQuality: {
    brightness: 0.5,
    sharpness: 0.5,
    contrast: 0.5,
  },
  alignmentScore: 0,
  eyeOpenScore: 100,
  isSmiling: false,
  smilingProbability: 0,
  timestamp: Date.now(),
  lightingScore: 0,
  sharpnessScore: 0,
});

/**
* Kullanıcıya geri bildirim mesajları
*/
export const getFaceFeedbackMessage = (analysis: FaceAnalysis): string => {
  if (!analysis.faceDetected) {
    return 'Yüz algılanamadı. Lütfen kameraya bakın.';
  }

  if (!analysis.facePosition.centered) {
    return 'Yüzünüzü merkeze hizalayın.';
  }

  if (Math.abs(analysis.faceAngles.roll.angle) > FACE_VALIDATION_CRITERIA.maxRollAngle) {
    return 'Başınızı düzeltin.';
  }

  if (Math.abs(analysis.faceAngles.yaw.angle) > FACE_VALIDATION_CRITERIA.maxYawAngle) {
    return 'Yüzünüzü öne doğru tutun.';
  }

  if (analysis.eyeOpenScore < 80) {
    return 'Gözlerinizi açın.';
  }

  if (analysis.isSmiling) {
    return 'Gülümsemeyi bırakın, nötr bir ifadeyle durun.';
  }

  if (!analysis.hairlineVisible) {
    return 'Saç çizgisi net değil. Saçlarınızı geriye tarayın.';
  }

  if (analysis.faceQuality.brightness < 0.7) {
    return 'Işık yetersiz. Daha aydınlık bir yere geçin.';
  }

  if (analysis.faceQuality.sharpness < 0.7) {
    return 'Netlik düşük. Kamerayı sabit tutun.';
  }

  if (analysis.alignmentScore >= 95) {
    return 'Mükemmel! Fotoğraf çekilmeye hazır.';
  }

  if (analysis.alignmentScore >= 85) {
    return 'Harika! Çok yaklaştınız.';
  }

  if (analysis.alignmentScore >= 70) {
    return 'Çok iyi! Biraz daha sabit durun.';
  }

  return 'Pozisyon iyileştiriliyor...';
};

/**
* Saç analizi için özel fonksiyonlar
*/
export const analyzeHairRegion = (landmarks: FaceLandmarks) => {
  // Saç bölgesi analizi için landmark koordinatları
  const hairlineTop = {
    x: (landmarks.leftEye.x + landmarks.rightEye.x) / 2,
    y: Math.min(landmarks.leftEye.y, landmarks.rightEye.y) - 50, // Tahmini saç çizgisi
  };

  const templeLeft = {
    x: landmarks.leftEar.x,
    y: landmarks.leftEye.y - 30,
  };

  const templeRight = {
    x: landmarks.rightEar.x,
    y: landmarks.rightEye.y - 30,
  };

  return {
    hairlineTop,
    templeLeft,
    templeRight,
    // Saç dökülme analizi için basit hesaplamalar
    hairDensity: 0.8, // Placeholder - gerçek ML modeli gerektirir
    recedingHairline: false, // Placeholder
  };
};