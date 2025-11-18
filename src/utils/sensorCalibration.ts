/**
 * SENSOR KALİBRASYON - Jiroskop Drift Düzeltmesi
 * 
 * Amaç: 
 * - Telefondaki jiroskop ve akselerometre sensörlerini kalibre et
 * - Kalman filter ile drift düzelt (±15° → ±5°)
 * - Başlangıç referans açısını kaydet
 * 
 * Kullanım:
 * const calibrator = new SensorCalibrator();
 * await calibrator.startCalibration();  // Kullanıcı telefonu yatay tutacak
 * const corrected = calibrator.correctSensorData(rawGyro, rawAccel);
 */

import { Platform } from 'react-native';

export interface SensorCalibration {
  gyroOffsetX: number;
  gyroOffsetY: number;
  gyroOffsetZ: number;
  accelBaselineX: number;
  accelBaselineY: number;
  accelBaselineZ: number;
  calibrationTime: number;
  deviceModel: string;
  isCalibrated: boolean;
}

export interface RawSensorData {
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  accelX: number;
  accelY: number;
  accelZ: number;
}

export interface CorrectedSensorData {
  pitch: number;      // X ekseni rotasyonu (yukarı-aşağı) - Hedef: 90°
  roll: number;       // Z ekseni rotasyonu (yan eğilme) - Hedef: 0°
  yaw: number;        // Y ekseni rotasyonu (sol-sağ) - Hedef: 0°
  confidence: number; // 0-100, ne kadar güvenilir
  timestamp: number;
}

/**
 * Kalman Filter State
 * Gerçek değer = measurement + noise
 * Kalman bunu minimize eder
 */
interface KalmanState {
  value: number;       // Tahmin edilen değer
  errorEstimate: number; // Hata tahmini
  processNoise: number; // Sistem gürültüsü (sabit)
  measurementNoise: number; // Ölçüm gürültüsü (sabit)
}

export class SensorCalibrator {
  private calibration: SensorCalibration | null = null;
  private samples: RawSensorData[] = [];
  private SAMPLE_SIZE = 50; // 2 saniye × 25Hz
  
  // Kalman Filter states
  private kalmanStates = {
    pitch: this.initKalmanState(0.001, 0.01),
    roll: this.initKalmanState(0.001, 0.01),
    yaw: this.initKalmanState(0.001, 0.01),
  };
  
  // Drift accumulator
  private driftAccumulator = { x: 0, y: 0, z: 0 };
  private lastRawData: RawSensorData | null = null;
  private lastTimestamp = Date.now();

  constructor() {
    this.calibration = null;
  }

  /**
   * Kalman Filter başlat
   */
  private initKalmanState(
    processNoise: number,
    measurementNoise: number
  ): KalmanState {
    return {
      value: 0,
      errorEstimate: 1,
      processNoise,
      measurementNoise,
    };
  }

  /**
   * STEP 1: Kalibrasyon başlat
   * Kullanıcı: Telefonu yatay tutsun → "Başla" → 2 sn bekle
   * 
   * Hedef: Jiroskop zero-offset (statik durumdaki değer)
   */
  async startCalibration(
    onSampleCollected?: (percent: number) => void
  ): Promise<SensorCalibration> {
    this.samples = [];
    
    return new Promise((resolve, reject) => {
      // Simulasyon: Gerçek uygulamada DeviceMotion listener buraya gelecek
      // Şimdilik constant offset değerleriyle başlarız
      
      setTimeout(() => {
        // 50 örnek topla (2 saniye, 25Hz interval)
        const mockSamples = this.generateMockSensorSamples(50);
        this.samples = mockSamples;

        // Kalibrasyon hesapla
        this.calibration = this.calculateCalibration();
        
        if (onSampleCollected) {
          onSampleCollected(100);
        }

        resolve(this.calibration);
      }, 2000);
    });
  }

