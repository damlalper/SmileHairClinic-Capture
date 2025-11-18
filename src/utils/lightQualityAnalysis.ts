/**
 * ═══════════════════════════════════════════════════════════════════
 * IŞIK KALİTESİ ANALİZ SİSTEMİ
 * ═══════════════════════════════════════════════════════════════════
 *
 * Başarısız çekimlerin %50'si ışık kaynaklı
 *
 * Ölçümler:
 * - Median brightness → Düşük = "Daha iyi ışık"
 * - Highlight saturation > %10 → Aşırı pozlama = "Işık fazla"
 * - Shadow region size > %40 → "Gölge geliyor"
 *
 * Dokümantasyon: advanced-capture-try.md
 */

import { LIGHT_QUALITY } from '../constants/angles';

// ═══════════════════════════════════════════════════════════════════
// TİPLER VE ARAYÜZLER
// ═══════════════════════════════════════════════════════════════════

export interface ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA format (4 bytes per pixel)
}

export interface LightingAnalysis {
  brightness: number;           // Ortalama parlaklık (0-1)
  medianBrightness: number;     // Median parlaklık (0-1)
  highlightSaturation: number;  // Aşırı pozlama oranı (0-1)
  shadowSize: number;           // Gölge bölgesi oranı (0-1)
  contrast: number;             // Kontrast (0-1)
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  score: number;                // Kalite skoru (0-100)
  issues: string[];             // Tespit edilen sorunlar
  recommendation: string;       // Kullanıcı geri bildirimi
}

export interface HistogramData {
  luminance: number[];          // 0-255 arası histogram
  red: number[];
  green: number[];
  blue: number[];
}

// ═══════════════════════════════════════════════════════════════════
// ANA IŞIK KALİTESİ ANALİZİ
// ═══════════════════════════════════════════════════════════════════

/**
 * Görüntünün ışık kalitesini analiz et
 */
export const analyzeLightQuality = (imageData: ImageData): LightingAnalysis => {
  // Histogram oluştur
  const histogram = buildHistogram(imageData);

  // Parlaklık metrikleri
  const brightness = calculateAverageBrightness(imageData);
  const medianBrightness = calculateMedianBrightness(histogram.luminance);

  // Aşırı pozlama kontrolü
  const highlightSaturation = calculateHighlightSaturation(histogram.luminance, imageData);

  // Gölge bölgesi kontrolü
  const shadowSize = calculateShadowSize(histogram.luminance, imageData);

  // Kontrast
  const contrast = calculateContrast(histogram.luminance);

  // Kalite değerlendirmesi
  const { quality, score, issues } = evaluateLightQuality(
    brightness,
    medianBrightness,
    highlightSaturation,
    shadowSize,
    contrast
  );

  // Geri bildirim mesajı
  const recommendation = generateRecommendation(issues, brightness, highlightSaturation, shadowSize);

  return {
    brightness,
    medianBrightness,
    highlightSaturation,
    shadowSize,
    contrast,
    quality,
    score,
    issues,
    recommendation,
  };
};

// ═══════════════════════════════════════════════════════════════════
// HİSTOGRAM OLUŞTURMA
// ═══════════════════════════════════════════════════════════════════

/**
 * RGBA görüntüden histogram oluştur
 */
const buildHistogram = (imageData: ImageData): HistogramData => {
  const luminance = new Array(256).fill(0);
  const red = new Array(256).fill(0);
  const green = new Array(256).fill(0);
  const blue = new Array(256).fill(0);

  const { data, width, height } = imageData;
  const pixelCount = width * height;

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    // Luminance (ITU-R BT.709)
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);

    luminance[lum]++;
    red[r]++;
    green[g]++;
    blue[b]++;
  }

  return { luminance, red, green, blue };
};

// ═══════════════════════════════════════════════════════════════════
// PARLAKLIK METRİKLERİ
// ═══════════════════════════════════════════════════════════════════

/**
 * Ortalama parlaklık hesapla
 */
const calculateAverageBrightness = (imageData: ImageData): number => {
  const { data, width, height } = imageData;
  const pixelCount = width * height;

  let sum = 0;

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    // Luminance
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += lum;
  }

  return sum / pixelCount / 255; // 0-1 arası normalize
};

