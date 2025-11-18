# 🔧 DENEME-YANILMA İMPLANTASYON REHBERI

**Amaç:** FRONT_FACE_CAPTURE_STRATEGY.md dosyasında belirtilen teknikleri adım adım deneyerek uygulamak

**Durum:** 🚀 Hazır

---

## BÖLÜM 1: SENSOR KALİBRASYONU (Gün 1 Sabahı)

### ✅ CHECKPOINT 1.1 - useSensorData Mevcut Durumunu Kontrol Et

```bash
cd smile-hair-capture
grep -n "DeviceMotion" src/hooks/useSensorData.ts
grep -n "setUpdateInterval" src/hooks/useSensorData.ts
```

**Beklenen Çıktı:**
```
✓ DeviceMotion import var
✓ setUpdateInterval(100) ayarlanmış
✓ beta/gamma/alpha rotation kullanılıyor
```

**İlk Bulgu:**
- Mevcut kod: ✅ Temel DeviceMotion
- Eksik: ❌ Kalibrasyon, drift correction, accelerometer

---

### 🚀 STEP 1.2 - Sensor Calibration Utility Oluştur

**Dosya:** `src/utils/sensorCalibration.ts` (YENİ)

```typescript
// KOPYA-YAPISTIR (Stratejiden)
import { DeviceMotion, Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';

interface SensorCalibration {
  gyroOffset: { x: number; y: number; z: number };
  accelBaseline: { x: number; y: number; z: number };
  gravity: number;
  calibrationTime: number;
  deviceModel: string;
}

interface CorrectedSensorData {
  pitch: number;
  roll: number;
  yaw: number;
  timestamp: number;
  confidence: number;
}

export class SensorCalibrator {
  private calibration: SensorCalibration | null = null;
  private samples: Array<any> = [];
  private SAMPLE_SIZE = 50;
  private kalmanState = { x: 0, p: 1 };
  
  /**
   * Kullanıcı: Telefonu yatay tutsun → "Başla" → 2 sn bekleme
   */
  async startCalibration(onProgress?: (percent: number) => void) {
    this.samples = [];
    
    const subs = [
      DeviceMotion.addListener((data) => {
        if (this.samples.length < this.SAMPLE_SIZE) {
          this.samples.push({
            gyro: data.rotation || { x: 0, y: 0, z: 0 },
            accel: data.acceleration || { x: 0, y: 0, z: 0 },
          });
          
          if (onProgress) {
            onProgress((this.samples.length / this.SAMPLE_SIZE) * 100);
          }
        }
      }),
    ];
    
    // 2 saniye bekle
    return new Promise((resolve) => {
      setTimeout(() => {
        subs.forEach(s => s.remove());
        this.calibration = this.calculateCalibration();
        resolve(this.calibration);
      }, 2000);
    });
  }
  
  /**
   * Kalman Filter ile drift düzeltmesi
   */
  private kalmanStep(measurement: number): number {
    const q = 0.0001; // Process noise
    const r = 0.01;   // Measurement noise
    
    // Prediction
    this.kalmanState.p = this.kalmanState.p + q;
    
    // Update
    const k = this.kalmanState.p / (this.kalmanState.p + r);
    this.kalmanState.x = this.kalmanState.x + k * (measurement - this.kalmanState.x);
    this.kalmanState.p = (1 - k) * this.kalmanState.p;
    
    return this.kalmanState.x;
  }
  
  private calculateCalibration(): SensorCalibration {
    const avgGyro = this.averageArray(this.samples.map(s => s.gyro));
    const avgAccel = this.averageArray(this.samples.map(s => s.accel));
    
    return {
      gyroOffset: avgGyro,
      accelBaseline: avgAccel,
      gravity: Math.sqrt(avgAccel.x ** 2 + avgAccel.y ** 2 + avgAccel.z ** 2),
      calibrationTime: Date.now(),
      deviceModel: Platform.OS,
    };
  }
  
  private averageArray(arr: any[]): any {
    if (arr.length === 0) return { x: 0, y: 0, z: 0 };
    
    const sum = arr.reduce(
      (acc, val) => ({
        x: acc.x + (val.x || 0),
        y: acc.y + (val.y || 0),
        z: acc.z + (val.z || 0),
      }),
      { x: 0, y: 0, z: 0 }
    );
    
    return {
      x: sum.x / arr.length,
      y: sum.y / arr.length,
      z: sum.z / arr.length,
    };
  }
  
  applyCalibration(rawPitch: number): CorrectedSensorData {
    if (!this.calibration) {
      return {
        pitch: rawPitch,
        roll: 0,
        yaw: 0,
        timestamp: Date.now(),
        confidence: 50,
      };
    }
    
    const correctedPitch = this.kalmanStep(rawPitch);
    
    return {
      pitch: correctedPitch,
      roll: 0,
      yaw: 0,
      timestamp: Date.now(),
      confidence: 85,
    };
  }
}
```

