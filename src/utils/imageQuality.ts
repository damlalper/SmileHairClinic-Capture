/**
 * FOTOĞRAF KALİTESİ ANALİZİ
 * 
 * Amaç:
 * - Blur deteksiyonu (Laplacian variance)
 * - Işık seviyesi analizi (mean brightness)
 * - Kontrast ölçümü (std deviation)
 * - Kombine kalite skoru (0-100)
 * 
 * Kötü Kalite Durumları:
 * ❌ Blur: sharpness < 30
 * ❌ Karanlık: brightness < 40
 * ❌ Aşırı Aydınlık: brightness > 200
 * ❌ Düşük Kontrast: contrast < 20
 * 
 * İyi Kalite Durumları:
 * ✅ Netlik: sharpness > 70
 * ✅ Işık: 80 < brightness < 150
 * ✅ Kontrast: contrast > 50
 */

interface ImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

interface QualityMetrics {
  sharpness: number;      // 0-100, yüksek = net
  brightness: number;     // 0-255, optimal 80-150
  contrast: number;       // 0-100, yüksek = iyi detail
  overallScore: number;   // 0-100
  feedback: string;
  isGoodQuality: boolean;
}

export class ImageQualityAnalyzer {
  /**
   * Görüntü kalitesini analiz et
   */
  static analyzeImageQuality(imageData: ImageData): QualityMetrics {
    const sharpness = this.calculateSharpness(imageData);
    const brightness = this.calculateBrightness(imageData);
    const contrast = this.calculateContrast(imageData);

    const overallScore = (sharpness + (brightness / 255) * 100 + contrast) / 3;
    const isGoodQuality = sharpness > 60 && brightness > 70 && brightness < 200 && contrast > 30;

    const feedback = this.generateFeedback(
      sharpness,
      brightness,
      contrast
    );

    return {
      sharpness: Math.round(sharpness),
      brightness: Math.round(brightness),
      contrast: Math.round(contrast),
      overallScore: Math.round(overallScore),
      feedback,
      isGoodQuality,
    };
  }

