/**
 * ═══════════════════════════════════════════════════════════════════
 * SİLÜET EŞLEŞME SİSTEMİ (IoU TABANLI)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Profesyonel kamera yazılımlarında kullanılan endüstri standardı
 *
 * Template Matching: Mask-Silhouette IoU (Intersection Over Union)
 * - IoU > 0.55 → DOĞRU
 * - IoU > 0.70 → MÜKEMMEL
 *
 * Dokümantasyon: advanced-capture-try.md
 */

import { IOU_THRESHOLDS } from '../constants/angles';

// ═══════════════════════════════════════════════════════════════════
// TİPLER VE ARAYÜZLER
// ═══════════════════════════════════════════════════════════════════

export interface Mask {
  width: number;
  height: number;
  data: boolean[][] | Uint8Array; // 2D boolean array veya binary data
}

export interface IoUResult {
  iou: number;              // IoU skoru (0-1)
  intersection: number;     // Kesişim alanı (piksel)
  union: number;            // Birleşim alanı (piksel)
  quality: 'PERFECT' | 'GOOD' | 'ACCEPTABLE' | 'POOR';
  aligned: boolean;         // Silüet hizalı mı?
  recommendation: string;   // Kullanıcı geri bildirimi
}

export interface Point {
  x: number;
  y: number;
}

export interface Contour {
  points: Point[];
  area: number;
  centroid: Point;
}

// ═══════════════════════════════════════════════════════════════════
// IoU (INTERSECTION OVER UNION) HESAPLAMA
// ═══════════════════════════════════════════════════════════════════

/**
 * İki mask arasında IoU hesapla
 * Profesyonel shape matching metodu
 */
export const calculateIoU = (
  segmentationMask: Mask,
  templateMask: Mask
): IoUResult => {
  // Maskeler aynı boyutta değilse hata ver
  if (
    segmentationMask.width !== templateMask.width ||
    segmentationMask.height !== templateMask.height
  ) {
    console.warn('Mask dimensions do not match. Resizing may be needed.');
    return {
      iou: 0,
      intersection: 0,
      union: 0,
      quality: 'POOR',
      aligned: false,
      recommendation: 'Mask boyutları uyumsuz',
    };
  }

  let intersection = 0;
  let union = 0;

  const width = segmentationMask.width;
  const height = segmentationMask.height;

  // Her piksel için IoU hesapla
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const segPixel = getMaskPixel(segmentationMask, x, y);
      const templatePixel = getMaskPixel(templateMask, x, y);

      if (segPixel && templatePixel) {
        intersection++; // Her iki mask'te de 1
      }

      if (segPixel || templatePixel) {
        union++; // En az birinde 1
      }
    }
  }

  // IoU = Intersection / Union
  const iou = union > 0 ? intersection / union : 0;

  // Kalite değerlendirmesi
  let quality: 'PERFECT' | 'GOOD' | 'ACCEPTABLE' | 'POOR';
  let aligned: boolean;
  let recommendation: string;

  if (iou >= IOU_THRESHOLDS.PERFECT) {
    quality = 'PERFECT';
    aligned = true;
    recommendation = 'Mükemmel hizalama! Fotoğraf çekilebilir.';
  } else if (iou >= IOU_THRESHOLDS.ACCEPTABLE) {
    quality = 'GOOD';
    aligned = true;
    recommendation = 'İyi hizalama. Pozisyonu koruyun.';
  } else if (iou >= IOU_THRESHOLDS.MINIMUM) {
    quality = 'ACCEPTABLE';
    aligned = false;
    recommendation = 'Kabul edilebilir. Biraz daha hizalayın.';
  } else {
    quality = 'POOR';
    aligned = false;
    recommendation = 'Zayıf hizalama. Silüeti takip edin.';
  }

  return {
    iou,
    intersection,
    union,
    quality,
    aligned,
    recommendation,
  };
};

/**
 * Mask'ten piksel değeri al
 */
const getMaskPixel = (mask: Mask, x: number, y: number): boolean => {
  if (Array.isArray(mask.data)) {
    // 2D boolean array
    return mask.data[y]?.[x] ?? false;
  } else {
    // Uint8Array (1D array, row-major order)
    const index = y * mask.width + x;
    return mask.data[index] > 0;
  }
};

// ═══════════════════════════════════════════════════════════════════
// CONTOUR EŞLEŞTİRME
// ═══════════════════════════════════════════════════════════════════

/**
 * Mask'ten contour çıkar
 */