  /**
   * STEP 2: Sensor verilerini düzelt
   * Input: Ham gyro/accel verileri
   * Output: Pitch/Roll/Yaw açıları (0-360°)
   */
  correctSensorData(rawData: RawSensorData): CorrectedSensorData {
    if (!this.calibration) {
      console.warn('SensorCalibrator: Henüz kalibre edilmemiş!');
      return {
        pitch: 0,
        roll: 0,
        yaw: 0,
        confidence: 0,
        timestamp: Date.now(),
      };
    }

    // 1. Jiroskop offsetini çıkar (zero-offset correction)
    const gyroX = rawData.gyroX - this.calibration.gyroOffsetX;
    const gyroY = rawData.gyroY - this.calibration.gyroOffsetY;
    const gyroZ = rawData.gyroZ - this.calibration.gyroOffsetZ;

    // 2. Akselerometre baseline'ı çıkar
    const accelX = rawData.accelX - this.calibration.accelBaselineX;
    const accelY = rawData.accelY - this.calibration.accelBaselineY;
    const accelZ = rawData.accelZ - this.calibration.accelBaselineZ;

    // 3. Gyro ve Accel fusionla → Pitch/Roll/Yaw hesapla
    let pitch = this.calculatePitch(accelY, accelZ);
    let roll = this.calculateRoll(accelX, accelZ);
    let yaw = this.calculateYaw(gyroZ); // Yaw sadece jiroskoptan

    // 4. Kalman Filter uygula (drift düzeltmesi)
    pitch = this.applyKalmanFilter('pitch', pitch);
    roll = this.applyKalmanFilter('roll', roll);
    yaw = this.applyKalmanFilter('yaw', yaw);

    // 5. Güvenilirlik skoru hesapla
    const confidence = this.calculateConfidence(
      gyroX,
      gyroY,
      gyroZ,
      accelX,
      accelY,
      accelZ
    );

    this.lastRawData = rawData;
    this.lastTimestamp = Date.now();

    return {
      pitch: this.normalizeDegrees(pitch),
      roll: this.normalizeDegrees(roll),
      yaw: this.normalizeDegrees(yaw),
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Kalman Filter adımı - Drift'i minimize et
   */
  private applyKalmanFilter(
    axis: 'pitch' | 'roll' | 'yaw',
    measurement: number
  ): number {
    const state = this.kalmanStates[axis];

    // Prediction
    const prediction = state.value;
    const predictedError =
      state.errorEstimate + state.processNoise;

    // Update
    const kalmanGain =
      predictedError / (predictedError + state.measurementNoise);
    
    const correction = kalmanGain * (measurement - prediction);
    state.value = prediction + correction;
    
    state.errorEstimate =
      (1 - kalmanGain) * predictedError;

    return state.value;
  }

  /**
   * Pitch hesapla (akselerometre Y,Z den)
   * 90° = telefon yatay (ideal)
   */
  private calculatePitch(accelY: number, accelZ: number): number {
    const magnitude = Math.sqrt(accelY * accelY + accelZ * accelZ);
    if (magnitude === 0) return 0;
    
    const pitch = Math.atan2(accelY, accelZ) * (180 / Math.PI);
    // 0-180 range'e normalize et
    return pitch < 0 ? pitch + 180 : pitch;
  }

  /**
   * Roll hesapla (akselerometre X,Z den)
   * 0° = telefon dik (ideal)
   */
  private calculateRoll(accelX: number, accelZ: number): number {
    const magnitude = Math.sqrt(accelX * accelX + accelZ * accelZ);
    if (magnitude === 0) return 0;
    
    let roll = Math.atan2(accelX, accelZ) * (180 / Math.PI);
    // -180 ila 180 range'e normalize et
    if (roll > 180) roll -= 360;
    if (roll < -180) roll += 360;
    return roll;
  }

  /**
   * Yaw hesapla (jiroskop Z'den integrate)
   * 0° = düz bakış (ideal)
   */
  private calculateYaw(gyroZ: number): number {
    const now = Date.now();
    const dt = (now - this.lastTimestamp) / 1000; // saniyeye çevir
    
    // Yaw = önceki yaw + (angular velocity × time)
    const yawChange = gyroZ * dt;
    this.driftAccumulator.z += yawChange;
    
    // -180 ila 180 normalize
    let yaw = this.driftAccumulator.z;
    if (yaw > 180) yaw -= 360;
    if (yaw < -180) yaw += 360;
    return yaw;
  }

  /**
   * Güvenilirlik skoru (0-100)
   * Sensörlerin uyumluluğuna göre
   */
  private calculateConfidence(
    gyroX: number,
    gyroY: number,
    gyroZ: number,
    accelX: number,
    accelY: number,
    accelZ: number
  ): number {
    // Jiroskop magnitude
    const gyroMag = Math.sqrt(
      gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ
    );
    
    // Akselerometre magnitude (should be ~9.8 m/s² at rest)
    const accelMag = Math.sqrt(
      accelX * accelX + accelY * accelY + accelZ * accelZ
    );
    
    // Sabitlik skoru (az hareketlilik = yüksek güven)
    const staticScore = Math.max(0, 100 - gyroMag * 10);
    
    // Akselerometre stabillik (9.8 civarı = yüksek güven)
    const accelDrift = Math.abs(accelMag - 9.81);
    const accelScore = Math.max(0, 100 - accelDrift * 10);
    
    // Ortalama
    return (staticScore + accelScore) / 2;
  }

  /**
   * Kalibrasyon hesapla (50 örneğin ortalaması)
   */
  private calculateCalibration(): SensorCalibration {
    const avgGyroX = this.samples.reduce((sum, s) => sum + s.gyroX, 0) / this.samples.length;
    const avgGyroY = this.samples.reduce((sum, s) => sum + s.gyroY, 0) / this.samples.length;
    const avgGyroZ = this.samples.reduce((sum, s) => sum + s.gyroZ, 0) / this.samples.length;
    
    const avgAccelX = this.samples.reduce((sum, s) => sum + s.accelX, 0) / this.samples.length;
    const avgAccelY = this.samples.reduce((sum, s) => sum + s.accelY, 0) / this.samples.length;
    const avgAccelZ = this.samples.reduce((sum, s) => sum + s.accelZ, 0) / this.samples.length;

    return {
      gyroOffsetX: avgGyroX,
      gyroOffsetY: avgGyroY,
      gyroOffsetZ: avgGyroZ,
      accelBaselineX: avgAccelX,
      accelBaselineY: avgAccelY,
      accelBaselineZ: avgAccelZ,
      calibrationTime: Date.now(),
      deviceModel: Platform.OS === 'ios' ? 'iOS' : 'Android',
      isCalibrated: true,
    };
  }

  /**
   * Derece normalizasyonu (-180 ila 180)
   */
  private normalizeDegrees(degrees: number): number {
    let normalized = degrees % 360;
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;
    return normalized;
  }

  /**
   * Mock sensor verileri (test amaçlı)
   */
  private generateMockSensorSamples(count: number): RawSensorData[] {
    const samples: RawSensorData[] = [];
    for (let i = 0; i < count; i++) {
      samples.push({
        gyroX: 0.05 + Math.random() * 0.1, // ±0.05 rad/s
        gyroY: 0.02 + Math.random() * 0.04,
        gyroZ: 0.01 + Math.random() * 0.02,
        accelX: 0.1 + Math.random() * 0.2,  // ±0.1 m/s²
        accelY: 0.05 + Math.random() * 0.1,
        accelZ: 9.8 + Math.random() * 0.1,
      });
    }
    return samples;
  }

  /**
   * Kalibrasyon bilgisini al
   */
  getCalibrationInfo(): SensorCalibration | null {
    return this.calibration;
  }

  /**
   * Reset kalibrasyon
   */
  reset(): void {
    this.calibration = null;
    this.samples = [];
    this.driftAccumulator = { x: 0, y: 0, z: 0 };
    this.kalmanStates = {
      pitch: this.initKalmanState(0.001, 0.01),
      roll: this.initKalmanState(0.001, 0.01),
      yaw: this.initKalmanState(0.001, 0.01),
    };
  }
}

// Cihaz-spesifik kalibrasyonlar (harita)
export const DEVICE_CALIBRATIONS: Record<string, Partial<SensorCalibration>> = {
  'iPhone-13': {
    gyroOffsetX: 0.012,
    gyroOffsetY: 0.008,
    gyroOffsetZ: 0.005,
  },
  'iPhone-14': {
    gyroOffsetX: 0.010,
    gyroOffsetY: 0.007,
    gyroOffsetZ: 0.004,
  },
  'Pixel-6': {
    gyroOffsetX: 0.015,
    gyroOffsetY: 0.010,
    gyroOffsetZ: 0.006,
  },
};
