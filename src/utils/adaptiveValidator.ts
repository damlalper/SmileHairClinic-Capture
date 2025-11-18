/**
 * ADAPTIF VALIDATOR - Akıllı Doğrulama
 * Hysteresis mekanizması ile threshold oscillation sorunu çözülüyor
 */

interface ValidationCriteria {
  pitch: number;
  roll: number;
  yaw: number;
  distance: number;
  faceWidthPercent: number;
  sharpness: number;
  brightness: number;
  contrast: number;
  eyesOpenPercent: number;
  faceCenteredX: number;
  faceCenteredY: number;
}

interface ValidityStatus {
  isValid: boolean;
  accuracy: number;
  shouldCountdown: boolean;
  failureReasons: string[];
  metrics: {
    pitchScore: number;
    rollScore: number;
    yawScore: number;
    distanceScore: number;
    faceWidthScore: number;
    imageQualityScore: number;
    faceCenteringScore: number;
  };
}

export const VALIDATION_TARGETS = {
  pitch: { min: 85, target: 90, max: 95, tolerance: 5 },
  roll: { min: -5, target: 0, max: 5, tolerance: 5 },
  yaw: { min: -10, target: 0, max: 10, tolerance: 10 },
  distance: { min: 35, target: 40, max: 45, tolerance: 5 },
  faceWidth: { min: 30, target: 40, max: 50, tolerance: 10 },
  sharpness: { min: 75, target: 85, max: 100 },
  brightness: { min: 80, target: 120, max: 150 },
  contrast: { min: 40, target: 60, max: 100 },
  faceCenter: { tolerance: 15 },
  eyesOpen: { min: 80 },
};

export class AdaptiveValidator {
  private validityBuffer: boolean[] = [];
  private readonly BUFFER_SIZE = 30;
  private hysteresisState = { isValid: false, lastChangeTime: Date.now() };
  private thresholds = { validThreshold: 60, transitionThreshold: 70, hysteresisBand: 5 };

  constructor(
    private readonly screenWidth: number,
    private readonly screenHeight: number
  ) {}

  validate(criteria: ValidationCriteria): ValidityStatus {
    const scores = {
      pitchScore: this.scorePitch(criteria.pitch),
      rollScore: this.scoreRoll(criteria.roll),
      yawScore: this.scoreYaw(criteria.yaw),
      distanceScore: this.scoreDistance(criteria.distance),
      faceWidthScore: this.scoreFaceWidth(criteria.faceWidthPercent),
      sharpnessScore: this.scoreSharpness(criteria.sharpness),
      brightnessScore: this.scoreBrightness(criteria.brightness),
      contrastScore: this.scoreContrast(criteria.contrast),
      eyesScore: this.scoreEyesOpen(criteria.eyesOpenPercent),
      faceCenterXScore: this.scoreFaceCenter(criteria.faceCenteredX),
      faceCenterYScore: this.scoreFaceCenter(criteria.faceCenteredY),
    };

    const weights = {
      pitch: 0.2, roll: 0.2, yaw: 0.1, distance: 0.15,
      faceWidth: 0.1, imageQuality: 0.1, faceCentering: 0.05, eyes: 0.1,
    };

    const imageQualityScore = (scores.sharpnessScore + scores.brightnessScore + scores.contrastScore) / 3;
    const faceCenteringScore = (scores.faceCenterXScore + scores.faceCenterYScore) / 2;

    const accuracy = Math.round(
      scores.pitchScore * weights.pitch +
      scores.rollScore * weights.roll +
      scores.yawScore * weights.yaw +
      scores.distanceScore * weights.distance +
      scores.faceWidthScore * weights.faceWidth +
      imageQualityScore * weights.imageQuality +
      faceCenteringScore * weights.faceCentering +
      scores.eyesScore * weights.eyes
    );

    const failureReasons = this.getFailureReasons(criteria, scores);
    const isValid = this.applyHysteresis(accuracy);
    this.validityBuffer.push(isValid);
    if (this.validityBuffer.length > this.BUFFER_SIZE) {
      this.validityBuffer.shift();
    }

    const isBaselineValid = this.checkBaselineValidity();
    const shouldCountdown = isValid && isBaselineValid && accuracy >= 75;

    return {
      isValid, accuracy, shouldCountdown, failureReasons,
      metrics: {
        pitchScore: Math.round(scores.pitchScore),
        rollScore: Math.round(scores.rollScore),
        yawScore: Math.round(scores.yawScore),
        distanceScore: Math.round(scores.distanceScore),
        faceWidthScore: Math.round(scores.faceWidthScore),
        imageQualityScore: Math.round(imageQualityScore),
        faceCenteringScore: Math.round(faceCenteringScore),
      },
    };
  }

  private applyHysteresis(accuracy: number): boolean {
    const validThreshold = this.thresholds.validThreshold;
    const band = this.thresholds.hysteresisBand;

    if (this.hysteresisState.isValid) {
      if (accuracy < validThreshold - band) {
        this.hysteresisState.isValid = false;
        this.hysteresisState.lastChangeTime = Date.now();
      }
    } else if (accuracy > validThreshold + band) {
      this.hysteresisState.isValid = true;
      this.hysteresisState.lastChangeTime = Date.now();
    }
    return this.hysteresisState.isValid;
  }

  private checkBaselineValidity(): boolean {
    if (this.validityBuffer.length < this.BUFFER_SIZE / 2) return false;
    const validCount = this.validityBuffer.filter(Boolean).length;
    return validCount >= Math.floor(this.BUFFER_SIZE * 0.66);
  }

