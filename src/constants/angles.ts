import { CaptureAngle, AngleConfig } from '../types';

/**
 * 5 Temel Çekim Açısı - Profesyonel Saç Görüntüleme Sistemi
 * Dokümantasyon: 5-anglecapture.md ve advanced-capture-try.md
 */
export const ANGLE_CONFIGS: Record<CaptureAngle, AngleConfig> = {
  // ═══════════════════════════════════════════════════════════════════
  // AÇI 1 - TAM YÜZ KARŞIDAN (0° ÖN ÇEKİM) - GÜNCELLENMİŞ KURALLAR
  // ═══════════════════════════════════════════════════════════════════
  [CaptureAngle.FRONT]: {
    id: CaptureAngle.FRONT,
    title: 'Tam Yüz Karşıdan',
    description: 'Yüzün tamamı - 0° ön çekim',
    targetArea: 'Yüzün tamamı kadrajda olmalı',
    instructions: 'Telefonu yere paralel tutun. Kameraya düz bakın. Yüzünüz merkeze hizalı olmalı.',

    // HEAD POSE VALIDATION (GÜNCELLENDİ)
    faceRequirements: {
      yawRange: [-4, 4],      // Yatay dönüş: -4° ~ +4° (daha sıkı)
      pitchRange: [-6, 6],    // Dikey eğim: -6° ~ +6° (daha sıkı)
      rollRange: [-3, 3],     // Yan eğim: -3° ~ +3° (değişmedi)
    },

    // KAMERA AÇISI (Telefon Sensörlerinden)
    phoneAngle: {
      pitch: 0,               // Telefon yere paralel (0°)
      roll: 0,                // Roll 0°
      yaw: 0,                 // Yaw 0°
      tolerance: 5,           // ±5° tolerans
    },

    // MESAFE (Yüz Bounding Box %25-40 oranı)
    distanceRange: {
      min: 25,                // Görüntünün %25'i
      max: 40,                // Görüntünün %40'ı
    },
    
    // YENİ: IoU MERKEZLEME (daha hassas)
    iouThreshold: 0.75,       // Yüzün, merkezdeki hedef alanla IoU eşleşmesi > %75 olmalı

    // YENİ: STABİLİZASYON SÜRESİ
    stabilityDuration: 1200,  // Kurallar 1.2 saniye boyunca stabil kalmalı

    validationStrategy: 'FACE_DETECTION',
  },

  // ═══════════════════════════════════════════════════════════════════
  // AÇI 2 - 45° SAĞ PROFİL
  // ═══════════════════════════════════════════════════════════════════
  [CaptureAngle.RIGHT_45]: {
    id: CaptureAngle.RIGHT_45,
    title: '45° Sağ Profil',
    description: 'Yüzün ön + sağ yan kısmı',
    targetArea: 'Başınızı sağa çevirin',
    instructions: 'Başınızı 45° sağa çevirin. Telefon düz kalmalı. Sağ profiliniz görünmeli.',

    // HEAD POSE VALIDATION
    faceRequirements: {
      yawRange: [40, 50],     // Başı sağa çevir: +40° ~ +50°
      pitchRange: [-5, 5],    // Dikey eğim minimal
      rollRange: [-5, 5],     // Yan eğim minimal
    },

    // KAMERA AÇISI
    phoneAngle: {
      pitch: 0,               // Telefon düz
      roll: 0,
      yaw: 0,                 // Telefon düz (kullanıcı başını çevirir)
      tolerance: 5,
    },

    // MESAFE
    distanceRange: {
      min: 20,                // %20
      max: 35,                // %35
    },

    // KADRAJ MERKEZLİĞİ
    centeringTolerance: 15,   // ±%15 tolerans

    validationStrategy: 'FACE_DETECTION',
  },

  // ═══════════════════════════════════════════════════════════════════
  // AÇI 3 - 45° SOL PROFİL
  // ═══════════════════════════════════════════════════════════════════
  [CaptureAngle.LEFT_45]: {
    id: CaptureAngle.LEFT_45,
    title: '45° Sol Profil',
    description: 'Yüzün ön + sol yan kısmı',
    targetArea: 'Başınızı sola çevirin',
    instructions: 'Başınızı 45° sola çevirin. Telefon düz kalmalı. Sol profiliniz görünmeli.',

    // HEAD POSE VALIDATION
    faceRequirements: {
      yawRange: [-50, -40],   // Başı sola çevir: -40° ~ -50°
      pitchRange: [-5, 5],
      rollRange: [-5, 5],
    },

    // KAMERA AÇISI
    phoneAngle: {
      pitch: 0,
      roll: 0,
      yaw: 0,
      tolerance: 5,
    },

    // MESAFE
    distanceRange: {
      min: 20,
      max: 35,
    },

    // KADRAJ MERKEZLİĞİ
    centeringTolerance: 15,

    validationStrategy: 'FACE_DETECTION',
  },

  // ═══════════════════════════════════════════════════════════════════
  // AÇI 4 - TEPE (VERTEX) - KRİTİK ÇEKİM
  // ═══════════════════════════════════════════════════════════════════
  [CaptureAngle.VERTEX]: {
    id: CaptureAngle.VERTEX,
    title: 'Tepe (Vertex)',
    description: 'Kafa tepe noktası - üstten görünüm',
    targetArea: 'Başınızın tepesi',
    instructions: 'KRİTİK: Telefonu başınızın üzerinde tutun. Kamera aşağı bakmalı. Tepe noktası merkezde olmalı.',

    // TELEFON AÇISI (Tepe için yüz algılama yok - sadece sensör)
    phoneAngle: {
      pitch: -85,             // Telefon pitch: -85° ~ -95° (neredeyse tamamen aşağı)
      pitchMax: -95,
      roll: 0,
      yaw: 0,
      tolerance: 5,           // ±5° tolerans
    },

    // MESAFE (Kafa derisi alanı %30-50)
    distanceRange: {
      min: 30,
      max: 50,
    },

    // SİMETRİ (Tepe noktası yatay eksende merkezde)
    centeringTolerance: 10,   // ±%10 kayma

    // BÖLGE ALGILA MA (Vertex segmentation maskesi gerekli)
    regionDetection: {
      required: true,
      targetRegion: 'VERTEX',
      minConfidence: 0.85,    // %85 güven skoru
      centerAreaThreshold: 40, // Kadraj merkezinin %40'lık alanında
    },

    validationStrategy: 'SENSOR_ONLY',
  },

  // ═══════════════════════════════════════════════════════════════════
  // AÇI 5 - ARKA DONÖR (ENSE BÖLGESİ) - KRİTİK ÇEKİM
  // ═══════════════════════════════════════════════════════════════════
  [CaptureAngle.BACK_DONOR]: {
    id: CaptureAngle.BACK_DONOR,
    title: 'Arka Donör (Ense)',
    description: 'Ense üstü + arka yan bölgeler',
    targetArea: 'Başınızın arkası',
    instructions: 'KRİTİK: Telefonu arkaya götürün. Kamera enseye bakmalı. Ense merkeze hizalı olmalı.',

    // TELEFON AÇISI
    phoneAngle: {
      pitch: -85,             // Telefon pitch: -85° ~ -100°
      pitchMax: -100,
      roll: 0,
      yaw: 180,               // Telefon arkaya dönük (180°)
      tolerance: 10,          // ±10° tolerans
    },

    // MESAFE (Ense bölgesi %30-50)
    distanceRange: {
      min: 30,
      max: 50,
    },

    // KADRAJ MERKEZLİĞİ
    centeringTolerance: 20,   // ±%20 tolerans

    // BÖLGE ALGILA MA
    regionDetection: {
      required: true,
      targetRegion: 'OCCIPITAL',
      minConfidence: 0.85,    // %85 güven skoru
      centerAreaThreshold: 20,
    },

    // STABİLİTE (Titreme önleme)
    stabilityDuration: 800,   // 0.8 saniye boyunca stabil

    validationStrategy: 'SENSOR_ONLY',
  },
};