**Test Adımları:**
1. `src/hooks/useSensorData.ts` import et: `import { SensorCalibrator } from '../utils/sensorCalibration';`
2. Hook içinde: `const calibrator = useRef(new SensorCalibrator()).current;`
3. İlk açılışta: `await calibrator.startCalibration();`
4. Çıktıyı logla
5. Telefonu yatay tut ve "Başla" butonu basılı tut

**Beklenen Sonuç:**
```
✅ Calibration started...
✅ Sample 1/50...
✅ Sample 50/50...
✅ Calibration done!
Offset: {x: -0.05, y: 0.02, z: 0.01}
```

---

### 🔍 TEST 1.2 - Manual Verification

**Yazılacak Test Kod:**

```typescript
// src/utils/__tests__/sensorCalibration.test.ts
import { SensorCalibrator } from '../sensorCalibration';

describe('SensorCalibrator', () => {
  test('should return offset values after calibration', async () => {
    const calibrator = new SensorCalibrator();
    // Mock DeviceMotion verisi
    // ... test implementation
    
    const result = await calibrator.startCalibration();
    expect(result).toBeDefined();
    expect(result.gyroOffset).toBeDefined();
  });
});
```

**Komut:**
```bash
npm test sensorCalibration.test.ts
```

---

### 📊 STEP 1.3 - useSensorData Hook'unu Geliştir

**Dosya:** `src/hooks/useSensorData.ts` (GÜNCELLE)

```typescript
// OLD
export const useSensorData = () => {
  const [sensorData, setSensorData] = useState<SensorData>({
    pitch: 0,
    roll: 0,
    yaw: 0,
  });

// NEW
import { SensorCalibrator } from '../utils/sensorCalibration';

export const useSensorData = (enableCalibration = true) => {
  const [sensorData, setSensorData] = useState<SensorData>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    confidence: 50,
  });
  
  const calibratorRef = useRef<SensorCalibrator | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);

  useEffect(() => {
    let subscription: any;

    const setupSensor = async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        setIsAvailable(available);

        if (available) {
          // Kalibrasyonu başlat
          if (enableCalibration) {
            calibratorRef.current = new SensorCalibrator();
            const result = await calibratorRef.current.startCalibration();
            console.log('✅ Calibration complete:', result);
            setIsCalibrated(true);
          }

          DeviceMotion.setUpdateInterval(100);

          subscription = DeviceMotion.addListener((data) => {
            const { rotation } = data;
            if (rotation) {
              let pitch = rotation.beta * (180 / Math.PI);
              let roll = rotation.gamma * (180 / Math.PI);
              let yaw = rotation.alpha * (180 / Math.PI);

              // Calibrate if available
              if (calibratorRef.current && isCalibrated) {
                const corrected = calibratorRef.current.applyCalibration(pitch);
                pitch = corrected.pitch;
              }

              setSensorData({ pitch, roll, yaw, confidence: isCalibrated ? 85 : 50 });
            }
          });
        }
      } catch (error) {
        console.error('Sensor setup error:', error);
      }
    };

    setupSensor();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [enableCalibration, isCalibrated]);

  return { sensorData, isAvailable, isCalibrated };
};
```