  private scorePitch(pitch: number): number {
    const target = VALIDATION_TARGETS.pitch.target;
    const tol = VALIDATION_TARGETS.pitch.tolerance;
    const dev = Math.abs(pitch - target);
    return dev > tol ? 0 : ((tol - dev) / tol) * 100;
  }

  private scoreRoll(roll: number): number {
    const target = VALIDATION_TARGETS.roll.target;
    const tol = VALIDATION_TARGETS.roll.tolerance;
    const dev = Math.abs(roll - target);
    return dev > tol ? 0 : ((tol - dev) / tol) * 100;
  }

  private scoreYaw(yaw: number): number {
    const target = VALIDATION_TARGETS.yaw.target;
    const tol = VALIDATION_TARGETS.yaw.tolerance;
    const dev = Math.abs(yaw - target);
    return dev > tol ? 0 : ((tol - dev) / tol) * 100;
  }

  private scoreDistance(distance: number): number {
    const min = VALIDATION_TARGETS.distance.min;
    const max = VALIDATION_TARGETS.distance.max;
    if (distance < min || distance > max) return 0;
    const norm = (distance - min) / (max - min);
    return Math.sin(norm * Math.PI) * 100;
  }

  private scoreFaceWidth(widthPercent: number): number {
    const min = VALIDATION_TARGETS.faceWidth.min;
    const max = VALIDATION_TARGETS.faceWidth.max;
    if (widthPercent < min || widthPercent > max) return 0;
    const norm = (widthPercent - min) / (max - min);
    return Math.sin(norm * Math.PI) * 100;
  }

  private scoreSharpness(sharpness: number): number {
    const min = VALIDATION_TARGETS.sharpness.min;
    return sharpness < min ? 0 : Math.min(100, (sharpness / 100) * 100);
  }

  private scoreBrightness(brightness: number): number {
    const min = VALIDATION_TARGETS.brightness.min;
    const max = VALIDATION_TARGETS.brightness.max;
    if (brightness < min || brightness > max) return 0;
    const norm = (brightness - min) / (max - min);
    return Math.sin(norm * Math.PI) * 100;
  }

  private scoreContrast(contrast: number): number {
    const min = VALIDATION_TARGETS.contrast.min;
    return contrast < min ? 0 : Math.min(100, (contrast / 100) * 100);
  }

  private scoreEyesOpen(eyesOpenPercent: number): number {
    const min = VALIDATION_TARGETS.eyesOpen.min;
    return eyesOpenPercent < min ? 0 : Math.min(100, eyesOpenPercent);
  }

  private scoreFaceCenter(offset: number): number {
    const tol = VALIDATION_TARGETS.faceCenter.tolerance;
    const abs = Math.abs(offset);
    return abs > tol ? 0 : ((tol - abs) / tol) * 100;
  }

  private getFailureReasons(criteria: ValidationCriteria, scores: Record<string, number>): string[] {
    const reasons: string[] = [];
    const angleMsg = this.getAngleMessage(criteria, scores);
    const posMsg = this.getPositionMessage(criteria, scores);
    const qualMsg = this.getQualityMessage(criteria, scores);

    if (angleMsg) reasons.push(angleMsg);
    if (posMsg) reasons.push(posMsg);
    if (qualMsg) reasons.push(qualMsg);

    return reasons;
  }

  private getAngleMessage(criteria: ValidationCriteria, scores: Record<string, number>): string | null {
    if (scores.pitchScore < 50) {
      return criteria.pitch < 85 ? 'Telefonu ayaga dik tut' : 'Telefonu biraz yatir';
    }
    if (scores.rollScore < 50) {
      return criteria.roll > 5 ? 'Telefonu sola dondur' : 'Telefonu saga dondur';
    }
    if (scores.yawScore < 50) {
      return 'Basini duz bak';
    }
    return null;
  }

  private getPositionMessage(criteria: ValidationCriteria, scores: Record<string, number>): string | null {
    if (scores.distanceScore < 50) {
      return criteria.distance < 35 ? 'Cok yakin! Geri git' : 'Cok uzak! Ileri gel';
    }
    if (scores.faceWidthScore < 50) {
      return criteria.faceWidthPercent < 30 ? 'Yuzu buyut' : 'Yuzu kucult';
    }
    if (scores.faceCenterXScore < 50 || scores.faceCenterYScore < 50) {
      return 'Yuzunu ortaya al';
    }
    return null;
  }

  private getQualityMessage(criteria: ValidationCriteria, scores: Record<string, number>): string | null {
    if (scores.sharpnessScore < 50) {
      return 'Telefonu stabil tut';
    }
    if (scores.brightnessScore < 50) {
      return criteria.brightness < 80 ? 'Aydinlik yerine git' : 'Golgeye gec';
    }
    if (scores.contrastScore < 50) {
      return 'Iyi kontrastli yerde cek';
    }
    if (scores.eyesScore < 50) {
      return 'Gozlerini ac';
    }
    return null;
  }

  reset(): void {
    this.validityBuffer = [];
    this.hysteresisState = { isValid: false, lastChangeTime: Date.now() };
  }

  setThresholds(config: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...config };
  }

  getBufferStats() {
    const total = this.validityBuffer.length;
    const valid = this.validityBuffer.filter(Boolean).length;
    return {
      totalFrames: total,
      validFrames: valid,
      invalidFrames: total - valid,
      validityPercentage: total === 0 ? 0 : Math.round((valid / total) * 100),
    };
  }
}

export type { ValidationCriteria, ValidityStatus };