// Capture sequence order
export const CAPTURE_SEQUENCE: CaptureAngle[] = [
  CaptureAngle.FRONT,
  CaptureAngle.RIGHT_45,
  CaptureAngle.LEFT_45,
  CaptureAngle.VERTEX,
  CaptureAngle.BACK_DONOR,
];

// ═══════════════════════════════════════════════════════════════════
// ADVANCED CAPTURE INTELLIGENCE - PROFESYONEL SEVİYE SABITLER
// ═══════════════════════════════════════════════════════════════════

/**
 * Angle Confidence Score Ağırlıkları
 * 0.0-1.0 arası master kalite skoru hesaplama
 */
export const CONFIDENCE_WEIGHTS = {
  poseScore: 0.35,           // Head pose doğruluğu
  phoneAngleScore: 0.25,     // Telefon açısı doğruluğu
  centeringScore: 0.15,      // Kadraj merkezliği
  distanceScore: 0.10,       // Mesafe uygunluğu
  regionMatchScore: 0.10,    // Bölge eşleşme skoru (IoU)
  qualityScore: 0.05,        // Işık/Netlik kalitesi
};

/**
 * Angle Confidence Score Eşikleri
 */
export const CONFIDENCE_THRESHOLDS = {
  AUTO_CAPTURE: 0.85,        // Otomatik çekim yapılabilir
  USER_GUIDANCE: 0.70,       // Kullanıcı yönlendirilmeli
  REJECT: 0.70,              // Bu değerin altı reddedilir
  PERFECT: 0.95,             // Mükemmel çekim
};

/**
 * 7 Koşullu Otomatik Deklanşör Sistemi
 */
export const AUTO_SHUTTER_CONDITIONS = {
  HEAD_ANGLE_VALID: true,    // 1) Baş açısı doğru
  PHONE_ANGLE_VALID: true,   // 2) Telefon açısı doğru
  REGION_CORRECT: true,      // 3) Bölge doğru yerde
  DISTANCE_VALID: true,      // 4) Mesafe uygun
  LIGHTING_OK: true,         // 5) Işık yeterli
  MASK_STABLE: true,         // 6) Segmentasyon maskesi stabil (0.5-1s)
  ANGLE_JITTER_LOW: true,    // 7) Açı jitter < ±2° (Optical flow kontrol)
};