/**
 * Median parlaklık hesapla
 */
const calculateMedianBrightness = (luminanceHistogram: number[]): number => {
  const totalPixels = luminanceHistogram.reduce((sum, count) => sum + count, 0);
  const halfPixels = totalPixels / 2;

  let cumulative = 0;
  for (let i = 0; i < 256; i++) {
    cumulative += luminanceHistogram[i];
    if (cumulative >= halfPixels) {
      return i / 255; // 0-1 arası normalize
    }
  }

  return 0.5; // Fallback
};

// ═══════════════════════════════════════════════════════════════════
// AŞIRI POZLAMA KONTROLÜ
// ═══════════════════════════════════════════════════════════════════

/**
 * Highlight saturation (aşırı pozlama) oranını hesapla
 */
const calculateHighlightSaturation = (
  luminanceHistogram: number[],
  imageData: ImageData
): number => {
  const totalPixels = imageData.width * imageData.height;

  // 240-255 arası (çok parlak) piksel sayısı
  let highlightPixels = 0;
  for (let i = 240; i <= 255; i++) {
    highlightPixels += luminanceHistogram[i];
  }

  return highlightPixels / totalPixels;
};

// ═══════════════════════════════════════════════════════════════════
// GÖLGE BÖLGE ANALİZİ
// ═══════════════════════════════════════════════════════════════════

/**
 * Shadow region size (gölge bölgesi) oranını hesapla
 */
const calculateShadowSize = (
  luminanceHistogram: number[],
  imageData: ImageData
): number => {
  const totalPixels = imageData.width * imageData.height;

  // 0-40 arası (çok karanlık) piksel sayısı
  let shadowPixels = 0;
  for (let i = 0; i <= 40; i++) {
    shadowPixels += luminanceHistogram[i];
  }

  return shadowPixels / totalPixels;
};

// ═══════════════════════════════════════════════════════════════════
// KONTRAST HESAPLAMA
// ═══════════════════════════════════════════════════════════════════

/**
 * Kontrast hesapla (standart sapma tabanlı)
 */
const calculateContrast = (luminanceHistogram: number[]): number => {
  const totalPixels = luminanceHistogram.reduce((sum, count) => sum + count, 0);

  // Ortalama
  let mean = 0;
  for (let i = 0; i < 256; i++) {
    mean += (i / 255) * luminanceHistogram[i];
  }
  mean /= totalPixels;

  // Varyans
  let variance = 0;
  for (let i = 0; i < 256; i++) {
    const normalized = i / 255;
    variance += Math.pow(normalized - mean, 2) * luminanceHistogram[i];
  }
  variance /= totalPixels;

  // Standart sapma (0-1 arası normalize)
  const stdDev = Math.sqrt(variance);

  return stdDev;
};

// ═══════════════════════════════════════════════════════════════════
// KALİTE DEĞERLENDİRME
// ═══════════════════════════════════════════════════════════════════

/**
 * Işık kalitesini değerlendir
 */
const evaluateLightQuality = (
  brightness: number,
  medianBrightness: number,
  highlightSaturation: number,
  shadowSize: number,
  contrast: number
): {
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  score: number;
  issues: string[];
} => {
  const issues: string[] = [];
  let score = 100;

  // Parlaklık kontrolü
  if (brightness < LIGHT_QUALITY.MIN_BRIGHTNESS) {
    issues.push('Çok karanlık');
    score -= 30;
  } else if (brightness > LIGHT_QUALITY.MAX_BRIGHTNESS) {
    issues.push('Çok parlak');
    score -= 25;
  } else if (
    brightness < LIGHT_QUALITY.IDEAL_BRIGHTNESS - 0.1 ||
    brightness > LIGHT_QUALITY.IDEAL_BRIGHTNESS + 0.1
  ) {
    score -= 10; // İdeal değerden sapma
  }

  // Aşırı pozlama kontrolü
  if (highlightSaturation > LIGHT_QUALITY.MAX_HIGHLIGHT_SAT) {
    issues.push('Aşırı pozlama');
    score -= 25;
  }

  // Gölge kontrolü
  if (shadowSize > LIGHT_QUALITY.MAX_SHADOW_SIZE) {
    issues.push('Fazla gölge');
    score -= 20;
  }

  // Kontrast kontrolü
  if (contrast < 0.15) {
    issues.push('Düşük kontrast');
    score -= 15;
  } else if (contrast > 0.5) {
    issues.push('Yüksek kontrast');
    score -= 10;
  }

  // Kalite sınıfı
  let quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  if (score >= 90) {
    quality = 'EXCELLENT';
  } else if (score >= 70) {
    quality = 'GOOD';
  } else if (score >= 50) {
    quality = 'FAIR';
  } else {
    quality = 'POOR';
  }

  return {
    quality,
    score: Math.max(0, score),
    issues,
  };
};