**Test:**
```bash
# 1. Hooku import et
# 2. CameraScreen'de: const { sensorData, isCalibrated } = useSensorData(true);
# 3. Debug console'da doğruluk oranını kontrol et
# 4. Telefon yatay iken pitch ~90° olmalı
# 5. Telefon 45° açıda iken pitch ~45° olmalı
```

**Kontrol Listesi:**
- [ ] Kalibrasyon başlıyor
- [ ] Offset değerleri mantıklı (±2°)
- [ ] Pitch değişimi smooth (drift yok)
- [ ] Confidence score artıyor

---

## BÖLÜM 2: YÜZ DETEKSYON IYILEŞTIRMESI (Gün 1 Öğleden Sonra)

### ✅ CHECKPOINT 2.1 - Mevcut faceDetection.ts Analizi

**Komut:**
```bash
wc -l src/utils/faceDetection.ts
grep -n "FaceDetector\|analyzeFace\|landmarks" src/utils/faceDetection.ts | head -20
```

**Bulgular:**
- ✅ expo-face-detector entegre
- ✅ Landmark extraction var
- ⚠️ Basit quality analysis
- ❌ Blur detection yok
- ❌ Real-time sharpness yok

---

### 🚀 STEP 2.2 - İmaj Kalitesi Analizi Ekle

**Dosya:** `src/utils/imageQuality.ts` (YENİ)

```typescript
/**
 * Canvas kullanarak fotoğraf kalitesi ölç
 * (Real-time kamera frame'inde kullanılabilir)
 */

export interface ImageQualityMetrics {
  sharpness: number; // 0-100
  brightness: number; // 0-100
  contrast: number; // 0-100
  blur: boolean;
  confidence: number; // 0-100
}

/**
 * Laplacian Variance: Blur detection
 * Formül: Sum of (Laplacian(image) ** 2) / pixel count
 * Yüksek = Sharp, Düşük = Blurry
 */
export function calculateSharpness(pixelData: Uint8ClampedArray, width: number, height: number): number {
  // Grayscale convert
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < pixelData.length; i += 4) {
    gray[i / 4] = (pixelData[i] * 0.299 + pixelData[i + 1] * 0.587 + pixelData[i + 2] * 0.114);
  }
  
  // Laplacian kernel
  const kernel = [
    0, -1, 0,
    -1, 4, -1,
    0, -1, 0,
  ];
  
  let laplacianSum = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          sum += gray[idx] * kernel[kernelIdx];
        }
      }
      
      laplacianSum += sum * sum;
    }
  }
  
  const variance = laplacianSum / ((width - 2) * (height - 2));
  
  // Normalize to 0-100
  // Typical sharp: 500-2000, blur: 0-50
  const sharpness = Math.min(100, (variance / 20));
  
  return Math.round(sharpness);
}

/**
 * Brightness: Mean pixel value
 */
export function calculateBrightness(pixelData: Uint8ClampedArray): number {
  let sum = 0;
  
  for (let i = 0; i < pixelData.length; i += 4) {
    sum += (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3;
  }
  
  const mean = sum / (pixelData.length / 4);
  return Math.round((mean / 255) * 100);
}

/**
 * Contrast: Standard Deviation of brightness
 */
export function calculateContrast(pixelData: Uint8ClampedArray): number {
  let sum = 0;
  const pixelCount = pixelData.length / 4;
  
  // Mean
  for (let i = 0; i < pixelData.length; i += 4) {
    sum += (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3;
  }
  const mean = sum / pixelCount;
  
  // Std dev
  let sumSqDiff = 0;
  for (let i = 0; i < pixelData.length; i += 4) {
    const brightness = (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3;
    sumSqDiff += Math.pow(brightness - mean, 2);
  }
  
  const stdDev = Math.sqrt(sumSqDiff / pixelCount);
  
  // Normalize (max contrast = 127 std dev)
  return Math.round((stdDev / 127) * 100);
}

/**
 * Tüm metrikleri hesapla
 */
export function analyzeImageQuality(pixelData: Uint8ClampedArray, width: number, height: number): ImageQualityMetrics {
  const sharpness = calculateSharpness(pixelData, width, height);
  const brightness = calculateBrightness(pixelData);
  const contrast = calculateContrast(pixelData);
  
  const blur = sharpness < 30; // Threshold
  const goodQuality = sharpness > 50 && brightness > 40 && brightness < 80 && contrast > 20;
  
  return {
    sharpness,
    brightness,
    contrast,
    blur,
    confidence: goodQuality ? 90 : 60,
  };
}
```

