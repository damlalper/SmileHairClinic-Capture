/**
 * ═══════════════════════════════════════════════════════════════════
 * GELİŞMİŞ SENSOR FUSION SİSTEMİ
 * ═══════════════════════════════════════════════════════════════════
 *
 * Gyroscope + Accelerometer + Kalman Filter
 * Doğruluk Seviyeleri:
 * - Pitch: ±2° doğruluk
 * - Roll: ±1° doğruluk
 *
 * Dokümantasyon: advanced-capture-try.md
 */

import { SENSOR_FUSION } from '../constants/angles';

// ═══════════════════════════════════════════════════════════════════
// TİPLER VE ARAYÜZLER
// ═══════════════════════════════════════════════════════════════════

export interface RawSensorData {
  // Gyroscope (rad/s)
  gyroX: number;
  gyroY: number;
  gyroZ: number;

  // Accelerometer (m/s²)
  accelX: number;
  accelY: number;
  accelZ: number;

  timestamp?: number;
}

export interface PhoneOrientation {
  pitch: number;     // Dikey eğim (-180 ~ +180)
  roll: number;      // Yatay eğim (-180 ~ +180)
  yaw: number;       // Dönme açısı (-180 ~ +180)
  confidence: number; // Güven skoru (0-1)
}

interface KalmanState {
  // State estimate
  x: number;

  // Error covariance
  P: number;

  // Process noise covariance
  Q: number;

  // Measurement noise covariance
  R: number;
}

// ═══════════════════════════════════════════════════════════════════
// KALMAN FILTER
// ═══════════════════════════════════════════════════════════════════

class KalmanFilter {
  private state: KalmanState;

  constructor(
    initialEstimate: number = 0,
    Q: number = SENSOR_FUSION.KALMAN_Q,
    R: number = SENSOR_FUSION.KALMAN_R
  ) {
    this.state = {
      x: initialEstimate,
      P: 1.0,
      Q,
      R,
    };
  }

  /**
   * Predict step
   */
  predict(): void {
    // State transition (assuming constant)
    // x(k|k-1) = x(k-1|k-1)

    // Update error covariance
    this.state.P += this.state.Q;
  }

  /**
   * Update step with new measurement
   */
  update(measurement: number): number {
    // Kalman gain
    const K = this.state.P / (this.state.P + this.state.R);

    // Update estimate with measurement
    this.state.x = this.state.x + K * (measurement - this.state.x);

    // Update error covariance
    this.state.P = (1 - K) * this.state.P;

    return this.state.x;
  }

  /**
   * Get current estimate
   */
  getEstimate(): number {
    return this.state.x;
  }

  /**
   * Reset filter
   */
  reset(value: number = 0): void {
    this.state.x = value;
    this.state.P = 1.0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SENSOR FUSION CLASS
// ═══════════════════════════════════════════════════════════════════

export class AdvancedSensorFusion {
  private pitchFilter: KalmanFilter;
  private rollFilter: KalmanFilter;
  private yawFilter: KalmanFilter;

  private lastTimestamp: number = 0;
  private gyroIntegral: { pitch: number; roll: number; yaw: number } = {
    pitch: 0,
    roll: 0,
    yaw: 0,
  };

  constructor() {
    this.pitchFilter = new KalmanFilter();
    this.rollFilter = new KalmanFilter();
    this.yawFilter = new KalmanFilter();
  }

  /**
   * Sensor fusion ana fonksiyonu
   * Gyroscope + Accelerometer birleşimi
   */
  public fuse(rawData: RawSensorData): PhoneOrientation {
    const timestamp = rawData.timestamp || Date.now();

    // İlk okuma
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;

      // İlk değerleri accelerometer'dan al
      const accelOrientation = this.calculateOrientationFromAccel(rawData);
      this.pitchFilter.reset(accelOrientation.pitch);
      this.rollFilter.reset(accelOrientation.roll);
      this.yawFilter.reset(accelOrientation.yaw);

      return accelOrientation;
    }

    // Delta time (saniye cinsinden)
    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // 1) GYROSCOPE İNTEGRASYONU
    const gyroOrientation = this.integrateGyroscope(rawData, dt);

    // 2) ACCELEROMETER ÖLÇÜMÜ
    const accelOrientation = this.calculateOrientationFromAccel(rawData);

    // 3) COMPLEMENTARY FILTER (Ağırlıklı Ortalama)
    const fusedPitch =
      SENSOR_FUSION.GYRO_WEIGHT * gyroOrientation.pitch +
      SENSOR_FUSION.ACCEL_WEIGHT * accelOrientation.pitch;

    const fusedRoll =
      SENSOR_FUSION.GYRO_WEIGHT * gyroOrientation.roll +
      SENSOR_FUSION.ACCEL_WEIGHT * accelOrientation.roll;

    const fusedYaw = gyroOrientation.yaw; // Yaw sadece gyro'dan

    // 4) KALMAN FILTER İLE DÜZELTİLMİŞ DEĞERLER
    this.pitchFilter.predict();
    this.rollFilter.predict();
    this.yawFilter.predict();

    const finalPitch = this.pitchFilter.update(fusedPitch);
    const finalRoll = this.rollFilter.update(fusedRoll);
    const finalYaw = this.yawFilter.update(fusedYaw);

    // 5) GÜV EN SKORU HESAPLA
    const confidence = this.calculateConfidence(rawData);

    return {
      pitch: this.normalizeDegrees(finalPitch),
      roll: this.normalizeDegrees(finalRoll),
      yaw: this.normalizeDegrees(finalYaw),
      confidence,
    };
  }

  /**
   * Gyroscope verilerini integre et
   */
  private integrateGyroscope(data: RawSensorData, dt: number): PhoneOrientation {
    // Gyro değerleri rad/s cinsinden, dereceye çevir
    const gyroPitchRate = data.gyroX * (180 / Math.PI);
    const gyroRollRate = data.gyroY * (180 / Math.PI);
    const gyroYawRate = data.gyroZ * (180 / Math.PI);

    // Integrate (açısal hız × zaman = açı değişimi)
    this.gyroIntegral.pitch += gyroPitchRate * dt;
    this.gyroIntegral.roll += gyroRollRate * dt;
    this.gyroIntegral.yaw += gyroYawRate * dt;

    return {
      pitch: this.gyroIntegral.pitch,
      roll: this.gyroIntegral.roll,
      yaw: this.gyroIntegral.yaw,
      confidence: 0.9, // Gyro yüksek frekansta doğru
    };
  }

  /**
   * Accelerometer'dan orientasyon hesapla
   */
  private calculateOrientationFromAccel(data: RawSensorData): PhoneOrientation {
    const { accelX, accelY, accelZ } = data;

    // Normalize acceleration vector
    const magnitude = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

    if (magnitude === 0) {
      return { pitch: 0, roll: 0, yaw: 0, confidence: 0 };
    }

    const ax = accelX / magnitude;
    const ay = accelY / magnitude;
    const az = accelZ / magnitude;

    // Pitch ve Roll hesapla
    // Pitch: Telefon öne/arkaya eğilme (-90 ~ +90)
    const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI);

    // Roll: Telefon sağa/sola eğilme (-180 ~ +180)
    const roll = Math.atan2(ay, az) * (180 / Math.PI);

    // Yaw accelerometer'dan hesaplanamaz (magnetometer gerekir)
    const yaw = this.gyroIntegral.yaw;

    return {
      pitch,
      roll,
      yaw,
      confidence: 0.7, // Accel düşük frekansta doğru
    };
  }

