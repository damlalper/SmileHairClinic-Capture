/**
 * ═══════════════════════════════════════════════════════════════════
 * ADVANCED CAPTURE INTELLIGENCE - MASTER SİSTEM
 * ═══════════════════════════════════════════════════════════════════
 *
 * 7 Koşullu Otomatik Deklanşör + Angle Confidence Score
 * Profesyonel seviye AI destekli kamera modülü
 *
 * Dokümantasyon: advanced-capture-try.md
 */

import { HeadPoseEstimate, isHeadPoseStable } from './hybridHeadPose';
import { PhoneOrientation } from './advancedSensorFusion';
import { DistanceEstimate } from './advancedDistanceEstimation';
import { IoUResult } from './silhouetteMatching';
import { LightingAnalysis } from './lightQualityAnalysis';
import {
  CONFIDENCE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  AUTO_SHUTTER_CONDITIONS,
  OPTICAL_FLOW,
} from '../constants/angles';

// ═══════════════════════════════════════════════════════════════════
// TİPLER VE ARAYÜZLER
// ═══════════════════════════════════════════════════════════════════

export interface CaptureConditions {
  headAngleValid: boolean;      // 1) Baş açısı doğru
  phoneAngleValid: boolean;     // 2) Telefon açısı doğru
  regionCorrect: boolean;       // 3) Bölge doğru yerde
  distanceValid: boolean;       // 4) Mesafe uygun
  lightingOk: boolean;          // 5) Işık yeterli
  maskStable: boolean;          // 6) Segmentasyon maskesi stabil (0.5-1s)
  angleJitterLow: boolean;      // 7) Açı jitter < ±2°
}

export interface AngleConfidenceScore {
  overall: number;              // Master skor (0-1)
  poseScore: number;            // Head pose skoru
  phoneAngleScore: number;      // Telefon açısı skoru
  centeringScore: number;       // Kadraj merkez skoru
  distanceScore: number;        // Mesafe skoru
  regionMatchScore: number;     // Bölge eşleşme (IoU) skoru
  qualityScore: number;         // Işık/Netlik skoru

  level: 'PERFECT' | 'AUTO_CAPTURE' | 'USER_GUIDANCE' | 'REJECT';
  percentage: number;           // Yüzde olarak (0-100)
  feedback: string;             // Kullanıcı geri bildirimi
}

export interface AutoShutterState {
  ready: boolean;               // Otomatik çekim hazır mı?
  countdown: number | null;     // Geri sayım (null = başlamadı)
  conditions: CaptureConditions;
  confidenceScore: AngleConfidenceScore;
  blockers: string[];           // Çekimi engelleyen faktörler
}