**Test:**
```typescript
// Dummy pixel data test
const testPixelData = new Uint8ClampedArray(800 * 600 * 4);
testPixelData.fill(128); // 50% gray
const metrics = analyzeImageQuality(testPixelData, 800, 600);
console.log('Quality:', metrics);
```

---

### 🚀 STEP 2.3 - Yüz Kalitesi Entegrasyonu

**Dosya:** `src/components/FaceQualityMeter.tsx` (YENİ)

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ImageQualityMetrics } from '../utils/imageQuality';

interface FaceQualityMeterProps {
  quality: ImageQualityMetrics | null;
}

export const FaceQualityMeter: React.FC<FaceQualityMeterProps> = ({ quality }) => {
  if (!quality) return null;
  
  const getQualityColor = () => {
    if (quality.sharpness > 70) return '#4CAF50'; // Green
    if (quality.sharpness > 50) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };
  
  const getQualityMessage = () => {
    if (quality.blur) return '⚠️ Bulanık - Sabit tutun';
    if (quality.brightness < 40) return '☀️ Çok karanlık - Işık artırın';
    if (quality.brightness > 80) return '☀️ Çok aydınlık - Gölge alın';
    if (quality.contrast < 20) return '⚖️ Kontrastı artırın';
    return '✅ Kalite iyi!';
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Görüntü Kalitesi</Text>
      
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Netlik</Text>
          <Text style={[styles.metricValue, { color: getQualityColor() }]}>
            {quality.sharpness}%
          </Text>
        </View>
        
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Parlaklık</Text>
          <Text style={styles.metricValue}>{quality.brightness}%</Text>
        </View>
        
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Kontrast</Text>
          <Text style={styles.metricValue}>{quality.contrast}%</Text>
        </View>
      </View>
      
      <Text style={styles.message}>{getQualityMessage()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  label: {
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  metricValue: {
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 4,
  },
  message: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
```

---

## BÖLÜM 3: MESAFE TAHMINI GELIŞTIRMESI (Gün 2 Sabahı)

### 🚀 STEP 3.1 - Distance Estimator Yazma

**Dosya:** `src/utils/distanceEstimator.ts` (YENİ)

```typescript
/**
 * Camera intrinsics (focal length vb) kullanarak mesafe tah min et
 */

interface CameraIntrinsics {
  focalLength: number; // pixels
  sensorWidth: number; // mm
  imageWidth: number; // pixels
}

const DEVICE_INTRINSICS: Record<string, CameraIntrinsics> = {
  'iPhone14': {
    focalLength: 850,
    sensorWidth: 5.95,
    imageWidth: 1920,
  },
  'Pixel7': {
    focalLength: 800,
    sensorWidth: 5.85,
    imageWidth: 1920,
  },
  'generic': {
    focalLength: 800,
    sensorWidth: 6,
    imageWidth: 1920,
  },
};

export class DistanceEstimator {
  private intrinsics: CameraIntrinsics;
  private headWidthMM = 150; // ~15cm başlık genişliği
  private calibrationSamples: number[] = [];
  
  constructor(deviceModel?: string) {
    this.intrinsics = DEVICE_INTRINSICS[deviceModel || 'generic'];
  }
  
  /**
   * Head width in pixels → Distance in cm
   * Distance = (Head Width MM * Focal Length) / Face Width Pixels / 10
   */
  estimateDistance(faceWidthPixels: number, screenWidthPixels: number): number {
    if (faceWidthPixels === 0) return 40;
    
    // Focal length'i screen resolution'a göre scale et
    const scaledFocalLength = this.intrinsics.focalLength * (screenWidthPixels / this.intrinsics.imageWidth);
    
    const distance = (this.headWidthMM * scaledFocalLength) / faceWidthPixels / 10;
    
    // Clamp to realistic range
    return Math.max(15, Math.min(80, distance));
  }
  
  /**
   * İlk successful capture'dan kalibre et
   */
  calibrateFromFirstCapture(faceWidthPixels: number, knownDistanceCM: number) {
    // Kullanıcıya "50cm uzağa git" mesajı verilip
    // İlk çekiş başarılıysa bu head width'i kaydet
    
    const focalLength = (knownDistanceCM * 10 * faceWidthPixels) / this.headWidthMM;
    this.intrinsics.focalLength = focalLength;
    
    console.log('📏 Calibrated focal length:', focalLength);
  }
  
  /**
   * Distance accuracy feedback
   */
  getDistanceFeedback(estimatedDistance: number, targetDistance: number = 40): string {
    const diff = estimatedDistance - targetDistance;
    
    if (Math.abs(diff) < 2) return 'Mükemmel mesafe!';
    if (diff > 5) return 'Telefonu yaklaştırın';
    if (diff < -5) return 'Telefonu uzaklaştırın';
    
    return 'Mesafe iyileşiyor...';
  }
}
```

---

### 🚀 STEP 3.2 - CameraScreen'e Distance Entegrasyonu

**Dosya:** `src/screens/CameraScreen.tsx` (GÜNCELLE)

```typescript
// İçinde şöyle ekle:
import { DistanceEstimator } from '../utils/distanceEstimator';

const estimator = useRef(new DistanceEstimator(Platform.OS === 'ios' ? 'iPhone14' : 'Pixel7')).current;

// Face detection'da:
const estimatedDistance = estimator.estimateDistance(
  faceAnalysis.facePosition.width,
  SCREEN_WIDTH
);

const distanceFeedback = estimator.getDistanceFeedback(estimatedDistance);
```

---

## BÖLÜM 4: OTOMATIK ÇEKIM LOJİĞİ (Gün 2 Öğleden Sonra)

### 🚀 STEP 4.1 - Adaptive Validator Oluştur

**Dosya:** `src/utils/adaptiveValidator.ts` (YENİ)

```typescript
/**
 * Threshold'lar adaptif, hysteresis ile, baseline doğrulama
 */

export class AdaptiveValidator {
  private validityBuffer: boolean[] = [];
  private BUFFER_SIZE = 30; // 1 saniye @ 30fps
  private wasValid = false;
  private hysteresis = 5;
  
  /**
   * Hysteresis: On-off titreşmesini önle
   */
  checkValidWithHysteresis(currentAccuracy: number): boolean {
    const threshold = this.wasValid ? 60 - this.hysteresis : 60 + this.hysteresis;
    
    if (currentAccuracy > threshold) {
      this.wasValid = true;
      return true;
    } else if (currentAccuracy < threshold - 10) {
      this.wasValid = false;
      return false;
    }
    
    return this.wasValid;
  }
  
  /**
   * Frame ekle buffer'a
   */
  addFrame(isValid: boolean) {
    this.validityBuffer.push(isValid);
    if (this.validityBuffer.length > this.BUFFER_SIZE) {
      this.validityBuffer.shift();
    }
  }
  
  /**
   * Son 30 frame'in %90'ı geçerli mi?
   */
  hasStableValidity(): boolean {
    if (this.validityBuffer.length < this.BUFFER_SIZE) return false;
    
    const validCount = this.validityBuffer.filter(v => v).length;
    return validCount >= this.BUFFER_SIZE * 0.9;
  }
  
  /**
   * Countdown başlatma kriteri
   */
  shouldStartCountdown(
    angleAccuracy: number,
    distanceAccuracy: number,
    faceValid: boolean
  ): boolean {
    const sensorValid = angleAccuracy > 60 && distanceAccuracy > 60;
    const hysteresisOK = this.checkValidWithHysteresis(angleAccuracy);
    const stableOK = this.hasStableValidity();
    
    return sensorValid && faceValid && hysteresisOK && stableOK;
  }
  
  /**
   * Reset
   */
  reset() {
    this.validityBuffer = [];
    this.wasValid = false;
  }
}
```

---

## BÖLÜM 5: SESLI FEEDBACK (Gün 3 Sabahı)

### 🚀 STEP 5.1 - Audio Feedback Module

**Dosya:** `src/utils/audioFeedback.ts` (YENİ)

```typescript
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export class AudioFeedback {
  private sound: Audio.Sound | null = null;
  
  async playBeep(frequency: 'low' | 'mid' | 'high' = 'mid') {
    try {
      // Fallback: Beep dosyası yoksa haptic
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/beep.mp3'),
        { shouldPlay: true, volume: 0.7 }
      );
      
      setTimeout(() => sound.unloadAsync(), 500);
    } catch (error) {
      console.log('No beep file, using haptic');
      this.playHapticFeedback(frequency);
    }
  }
  
  async playCountdownSound(number: number) {
    const freq = number === 3 ? 600 : number === 2 ? 500 : 400;
    await this.playBeep(number < 2 ? 'low' : 'high');
  }
  
  async playShutterSound() {
    await this.playBeep('high');
  }
  
  private async playHapticFeedback(frequency: 'low' | 'mid' | 'high') {
    try {
      if (frequency === 'high') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (frequency === 'mid') {
        await Haptics.impactAsync(Haptics.ImpactStyle.Medium);
      } else {
        await Haptics.impactAsync(Haptics.ImpactStyle.Light);
      }
    } catch (error) {
      console.log('Haptic error:', error);
    }
  }
}
```

---

## BÖLÜM 6: TEST EDIMI

### 🧪 TEST PLAN

#### TEST 1: Sensor Calibration

```bash
# Device cihaza bağla
npm run android
# veya
npm run ios

# Uygulama açıl
# "Telefonu yatay tutun" ekranı görsün
# Başla butonuna bas
# 2 saniye bekleme
# Pitch değeri 90° civarı olmalı
```

**Beklenen:** ✅ Pitch ~90°, Confidence >80%

#### TEST 2: Face Detection

```
# Kameranın önüne geç
# Yüzün merkeze alın
# Debug ekrandaki yüz genişliğini not et
# 40cm ölçü (ruler) koy ve mesafeyi doğrula
```

**Beklenen:** ✅ Mesafe 35-45cm, accuracy >70%

#### TEST 3: Auto Capture

```
# Tüm kriterleri sağla:
  - Pitch: 85-95°
  - Roll: -5 to +5°
  - Yüz merkeze
  - Mesafe: 35-45cm
  - Işık: Yeterli

# Bekleme: 3-2-1 countdown
# Fotoğraf otomatik çekilmeli
```

**Beklenen:** ✅ <10 saniye, otomatik çekim

---

## ✅ KONTROL LİSTESİ

### Gün 1
- [ ] sensorCalibration.ts yazılmış
- [ ] useSensorData hook güncellenmiş
- [ ] imageQuality.ts yazılmış
- [ ] FaceQualityMeter komponent yazılmış
- [ ] Test: Sensor verisi doğru

### Gün 2
- [ ] distanceEstimator.ts yazılmış
- [ ] CameraScreen'e entegre
- [ ] adaptiveValidator.ts yazılmış
- [ ] Test: Distance doğru

### Gün 3
- [ ] audioFeedback.ts yazılmış
- [ ] CameraScreen entegrasyonu
- [ ] End-to-end test
- [ ] Bug fixing

---

## 🐛 HATA İHBAR FORMU

Eğer bir step fail olursa:

```markdown
### HATA: [Step Numarası]
**Sorun:** [Açıkla]
**Stack Trace:**
```
[Paste here]
```
**Çözüm Denenen:** [Ne denedi]
**Sonuç:** [Ne oldu]
**İleri:** [Sonraki adım]
```

---

**Başla!** Step 1.2'den başlayarak kodla. 🚀