// ═══════════════════════════════════════════════════════════════════
// GERİ BİLDİRİM OLUŞTURMA
// ═══════════════════════════════════════════════════════════════════

/**
 * Kullanıcıya öneriler oluştur
 */
const generateRecommendation = (
  issues: string[],
  brightness: number,
  highlightSaturation: number,
  shadowSize: number
): string => {
  if (issues.length === 0) {
    return 'Işık mükemmel! Fotoğraf çekilebilir.';
  }

  // En kritik sorun için öneri
  if (issues.includes('Çok karanlık')) {
    return 'Daha aydınlık bir yere geçin.';
  }

  if (issues.includes('Çok parlak') || issues.includes('Aşırı pozlama')) {
    return 'Işık çok fazla. Daha az ışıklı bir yere geçin.';
  }

  if (issues.includes('Fazla gölge')) {
    return 'Gölge bölgesi çok fazla. Pozisyonunuzu değiştirin.';
  }

  if (issues.includes('Düşük kontrast')) {
    return 'Kontrast düşük. Işık kaynaklarını ayarlayın.';
  }

  return 'Işık kalitesini iyileştirin.';
};

// ═══════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════

/**
 * Işık kalitesinin otomatik çekim için yeterli olup olmadığını kontrol et
 */
export const isLightingAcceptable = (analysis: LightingAnalysis): boolean => {
  return analysis.score >= 70 && analysis.issues.length === 0;
};

/**
 * Görüntünün histogram eğrilik analizi (advanced)
 */
export const analyzeHistogramShape = (histogram: number[]): {
  skewness: number;
  kurtosis: number;
  balanced: boolean;
} => {
  const totalPixels = histogram.reduce((sum, count) => sum + count, 0);

  // Ortalama
  let mean = 0;
  for (let i = 0; i < 256; i++) {
    mean += (i / 255) * histogram[i];
  }
  mean /= totalPixels;

  // Moment hesaplamaları
  let m2 = 0,
    m3 = 0,
    m4 = 0;

  for (let i = 0; i < 256; i++) {
    const normalized = i / 255;
    const diff = normalized - mean;
    const count = histogram[i];

    m2 += diff ** 2 * count;
    m3 += diff ** 3 * count;
    m4 += diff ** 4 * count;
  }

  m2 /= totalPixels;
  m3 /= totalPixels;
  m4 /= totalPixels;

  // Skewness (asimetri)
  const skewness = m3 / Math.pow(m2, 1.5);

  // Kurtosis (sivrilik)
  const kurtosis = m4 / (m2 ** 2) - 3;

  // Dengelilik kontrolü
  const balanced = Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 1;

  return {
    skewness,
    kurtosis,
    balanced,
  };
};

/**
 * Basit simüle edilmiş görüntü verisi oluştur (test için)
 */
export const createSimulatedImageData = (
  width: number,
  height: number,
  brightness: number = 0.5
): ImageData => {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const value = Math.round(brightness * 255 + (Math.random() - 0.5) * 30);
    const clampedValue = Math.max(0, Math.min(255, value));

    data[i * 4] = clampedValue;     // R
    data[i * 4 + 1] = clampedValue; // G
    data[i * 4 + 2] = clampedValue; // B
    data[i * 4 + 3] = 255;          // A
  }

  return {
    width,
    height,
    data,
  };
};
