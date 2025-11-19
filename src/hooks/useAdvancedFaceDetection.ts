import { useState, useEffect, useRef, useCallback } from 'react';
// import { Camera } from 'expo-camera'; // LEGACY: Using vision-camera instead
// import * as FaceDetector from 'expo-face-detector'; // LEGACY: Using vision-camera-face-detector
// import { Audio } from 'expo-av'; // LEGACY: Using expo-audio
import { analyzeFace, FaceAnalysis, getFaceFeedbackMessage } from '../utils/faceDetection';

// Type stubs for legacy compatibility
type AudioSound = any;

/**
* Gelişmiş yüz algılama ve analiz hook'u
* MediaPipe benzeri yüz mesh detection sağlar
*/
export const useAdvancedFaceDetection = () => {
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isPositionValid, setIsPositionValid] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('Yüz algılanıyor...');
  const [alignmentScore, setAlignmentScore] = useState(0);
  const [sound, setSound] = useState<AudioSound | null>(null);
  
  const detectionCount = useRef(0);
  const validPositionCount = useRef(0);
  const lastValidPositionTime = useRef<number>(0);

  /**
   * Ses efekti yükle
   */
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound: loadedSound } = await Audio.Sound.createAsync(
          require('../assets/sounds/beep.wav'),
          { shouldPlay: false }
        );
        setSound(loadedSound);
      } catch (error) {
        console.log('Ses efekti yüklenemedi:', error);
      }
    };

    loadSound();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  /**
   * Bildirim sesi çal
   */
  const playNotificationSound = useCallback(async () => {
    if (sound) {
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch (error) {
        console.log('Ses çalma hatası:', error);
      }
    }
  }, [sound]);

  /**
   * Yüz analizini gerçekleştir
   */
  const handleFaceDetection = useCallback(async ({ faces }: { faces: FaceDetector.FaceFeature[] }) => {
    if (faces.length === 0) {
      setFaceAnalysis(null);
      setIsFaceDetected(false);
      setIsPositionValid(false);
      setFeedbackMessage('Yüz algılanamadı. Lütfen kameraya bakın.');
      setAlignmentScore(0);
      detectionCount.current = 0;
      validPositionCount.current = 0;
      return;
    }

    // İlk yüzü al (en büyük veya en merkezde olanı seçmek için iyileştirilebilir)
    const primaryFace = faces[0];
    
    try {
      // Gelişmiş yüz analizi yap
      const analysis = await analyzeFace(primaryFace);
      
      setFaceAnalysis(analysis);
      setIsFaceDetected(true);
      setAlignmentScore(analysis.alignmentScore);

      // Geri bildirim mesajını güncelle
      const feedback = getFaceFeedbackMessage(analysis);
      setFeedbackMessage(feedback);

      // Pozisyon doğruluğunu kontrol et
      const isValid = analysis.alignmentScore >= 70 && 
                     analysis.faceDetected && 
                     analysis.facePosition.centered &&
                     analysis.hairlineVisible;

      if (isValid) {
        validPositionCount.current++;
        lastValidPositionTime.current = Date.now();
        
        // 10 ardışık doğru tespitten sonra pozisyonu geçerli kabul et
        if (validPositionCount.current >= 10 && !isPositionValid) {
          setIsPositionValid(true);
          playNotificationSound();
        }
      } else {
        validPositionCount.current = 0;
        setIsPositionValid(false);
      }

      detectionCount.current++;

    } catch (error) {
      console.error('Yüz analizi hatası:', error);
      setFeedbackMessage('Yüz analizi sırasında hata oluştu.');
    }
  }, [playNotificationSound]);

  /**
   * Pozisyon doğruluğunu sıfırla
   */
  const resetPosition = useCallback(() => {
    validPositionCount.current = 0;
    setIsPositionValid(false);
    setAlignmentScore(0);
  }, []);

  /**
   * Zaman aşımı kontrolü
   */
  useEffect(() => {
    const timeout = setInterval(() => {
      if (lastValidPositionTime.current > 0 && 
          Date.now() - lastValidPositionTime.current > 3000) {
        // 3 saniyeden uzun süre doğru pozisyon yoksa sıfırla
        if (validPositionCount.current > 0) {
          validPositionCount.current = Math.max(0, validPositionCount.current - 2);
        }
      }
    }, 1000);

    return () => clearInterval(timeout);
  }, []);

  return {
    faceAnalysis,
    isFaceDetected,
    isPositionValid,
    feedbackMessage,
    alignmentScore,
    handleFaceDetection,
    resetPosition,
    faceDetectorSettings: FACE_DETECTOR_SETTINGS,
  };
};

/**
* Kamera yüz dedektör ayarları
*/
export const ADVANCED_FACE_DETECTOR_SETTINGS = {
  mode: FaceDetector.FaceDetectorMode.accurate,
  detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
  runClassifications: FaceDetector.FaceDetectorClassifications.all,
  minDetectionInterval: 100, // Daha hızlı tespit
  tracking: true,
};

/**
* Saç analizi için özel hook
*/
export const useHairAnalysis = () => {
  const [hairDensity, setHairDensity] = useState(0);
  const [recedingHairline, setRecedingHairline] = useState(false);
  const [hairlineScore, setHairlineScore] = useState(0);

  const analyzeHairPattern = useCallback((faceAnalysis: FaceAnalysis) => {
    if (!faceAnalysis || !faceAnalysis.faceDetected) {
      setHairDensity(0);
      setRecedingHairline(false);
      setHairlineScore(0);
      return;
    }

    // Saç çizgisi analizi
    const { foreheadExposure, landmarks } = faceAnalysis;
    
    // Basit saç yoğunluğu hesaplaması (gerçek ML modeli gerektirir)
    const density = Math.max(0, Math.min(1, 1 - foreheadExposure));
    
    // Çekilme analizi
    const receding = foreheadExposure > 0.25;
    
    // Saç çizgisi skoru
    const score = Math.round((1 - foreheadExposure) * 100);

    setHairDensity(density);
    setRecedingHairline(receding);
    setHairlineScore(score);
  }, []);

  return {
    hairDensity,
    recedingHairline,
    hairlineScore,
    analyzeHairPattern,
  };
};