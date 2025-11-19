/**
 * ═══════════════════════════════════════════════════════════════════
 * SILHOUETTE MATCHING - IoU (Intersection over Union)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Professional camera app standard:
 * - Template overlay (ideal silhouette)
 * - Segmentation mask (detected face/head)
 * - IoU calculation for alignment accuracy
 *
 * IoU Thresholds:
 * - > 0.70 → PERFECT
 * - > 0.55 → ACCEPTABLE
 * - < 0.55 → NEEDS ADJUSTMENT
 */

import { IOU_THRESHOLDS } from '../constants/angles';
import { CaptureAngle } from '../types';

export interface SilhouetteMatchResult {
  iou: number; // 0-1
  isAcceptable: boolean;
  isPerfect: boolean;
  feedback: string;
  offsetX: number; // Horizontal offset from center (-1 to 1)
  offsetY: number; // Vertical offset from center (-1 to 1)
}

/**
 * Bounding box interface
 */
export interface BoundingBox {
  x: number; // Left edge
  y: number; // Top edge
  width: number;
  height: number;
}

/**
 * Calculate IoU between face mask and template silhouette
 */
export function calculateSilhouetteMatch(
  faceMask: BoundingBox,
  templateSilhouette: BoundingBox,
  angle: CaptureAngle
): SilhouetteMatchResult {
  // Calculate intersection area
  const intersection = calculateIntersection(faceMask, templateSilhouette);

  // Calculate union area
  const union = calculateUnion(faceMask, templateSilhouette);

  // Calculate IoU
  const iou = union > 0 ? intersection / union : 0;

  // Validate against thresholds
  const isPerfect = iou >= IOU_THRESHOLDS.PERFECT;
  const isAcceptable = iou >= IOU_THRESHOLDS.ACCEPTABLE;

  // Calculate offsets for guidance
  const offsetX = calculateHorizontalOffset(faceMask, templateSilhouette);
  const offsetY = calculateVerticalOffset(faceMask, templateSilhouette);

  // Generate feedback
  const feedback = generateAlignmentFeedback(iou, offsetX, offsetY, angle);

  return {
    iou,
    isAcceptable,
    isPerfect,
    feedback,
    offsetX,
    offsetY,
  };
}

/**
 * Calculate intersection area
 */
function calculateIntersection(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  const width = Math.max(0, x2 - x1);
  const height = Math.max(0, y2 - y1);

  return width * height;
}

/**
 * Calculate union area
 */
function calculateUnion(box1: BoundingBox, box2: BoundingBox): number {
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const intersection = calculateIntersection(box1, box2);

  return area1 + area2 - intersection;
}

/**
 * Calculate horizontal offset (-1 = too left, 0 = centered, +1 = too right)
 */
function calculateHorizontalOffset(faceMask: BoundingBox, template: BoundingBox): number {
  const faceCenterX = faceMask.x + faceMask.width / 2;
  const templateCenterX = template.x + template.width / 2;
  const offset = (faceCenterX - templateCenterX) / template.width;
  return Math.max(-1, Math.min(1, offset));
}

/**
 * Calculate vertical offset (-1 = too high, 0 = centered, +1 = too low)
 */
function calculateVerticalOffset(faceMask: BoundingBox, template: BoundingBox): number {
  const faceCenterY = faceMask.y + faceMask.height / 2;
  const templateCenterY = template.y + template.height / 2;
  const offset = (faceCenterY - templateCenterY) / template.height;
  return Math.max(-1, Math.min(1, offset));
}

/**
 * Generate alignment feedback
 */
function generateAlignmentFeedback(
  iou: number,
  offsetX: number,
  offsetY: number,
  angle: CaptureAngle
): string {
  if (iou >= IOU_THRESHOLDS.PERFECT) {
    return '✨ Mükemmel hizalama!';
  }

  if (iou >= IOU_THRESHOLDS.ACCEPTABLE) {
    return '✓ İyi hizalama';
  }

  // Generate directional guidance
  const horizontalFeedback = getHorizontalFeedback(offsetX);
  const verticalFeedback = getVerticalFeedback(offsetY);

  if (horizontalFeedback && verticalFeedback) {
    return `${horizontalFeedback} ve ${verticalFeedback}`;
  }

  if (horizontalFeedback) {
    return horizontalFeedback;
  }

  if (verticalFeedback) {
    return verticalFeedback;
  }

  return '📍 Silüeti hizalayın';
}

/**
 * Get horizontal feedback
 */
function getHorizontalFeedback(offsetX: number): string {
  if (offsetX < -0.15) {
    return '← Sola kaydırın';
  }
  if (offsetX > 0.15) {
    return 'Sağa kaydırın →';
  }
  return '';
}

/**
 * Get vertical feedback
 */
function getVerticalFeedback(offsetY: number): string {
  if (offsetY < -0.15) {
    return '↑ Yukarı kaydırın';
  }
  if (offsetY > 0.15) {
    return '↓ Aşağı kaydırın';
  }
  return '';
}

/**
 * Get template silhouette for angle
 * Returns ideal bounding box position for each angle
 */
export function getTemplateSilhouette(
  angle: CaptureAngle,
  screenWidth: number,
  screenHeight: number
): BoundingBox {
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;

  switch (angle) {
    case CaptureAngle.FRONT:
    case CaptureAngle.RIGHT_45:
    case CaptureAngle.LEFT_45:
      // Face angles: centered, 30% of screen width
      const faceWidth = screenWidth * 0.3;
      const faceHeight = faceWidth * 1.3; // Aspect ratio
      return {
        x: centerX - faceWidth / 2,
        y: centerY - faceHeight / 2,
        width: faceWidth,
        height: faceHeight,
      };

    case CaptureAngle.VERTEX:
      // Top of head: centered, circular (35% of screen)
      const vertexSize = screenWidth * 0.35;
      return {
        x: centerX - vertexSize / 2,
        y: centerY - vertexSize / 2,
        width: vertexSize,
        height: vertexSize,
      };

    case CaptureAngle.BACK_DONOR:
      // Back of head: centered, slightly wider (40% of screen)
      const donorWidth = screenWidth * 0.4;
      const donorHeight = donorWidth * 1.1;
      return {
        x: centerX - donorWidth / 2,
        y: centerY - donorHeight / 2,
        width: donorWidth,
        height: donorHeight,
      };

    default:
      return {
        x: centerX - 100,
        y: centerY - 130,
        width: 200,
        height: 260,
      };
  }
}

/**
 * Get IoU color for UI feedback
 */
export function getIoUColor(iou: number): string {
  if (iou >= IOU_THRESHOLDS.PERFECT) return '#4CAF50'; // Green - Perfect
  if (iou >= IOU_THRESHOLDS.ACCEPTABLE) return '#8BC34A'; // Light green - Good
  if (iou >= IOU_THRESHOLDS.MINIMUM) return '#FFC107'; // Yellow - Needs improvement
  return '#F44336'; // Red - Poor
}