/**
 * Işık Kalitesi Kontrol Eşikleri
 */
export const LIGHT_QUALITY = {
  MIN_BRIGHTNESS: 0.3,       // Minimum parlaklık
  MAX_BRIGHTNESS: 0.9,       // Maksimum parlaklık (aşırı pozlama)
  MAX_HIGHLIGHT_SAT: 0.10,   // Maksimum highlight saturation %10
  MAX_SHADOW_SIZE: 0.40,     // Maksimum gölge bölgesi %40
  IDEAL_BRIGHTNESS: 0.6,     // İdeal parlaklık
};

/**
 * Mesafe Ölçüm Sabitleri
 * Optik formül: distance = (real_width × focal_length) / bbox_width
 */
export const DISTANCE_ESTIMATION = {
  AVERAGE_HEAD_WIDTH_CM: 16.5,    // Ortalama insan yüzü genişliği (cm)
  AVERAGE_HEAD_HEIGHT_CM: 22.0,   // Ortalama insan yüzü yüksekliği (cm)
  FOCAL_LENGTH_MM: 4.0,            // Tipik mobil kamera focal length (mm)
  SENSOR_WIDTH_MM: 5.76,           // Tipik mobil sensor genişliği (mm)
  MIN_CONFIDENCE: 0.95,            // %95 mesafe doğruluğu hedefi
};

/**
 * IoU (Intersection Over Union) Eşikleri
 * Silüet-Maske Eşleşmesi için
 */
export const IOU_THRESHOLDS = {
  ACCEPTABLE: 0.55,          // IoU > 0.55 → DOĞRU
  PERFECT: 0.70,             // IoU > 0.70 → MÜKEMMEL
  MINIMUM: 0.45,             // Minimum kabul edilebilir
};

/**
 * Optical Flow Stabilization Sabitleri
 */
export const OPTICAL_FLOW = {
  WINDOW_DURATION_MS: 500,   // 0.5 saniye zaman penceresi
  MAX_JITTER_DEGREES: 2,     // Maksimum jitter ±2°
  SMOOTHING_FACTOR: 0.3,     // Yumuşatma faktörü
  MIN_STABLE_FRAMES: 15,     // Minimum stabil frame sayısı
};

/**
 * Sensor Fusion Sabitleri
 * Gyroscope + Accelerometer + Kalman Filter
 */
export const SENSOR_FUSION = {
  GYRO_WEIGHT: 0.7,          // Gyroscope ağırlığı
  ACCEL_WEIGHT: 0.3,         // Accelerometer ağırlığı
  KALMAN_Q: 0.001,           // Process noise covariance
  KALMAN_R: 0.01,            // Measurement noise covariance
  PITCH_ACCURACY: 2,         // ±2° pitch doğruluğu
  ROLL_ACCURACY: 1,          // ±1° roll doğruluğu
  UPDATE_FREQUENCY_HZ: 60,   // 60 Hz güncelleme frekansı
};

/**
 * Bölge Sınıflandırma (Region Classification)
 */
export const REGION_CLASSIFICATION = {
  VERTEX: 'VERTEX',          // Tepe
  OCCIPITAL: 'OCCIPITAL',    // Arka kafa / Ense
  PARIETAL: 'PARIETAL',      // Yan üst bölge
  TEMPORAL: 'TEMPORAL',      // Şakak bölgesi
  FRONTAL: 'FRONTAL',        // Alın
  MIN_CONFIDENCE: 0.85,      // %85 minimum güven
  ACCURACY_TARGET: 0.90,     // %90+ doğruluk hedefi
};

/**
 * Stabilite ve Timeout Sabitleri
 */
export const STABILITY = {
  MIN_DURATION_MS: 500,      // Minimum stabilite süresi (0.5s)
  MAX_DURATION_MS: 1000,     // Maksimum stabilite süresi (1s)
  POSITION_TIMEOUT_MS: 3000, // Pozisyon timeout (3s)
  MAX_DEVIATION_PX: 10,      // Maksimum piksel sapması
};

/**
 * Feedback ve UI Sabitleri
 */
export const FEEDBACK = {
  BEEP_INTERVAL_MS: 100,     // Bip interval (100ms)
  COUNTDOWN_DURATION: 3,     // Geri sayım süresi (3 saniye)
  SUCCESS_VIBRATION_MS: 200, // Başarı titreşimi
  MIN_DETECTION_INTERVAL: 100, // Minimum algılama aralığı
};

// Color constants
export const COLORS = {
  primary: '#2E5090', // Smile Hair Clinic blue
  secondary: '#00A3E0',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  background: '#FFFFFF',
  text: '#333333',
  textLight: '#757575',
  overlay: 'rgba(0, 0, 0, 0.6)',
  guideLine: '#00FF00',
  guideLineValid: '#00FF00',      // Yeşil - Geçerli
  guideLineInvalid: '#FF0000',    // Kırmızı - Geçersiz
  guideLineWarning: '#FFA500',    // Turuncu - Uyarı
};