export interface CaptureMetrics {
  headPose: HeadPoseEstimate;
  phoneOrientation: PhoneOrientation;
  distance: DistanceEstimate;
  iou: IoUResult | null;
  lighting: LightingAnalysis;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════
// ANGLE CONFIDENCE SCORE HESAPLAMA
// ═══════════════════════════════════════════════════════════════════

/**
 * Master kalite skoru hesaplama (0-1 arası)
 *
 * score = (pose_score × 0.35)
 *       + (phone_angle_score × 0.25)
 *       + (centering_score × 0.15)
 *       + (distance_score × 0.10)
 *       + (region_match_score × 0.10)
 *       + (quality_score × 0.05)
 */
export const calculateAngleConfidenceScore = (
  metrics: CaptureMetrics,
  centeringValid: boolean = true
): AngleConfidenceScore => {
  // 1) HEAD POSE SCORE
  const poseScore = metrics.headPose.confidence;

  // 2) PHONE ANGLE SCORE
  const phoneAngleScore = metrics.phoneOrientation.confidence;

  // 3) CENTERING SCORE
  const centeringScore = centeringValid ? 1.0 : 0.5;

  // 4) DISTANCE SCORE
  const distanceScore = metrics.distance.isInRange
    ? metrics.distance.confidence
    : 0.3;

  // 5) REGION MATCH SCORE (IoU)
  const regionMatchScore = metrics.iou
    ? metrics.iou.iou
    : 0.7; // Varsayılan (IoU yoksa)

  // 6) QUALITY SCORE (Işık)
  const qualityScore = metrics.lighting.score / 100;

  // AĞIRLIKLI TOPLAM
  const overall =
    poseScore * CONFIDENCE_WEIGHTS.poseScore +
    phoneAngleScore * CONFIDENCE_WEIGHTS.phoneAngleScore +
    centeringScore * CONFIDENCE_WEIGHTS.centeringScore +
    distanceScore * CONFIDENCE_WEIGHTS.distanceScore +
    regionMatchScore * CONFIDENCE_WEIGHTS.regionMatchScore +
    qualityScore * CONFIDENCE_WEIGHTS.qualityScore;

  // LEVEL BELİRLE
  let level: 'PERFECT' | 'AUTO_CAPTURE' | 'USER_GUIDANCE' | 'REJECT';
  let feedback: string;

  if (overall >= CONFIDENCE_THRESHOLDS.PERFECT) {
    level = 'PERFECT';
    feedback = 'Mükemmel! Fotoğraf çekilmeye hazır.';
  } else if (overall >= CONFIDENCE_THRESHOLDS.AUTO_CAPTURE) {
    level = 'AUTO_CAPTURE';
    feedback = 'Çok iyi! Pozisyonu koruyun.';
  } else if (overall >= CONFIDENCE_THRESHOLDS.USER_GUIDANCE) {
    level = 'USER_GUIDANCE';
    feedback = 'İyi, devam edin.';
  } else {
    level = 'REJECT';
    feedback = 'Pozisyon uygun değil.';
  }

  return {
    overall,
    poseScore,
    phoneAngleScore,
    centeringScore,
    distanceScore,
    regionMatchScore,
    qualityScore,
    level,
    percentage: overall * 100,
    feedback,
  };
};

// ═══════════════════════════════════════════════════════════════════
// 7 KOŞULLU OTOMATİK DEKLANŞÖR
// ═══════════════════════════════════════════════════════════════════

/**
 * Otomatik çekim koşullarını kontrol et
 */
export const evaluateCaptureConditions = (
  metrics: CaptureMetrics,
  targetHeadPose: {
    yaw: [number, number];
    pitch: [number, number];
    roll: [number, number];
  },
  targetPhonePitch: number,
  targetPhoneRoll: number,
  phoneTolerance: number,
  centeringValid: boolean = true,
  regionRequired: boolean = false
): CaptureConditions => {
  // 1) BAŞ AÇISI DOĞRU
  const headAngleValid =
    metrics.headPose.yaw >= targetHeadPose.yaw[0] &&
    metrics.headPose.yaw <= targetHeadPose.yaw[1] &&
    metrics.headPose.pitch >= targetHeadPose.pitch[0] &&
    metrics.headPose.pitch <= targetHeadPose.pitch[1] &&
    metrics.headPose.roll >= targetHeadPose.roll[0] &&
    metrics.headPose.roll <= targetHeadPose.roll[1];

  // 2) TELEFON AÇISI DOĞRU
  const phoneAngleValid =
    Math.abs(metrics.phoneOrientation.pitch - targetPhonePitch) <= phoneTolerance &&
    Math.abs(metrics.phoneOrientation.roll - targetPhoneRoll) <= phoneTolerance;

  // 3) BÖLGE DOĞRU YERDE
  const regionCorrect = regionRequired
    ? metrics.iou !== null && metrics.iou.aligned
    : true;

  // 4) MESAFE UYGUN
  const distanceValid = metrics.distance.isInRange;

  // 5) IŞIK YETERLİ
  const lightingOk = metrics.lighting.score >= 70;

  // 6) SEGMENTATİON MASKESİ STABİL (0.5-1s)
  const maskStable = metrics.iou !== null && metrics.iou.quality !== 'POOR';

  // 7) AÇI JITTER < ±2°
  const angleJitterLow = isHeadPoseStable();

  return {
    headAngleValid,
    phoneAngleValid,
    regionCorrect,
    distanceValid,
    lightingOk,
    maskStable,
    angleJitterLow,
  };
};

/**
 * Tüm koşullar sağlandı mı?
 */
export const areAllConditionsMet = (conditions: CaptureConditions): boolean => {
  return (
    conditions.headAngleValid &&
    conditions.phoneAngleValid &&
    conditions.regionCorrect &&
    conditions.distanceValid &&
    conditions.lightingOk &&
    conditions.maskStable &&
    conditions.angleJitterLow
  );
};

/**
 * Otomatik çekim durumunu değerlendir
 */
export const evaluateAutoShutter = (
  metrics: CaptureMetrics,
  targetHeadPose: {
    yaw: [number, number];
    pitch: [number, number];
    roll: [number, number];
  },
  targetPhonePitch: number,
  targetPhoneRoll: number,
  phoneTolerance: number,
  centeringValid: boolean = true,
  regionRequired: boolean = false
): AutoShutterState => {
  // Koşulları değerlendir
  const conditions = evaluateCaptureConditions(
    metrics,
    targetHeadPose,
    targetPhonePitch,
    targetPhoneRoll,
    phoneTolerance,
    centeringValid,
    regionRequired
  );

  // Confidence score hesapla
  const confidenceScore = calculateAngleConfidenceScore(metrics, centeringValid);

  // Tüm koşullar sağlandı mı?
  const allMet = areAllConditionsMet(conditions);

  // Güven skoru yeterli mi?
  const confidentEnough = confidenceScore.overall >= CONFIDENCE_THRESHOLDS.AUTO_CAPTURE;

  // Otomatik çekim hazır
  const ready = allMet && confidentEnough;

  // Engelleri listele
  const blockers: string[] = [];
  if (!conditions.headAngleValid) blockers.push('Baş açısı uygun değil');
  if (!conditions.phoneAngleValid) blockers.push('Telefon açısı uygun değil');
  if (!conditions.regionCorrect) blockers.push('Bölge merkeze hizalı değil');
  if (!conditions.distanceValid) blockers.push(metrics.distance.recommendation);
  if (!conditions.lightingOk) blockers.push(metrics.lighting.recommendation);
  if (!conditions.maskStable) blockers.push('Görüntü stabil değil');
  if (!conditions.angleJitterLow) blockers.push('Hareket fazla, sabit durun');

  if (!confidentEnough && blockers.length === 0) {
    blockers.push('Pozisyon kalitesi yetersiz');
  }

  return {
    ready,
    countdown: ready ? 3 : null, // Eğer hazırsa 3 saniye geri sayım
    conditions,
    confidenceScore,
    blockers,
  };
};

// ═══════════════════════════════════════════════════════════════════
// GERİ BİLDİRİM OLUŞTURMA
// ═══════════════════════════════════════════════════════════════════

/**
 * Kullanıcıya akıllı geri bildirim oluştur
 * En kritik sorunu önceliklendir
 */
export const generateSmartFeedback = (shutterState: AutoShutterState): string => {
  if (shutterState.ready) {
    return 'Harika! Fotoğraf çekiliyor...';
  }

  if (shutterState.blockers.length === 0) {
    return 'Pozisyon kontrol ediliyor...';
  }

  // En kritik engeli göster
  const criticalBlocker = shutterState.blockers[0];

  // Confidence score'a göre ek bilgi
  if (shutterState.confidenceScore.overall < 0.5) {
    return `${criticalBlocker}. Kalite: %${Math.round(
      shutterState.confidenceScore.percentage
    )}`;
  }

  return criticalBlocker;
};

/**
 * Detaylı feedback mesajı (debug/analiz için)
 */
export const generateDetailedFeedback = (
  shutterState: AutoShutterState
): {
  summary: string;
  conditions: Record<string, boolean>;
  scores: Record<string, number>;
  recommendations: string[];
} => {
  const { conditions, confidenceScore, blockers } = shutterState;

  return {
    summary: generateSmartFeedback(shutterState),
    conditions: {
      'Baş Açısı': conditions.headAngleValid,
      'Telefon Açısı': conditions.phoneAngleValid,
      'Bölge': conditions.regionCorrect,
      'Mesafe': conditions.distanceValid,
      'Işık': conditions.lightingOk,
      'Stabilite': conditions.maskStable,
      'Jitter': conditions.angleJitterLow,
    },
    scores: {
      'Toplam': confidenceScore.overall,
      'Head Pose': confidenceScore.poseScore,
      'Telefon': confidenceScore.phoneAngleScore,
      'Merkez': confidenceScore.centeringScore,
      'Mesafe': confidenceScore.distanceScore,
      'Bölge': confidenceScore.regionMatchScore,
      'Kalite': confidenceScore.qualityScore,
    },
    recommendations: blockers,
  };
};

// ═══════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════

/**
 * Confidence score rengini belirle (UI için)
 */
export const getConfidenceColor = (score: number): string => {
  if (score >= CONFIDENCE_THRESHOLDS.PERFECT) return '#00FF00'; // Yeşil
  if (score >= CONFIDENCE_THRESHOLDS.AUTO_CAPTURE) return '#8BC34A'; // Açık yeşil
  if (score >= CONFIDENCE_THRESHOLDS.USER_GUIDANCE) return '#FFA500'; // Turuncu
  return '#F44336'; // Kırmızı
};

/**
 * Progress bar değeri hesapla (0-100)
 */
export const calculateProgressValue = (
  confidenceScore: AngleConfidenceScore
): number => {
  return Math.round(confidenceScore.percentage);
};
