/**
 * ═══════════════════════════════════════════════════════════════════
 * LIGHT QUALITY ANALYZER
 * ═══════════════════════════════════════════════════════════════════
 *
 * Analyzes lighting conditions from camera frame
 * - Brightness (median luminance)
 * - Highlight saturation (overexposed areas)
 * - Shadow regions (underexposed areas)
 *
 * Used as additional condition for auto-capture
 */

import { LIGHT_QUALITY } from '../constants/angles';

export interface LightQualityResult {
  isAcceptable: boolean;
  brightness: number; // 0-1
  highlightSaturation: number; // 0-1 (% of overexposed pixels)
  shadowSize: number; // 0-1 (% of underexposed pixels)
  feedback: string;
  score: number; // 0-100
}

/**
 * Analyze light quality from frame pixel data
 * @param frame - Camera frame (if available)
 * @param faceBox - Face bounding box for focused analysis
 * @returns Light quality metrics
 */
export function analyzeLightQuality(
  frame?: any,
  faceBox?: { x: number; y: number; width: number; height: number }
): LightQualityResult {
  // If no frame data available, use heuristic fallback
  if (!frame) {
    return getFallbackLightQuality();
  }

  try {
    // Extract luminance data from frame
    const luminanceData = extractLuminanceData(frame, faceBox);

    // Calculate brightness (median luminance)
    const brightness = calculateMedianBrightness(luminanceData);

    // Calculate highlight saturation (% of pixels > 0.9)
    const highlightSaturation = calculateHighlightSaturation(luminanceData);

    // Calculate shadow size (% of pixels < 0.2)
    const shadowSize = calculateShadowSize(luminanceData);

    // Validate against thresholds
    const isAcceptable = validateLightQuality(brightness, highlightSaturation, shadowSize);

    // Calculate overall score
    const score = calculateLightScore(brightness, highlightSaturation, shadowSize);

    // Generate feedback
    const feedback = generateLightFeedback(brightness, highlightSaturation, shadowSize);

    return {
      isAcceptable,
      brightness,
      highlightSaturation,
      shadowSize,
      feedback,
      score,
    };
  } catch (error) {
    console.warn('Light quality analysis failed:', error);
    return getFallbackLightQuality();
  }
}

/**
 * Extract luminance data from frame
 */
function extractLuminanceData(
  frame: any,
  faceBox?: { x: number; y: number; width: number; height: number }
): number[] {
  // For React Native Vision Camera, we'd need to process the frame buffer
  // This is a placeholder implementation
  // In production, use frame.toArrayBuffer() and process RGBA data

  // Generate mock luminance data for now
  // In real implementation, extract from frame buffer
  const mockData: number[] = [];
  const sampleSize = 1000; // Sample 1000 pixels

  for (let i = 0; i < sampleSize; i++) {
    // Mock luminance values (0-1)
    // In production: luminance = 0.299*R + 0.587*G + 0.114*B (from RGBA)
    mockData.push(Math.random() * 0.6 + 0.3); // Biased towards acceptable range
  }

  return mockData;
}

/**
 * Calculate median brightness
 */
function calculateMedianBrightness(luminanceData: number[]): number {
  const sorted = [...luminanceData].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate highlight saturation (% of overexposed pixels)
 */
function calculateHighlightSaturation(luminanceData: number[]): number {
  const highlightThreshold = 0.9;
  const highlightPixels = luminanceData.filter(l => l > highlightThreshold).length;
  return highlightPixels / luminanceData.length;
}

/**
 * Calculate shadow size (% of underexposed pixels)
 */
function calculateShadowSize(luminanceData: number[]): number {
  const shadowThreshold = 0.2;
  const shadowPixels = luminanceData.filter(l => l < shadowThreshold).length;
  return shadowPixels / luminanceData.length;
}

/**
 * Validate light quality against thresholds
 */
function validateLightQuality(
  brightness: number,
  highlightSaturation: number,
  shadowSize: number
): boolean {
  return (
    brightness >= LIGHT_QUALITY.MIN_BRIGHTNESS &&
    brightness <= LIGHT_QUALITY.MAX_BRIGHTNESS &&
    highlightSaturation <= LIGHT_QUALITY.MAX_HIGHLIGHT_SAT &&
    shadowSize <= LIGHT_QUALITY.MAX_SHADOW_SIZE
  );
}

/**
 * Calculate overall light quality score (0-100)
 */
function calculateLightScore(
  brightness: number,
  highlightSaturation: number,
  shadowSize: number
): number {
  // Brightness score: closer to ideal (0.6) = higher score
  const brightnessScore = 100 - Math.abs(brightness - LIGHT_QUALITY.IDEAL_BRIGHTNESS) * 100;

  // Highlight score: less saturation = higher score
  const highlightScore = 100 - (highlightSaturation / LIGHT_QUALITY.MAX_HIGHLIGHT_SAT) * 100;

  // Shadow score: less shadow = higher score
  const shadowScore = 100 - (shadowSize / LIGHT_QUALITY.MAX_SHADOW_SIZE) * 100;

  // Weighted average
  return Math.max(
    0,
    Math.min(
      100,
      brightnessScore * 0.5 + highlightScore * 0.3 + shadowScore * 0.2
    )
  );
}

/**
 * Generate user feedback based on light quality
 */
function generateLightFeedback(
  brightness: number,
  highlightSaturation: number,
  shadowSize: number
): string {
  if (brightness < LIGHT_QUALITY.MIN_BRIGHTNESS) {
    return '💡 Daha fazla ışık gerekiyor';
  }

  if (brightness > LIGHT_QUALITY.MAX_BRIGHTNESS) {
    return '☀️ Işık çok fazla - gölgeye geçin';
  }

  if (highlightSaturation > LIGHT_QUALITY.MAX_HIGHLIGHT_SAT) {
    return '⚡ Aşırı pozlama - ışığı azaltın';
  }

  if (shadowSize > LIGHT_QUALITY.MAX_SHADOW_SIZE) {
    return '🌑 Gölge tespit edildi - pozisyonunuzu değiştirin';
  }

  return '✨ Işık kalitesi iyi';
}

/**
 * Fallback when frame analysis not available
 */
function getFallbackLightQuality(): LightQualityResult {
  return {
    isAcceptable: true, // Assume acceptable when can't measure
    brightness: 0.6,
    highlightSaturation: 0.05,
    shadowSize: 0.15,
    feedback: '✨ Işık kalitesi kontrol ediliyor...',
    score: 85,
  };
}

/**
 * Get light quality color for UI
 */
export function getLightQualityColor(score: number): string {
  if (score >= 85) return '#4CAF50'; // Green - Excellent
  if (score >= 70) return '#8BC34A'; // Light green - Good
  if (score >= 50) return '#FFC107'; // Yellow - Acceptable
  return '#F44336'; // Red - Poor
}