  /**
   * NETLIK HESAPLA - Laplacian Variance Yöntemi
   * 
   * Prensip: Laplacian filtresi kenarları vurgular.
   * - Blur görüntü = düşük variance (0-50)
   * - Net görüntü = yüksek variance (50-150+)
   * 
   * Formül: σ² = E[(I - μ)²]
   * 
   * Eşik Değerleri:
   * - Blur: < 30
   * - Orta: 30-70
   * - Net: > 70
   */
  static calculateSharpness(imageData: ImageData): number {
    const { data, width, height } = imageData;

    // Laplacian kernel
    const kernel = [
      0, -1, 0,
      -1, 4, -1,
      0, -1, 0,
    ];

    let laplacianSum = 0;
    let pixelCount_ = 0;

    // Imagen'in her pikselinin grayscale Laplacian'ını hesapla
    // (kenarlar hariç)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {

        // Laplacian'ı hesapla
        let laplacian = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const nIdx = ((y + ky) * width + (x + kx)) * 4;
            const neighbor = Math.round(
              (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
            );
            laplacian += neighbor * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }

        laplacianSum += laplacian * laplacian;
        pixelCount_++;
      }
    }

    // Variance'ı hesapla
    const variance = laplacianSum / pixelCount_;

    // 0-100 range'e normalize et
    // Deneysel olarak: variance 30 = blur, 150 = net
    const sharpness = Math.min(100, (variance / 150) * 100);

    return Math.max(0, sharpness);
  }

  /**
   * AYDINLIK HESAPLA - Ortalama Piksel Değeri
   * 
   * Hedef: 80-150 (optimal)
   * - < 40: Çok karanlık
   * - 40-80: Biraz karanlık
   * - 80-150: Optimal
   * - 150-200: Biraz aydınlık
   * - > 200: Çok aydınlık (ışın)
   */
  static calculateBrightness(imageData: ImageData): number {
    const { data } = imageData;
    let sumBrightness = 0;
    let pixelCount = 0;

    // Her pikselin parlaklığını hesapla (R+G+B)/3
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3;
      sumBrightness += brightness;
      pixelCount++;
    }

    const averageBrightness = sumBrightness / pixelCount;
    return averageBrightness;
  }

  /**
   * KONTRAST HESAPLA - Standart Sapma
   * 
   * Prensip: Yüksek kontrast = piksellerin parlaklık değerlerinin fazla değişmesi
   * - σ düşük (< 20) = düşük kontrast (gri, mat görünüm)
   * - σ yüksek (> 50) = yüksek kontrast (renk/derinlik)
   * 
   * Formül: σ = sqrt(E[(X - μ)²])
   */
  static calculateContrast(imageData: ImageData): number {
    const { data } = imageData;
    let sumBrightness = 0;
    let pixelCount = 0;

    // 1. Ortalama brightness'ı hesapla
    const brightnesses: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3;
      brightnesses.push(brightness);
      sumBrightness += brightness;
      pixelCount++;
    }

    const averageBrightness = sumBrightness / pixelCount;

    // 2. Standart sapmayı hesapla
    let sumSquaredDiff = 0;
    for (const brightness of brightnesses) {
      const diff = brightness - averageBrightness;
      sumSquaredDiff += diff * diff;
    }

    const variance = sumSquaredDiff / pixelCount;
    const stdDev = Math.sqrt(variance);

    // 0-100 range'e normalize et
    // Deneysel olarak: σ = 50 → excellent contrast
    const contrast = Math.min(100, (stdDev / 50) * 100);

    return Math.round(contrast);
  }

  /**
   * FEEDBACK MESAJı OLUŞTUR
   */
  static generateFeedback(
    sharpness: number,
    brightness: number,
    contrast: number
  ): string {
    const issues: string[] = [];

    if (sharpness < 40) {
      issues.push('📷 Görüntü bulanık - Telefonu stabil tut');
    }

    if (brightness < 50) {
      issues.push('🌙 Çok karanlık - Daha aydınlık yerde çek');
    } else if (brightness > 200) {
      issues.push('☀️ Çok aydınlık - Direkt ışından kaçın');
    }

    if (contrast < 25) {
      issues.push('⚪ Düşük kontrast - İyi kontrastta yerde çek');
    }

    if (issues.length === 0) {
      return '✅ Mükemmel kalite!';
    }

    return issues.join(' | ');
  }

  /**
   * HIZLI BLUR KONTROLÜ (lightweight)
   * Performance-critical durumlarda
   */
  static quickBlurCheck(imageData: ImageData): boolean {
    // Sadece merkez 100x100 pikseli kontrol et
    const { data, width, height } = imageData;
    const startX = Math.floor((width - 100) / 2);
    const startY = Math.floor((height - 100) / 2);

    let laplacianSum = 0;
    let count = 0;

    for (let y = startY + 1; y < startY + 99; y++) {
      for (let x = startX + 1; x < startX + 99; x++) {
        const idx = (y * width + x) * 4;
        const pixel = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        // Basit Laplacian (4-komşu)
        const up = (data[((y - 1) * width + x) * 4] +
          data[((y - 1) * width + x) * 4 + 1] +
          data[((y - 1) * width + x) * 4 + 2]) / 3;

        const down = (data[((y + 1) * width + x) * 4] +
          data[((y + 1) * width + x) * 4 + 1] +
          data[((y + 1) * width + x) * 4 + 2]) / 3;

        const left = (data[(y * width + (x - 1)) * 4] +
          data[(y * width + (x - 1)) * 4 + 1] +
          data[(y * width + (x - 1)) * 4 + 2]) / 3;

        const right = (data[(y * width + (x + 1)) * 4] +
          data[(y * width + (x + 1)) * 4 + 1] +
          data[(y * width + (x + 1)) * 4 + 2]) / 3;

        const laplacian = 4 * pixel - up - down - left - right;
        laplacianSum += laplacian * laplacian;
        count++;
      }
    }

    const variance = laplacianSum / count;
    // Eşik: variance > 30 = yeterince net
    return variance > 30;
  }

  /**
   * YÜZÜ MERKEZ KONTROL
   * Yüz frame'in ortasında mı?
   */
  static checkFaceCenter(
    faceX: number,
    faceY: number,
    faceWidth: number,
    faceHeight: number,
    imageWidth: number,
    imageHeight: number
  ): { centered: boolean; horizontalOffset: number; verticalOffset: number } {
    const faceCenterX = faceX + faceWidth / 2;
    const faceCenterY = faceY + faceHeight / 2;

    const imageCenterX = imageWidth / 2;
    const imageCenterY = imageHeight / 2;

    const horizontalOffset = ((faceCenterX - imageCenterX) / imageWidth) * 100;
    const verticalOffset = ((faceCenterY - imageCenterY) / imageHeight) * 100;

    // ±15% içinde merkez kabul et
    const centered = Math.abs(horizontalOffset) < 15 && Math.abs(verticalOffset) < 15;

    return {
      centered,
      horizontalOffset,
      verticalOffset,
    };
  }
}

// Export types
export type { ImageData, QualityMetrics };