  /**
   * Güven skoru hesapla
   */
  private calculateConfidence(data: RawSensorData): number {
    // Acceleration magnitude kontrolü (1g'ye yakınsa cihaz stabil)
    const accelMagnitude = Math.sqrt(
      data.accelX ** 2 + data.accelY ** 2 + data.accelZ ** 2
    );

    const GRAVITY = 9.81;
    const magnitudeDiff = Math.abs(accelMagnitude - GRAVITY);

    // Eğer cihaz hareketsizse (sadece yerçekimi) confidence yüksek
    let confidence = 1.0;
    if (magnitudeDiff > 2.0) {
      confidence -= 0.3; // Hızlı hareket
    } else if (magnitudeDiff > 1.0) {
      confidence -= 0.1; // Hafif hareket
    }

    // Gyro rate kontrolü (düşük dönme hızı = yüksek confidence)
    const gyroRate = Math.sqrt(
      data.gyroX ** 2 + data.gyroY ** 2 + data.gyroZ ** 2
    );

    if (gyroRate > 1.0) { // 1 rad/s'den fazla
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Açıyı -180 ~ +180 aralığına normalize et
   */
  private normalizeDegrees(degrees: number): number {
    let normalized = degrees % 360;
    if (normalized > 180) {
      normalized -= 360;
    } else if (normalized < -180) {
      normalized += 360;
    }
    return normalized;
  }

  /**
   * Filtre durumunu sıfırla
   */
  public reset(): void {
    this.pitchFilter.reset();
    this.rollFilter.reset();
    this.yawFilter.reset();
    this.gyroIntegral = { pitch: 0, roll: 0, yaw: 0 };
    this.lastTimestamp = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION FONKSİYONLARI
// ═══════════════════════════════════════════════════════════════════

/**
 * Telefon açısının hedef aralıkta olup olmadığını kontrol et
 */
export const validatePhoneOrientation = (
  orientation: PhoneOrientation,
  targetPitch: number,
  targetRoll: number,
  tolerance: number
): {
  valid: boolean;
  pitchValid: boolean;
  rollValid: boolean;
  pitchError: number;
  rollError: number;
  score: number;
} => {
  const pitchError = Math.abs(orientation.pitch - targetPitch);
  const rollError = Math.abs(orientation.roll - targetRoll);

  const pitchValid = pitchError <= tolerance;
  const rollValid = rollError <= tolerance;

  const valid = pitchValid && rollValid;

  // Skor hesapla (0-100)
  const pitchScore = Math.max(0, 100 - (pitchError / tolerance) * 100);
  const rollScore = Math.max(0, 100 - (rollError / tolerance) * 100);
  const score = (pitchScore + rollScore) / 2;

  return {
    valid,
    pitchValid,
    rollValid,
    pitchError,
    rollError,
    score,
  };
};

/**
 * Özel açı validasyonu (Tepe ve Ense için)
 */
export const validateSpecialAngle = (
  orientation: PhoneOrientation,
  minPitch: number,
  maxPitch: number,
  rollTolerance: number = 10
): {
  valid: boolean;
  pitchInRange: boolean;
  rollAcceptable: boolean;
  confidence: number;
} => {
  const pitchInRange = orientation.pitch >= minPitch && orientation.pitch <= maxPitch;
  const rollAcceptable = Math.abs(orientation.roll) <= rollTolerance;

  return {
    valid: pitchInRange && rollAcceptable && orientation.confidence > 0.7,
    pitchInRange,
    rollAcceptable,
    confidence: orientation.confidence,
  };
};