export const extractContour = (mask: Mask): Contour => {
  const points: Point[] = [];
  let area = 0;

  // Basit contour extraction (edge detection)
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      const pixel = getMaskPixel(mask, x, y);

      if (pixel) {
        area++;

        // Kenar pikseli mi? (komşularından en az biri 0)
        const isEdge =
          !getMaskPixel(mask, x - 1, y) ||
          !getMaskPixel(mask, x + 1, y) ||
          !getMaskPixel(mask, x, y - 1) ||
          !getMaskPixel(mask, x, y + 1);

        if (isEdge) {
          points.push({ x, y });
        }
      }
    }
  }

  // Centroid hesapla
  const centroid = calculateCentroid(points);

  return {
    points,
    area,
    centroid,
  };
};

/**
 * Centroid (merkez nokta) hesapla
 */
const calculateCentroid = (points: Point[]): Point => {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const sum = points.reduce(
    (acc, p) => ({
      x: acc.x + p.x,
      y: acc.y + p.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
};

/**
 * İki contour arasındaki merkez uzaklığı
 */
export const calculateCentroidDistance = (
  contour1: Contour,
  contour2: Contour
): number => {
  const dx = contour1.centroid.x - contour2.centroid.x;
  const dy = contour1.centroid.y - contour2.centroid.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// ═══════════════════════════════════════════════════════════════════
// SİLÜET HIZALAMA SKORU
// ═══════════════════════════════════════════════════════════════════

/**
 * Silüet hizalama skoru (IoU + Centroid distance kombinasyonu)
 */
export const calculateAlignmentScore = (
  segmentationMask: Mask,
  templateMask: Mask
): {
  score: number;        // 0-100 arası skor
  iou: number;
  centroidOffset: number;
  feedback: string;
} => {
  // IoU hesapla
  const iouResult = calculateIoU(segmentationMask, templateMask);

  // Contour'ları çıkar
  const segContour = extractContour(segmentationMask);
  const templateContour = extractContour(templateMask);

  // Merkez uzaklığı
  const centroidDistance = calculateCentroidDistance(segContour, templateContour);

  // Normalize centroid offset (0-1 arası)
  const maxDistance = Math.sqrt(
    segmentationMask.width ** 2 + segmentationMask.height ** 2
  );
  const centroidOffset = centroidDistance / maxDistance;

  // Birleşik skor hesapla (IoU %70, Centroid %30)
  const iouScore = iouResult.iou * 100;
  const centroidScore = Math.max(0, (1 - centroidOffset) * 100);

  const score = iouScore * 0.7 + centroidScore * 0.3;

  let feedback = '';
  if (score >= 90) {
    feedback = 'Mükemmel hizalama!';
  } else if (score >= 75) {
    feedback = 'İyi hizalama';
  } else if (score >= 60) {
    feedback = 'Kabul edilebilir';
  } else {
    feedback = 'Silüeti daha iyi hizalayın';
  }

  return {
    score,
    iou: iouResult.iou,
    centroidOffset,
    feedback,
  };
};

// ═══════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════

/**
 * Binary image'den mask oluştur (placeholder)
 */
export const createMaskFromBinary = (
  binaryImage: Uint8Array,
  width: number,
  height: number
): Mask => {
  return {
    width,
    height,
    data: binaryImage,
  };
};

/**
 * Boş mask oluştur
 */
export const createEmptyMask = (width: number, height: number): Mask => {
  const data: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  return {
    width,
    height,
    data,
  };
};

/**
 * Dikdörtgen silüet oluştur (test için)
 */
export const createRectangleSilhouette = (
  width: number,
  height: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): Mask => {
  const mask = createEmptyMask(width, height);

  if (Array.isArray(mask.data)) {
    for (let y = rectY; y < rectY + rectHeight && y < height; y++) {
      for (let x = rectX; x < rectX + rectWidth && x < width; x++) {
        if (y >= 0 && x >= 0) {
          mask.data[y][x] = true;
        }
      }
    }
  }

  return mask;
};

/**
 * Oval silüet oluştur (yüz için)
 */
export const createOvalSilhouette = (
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number
): Mask => {
  const mask = createEmptyMask(width, height);

  if (Array.isArray(mask.data)) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const normalizedX = (x - centerX) / radiusX;
        const normalizedY = (y - centerY) / radiusY;

        // Elips formülü: (x/rx)² + (y/ry)² <= 1
        if (normalizedX ** 2 + normalizedY ** 2 <= 1) {
          mask.data[y][x] = true;
        }
      }
    }
  }

  return mask;
};
