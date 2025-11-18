/**
 * AUDIO FEEDBACK SISTEMI
 * 
 * Amaç:
 * - Frekans-adaptif tonlar (0-100% accuracy → 200-800Hz)
 * - Geri sayım sesleri (3-2-1)
 * - Titreşim fallback (haptic)
 * - İnsan faktörü: Sesler öğrenme ve motivasyon sağlar
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface AudioConfig {
  enableSound: boolean;
  enableHaptics: boolean;
  volume: number; // 0-1
  frequency: number; // Hz
  duration: number; // ms
}

interface ToneParams {
  frequency: number;
  duration: number;
  volume: number;
}

/**
 * Web Audio API ile tone generate etmek
 * Safari/Chrome/Android tarafından destekleniyor
 */
class ToneGenerator {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    if (typeof AudioContext !== 'undefined') {
      this.audioContext = new AudioContext();
    } else if (typeof (window as any).webkitAudioContext !== 'undefined') {
      this.audioContext = new (window as any).webkitAudioContext();
    }
  }

  /**
   * Ton üret (Web Audio API)
   * Bu React Native'de doğrudan çalışmaz,
   * expo-av ile dosya-based fallback kullanılır
   */
  playTone(frequency: number, duration: number, volume: number = 0.5): void {
    if (!this.audioContext) {
      console.warn('Web Audio API not available');
      return;
    }

    try {
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.oscillator.frequency.value = frequency;
      this.oscillator.type = 'sine';

      this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + duration / 1000
      );

      this.oscillator.start(this.audioContext.currentTime);
      this.oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Error playing tone:', error);
    }
  }
}

export interface AudioFeedbackSystem {
  playAdaptiveTone(accuracy: number): Promise<void>;
  playCountdownSound(number: number): Promise<void>;
  playCaptureSound(): Promise<void>;
  playErrorSound(): Promise<void>;
  playRadarSound(pitchDelta: number): Promise<void>; // ✅ New radar sound for sensor-only angles
  stop(): Promise<void>;
}

export class AudioFeedback implements AudioFeedbackSystem {
  private config: AudioConfig;
  private toneGenerator: ToneGenerator;
  private isPlaying = false;

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = {
      enableSound: true,
      enableHaptics: true,
      volume: 0.7,
      frequency: 500,
      duration: 200,
      ...config,
    };
    this.toneGenerator = new ToneGenerator();
  }

  /**
   * ADAPTIF TON - Accuracy'ye göre frekans değişir
   *
   * Formül: frequency = 200 + (accuracy/100) * 600
   * - 0% accuracy: 200Hz (düşük, uyarı)
   * - 50% accuracy: 500Hz (orta)
   * - 100% accuracy: 800Hz (yüksek, başarı)
   *
   * Psikoloji: Yüksek frekans başarı hissini verir
   */
  async playAdaptiveTone(accuracy: number): Promise<void> {
    if (!this.config.enableSound && !this.config.enableHaptics) {
      return;
    }

    // Accuracy'yi 0-100 aralığına sınırla
    const clampedAccuracy = Math.max(0, Math.min(100, accuracy));

    // Frekans hesapla: 200Hz (kötü) ila 800Hz (harika)
    const frequency = 200 + (clampedAccuracy / 100) * 600;

    // Süre: Daha iyi accuracy = daha kısa ton
    const duration = Math.max(100, 300 - (clampedAccuracy / 100) * 150);

    // Ton oynat
    if (this.config.enableSound) {
      await this.playTone({ frequency, duration, volume: this.config.volume });
    }

    // Haptic feedback
    if (this.config.enableHaptics) {
      await this.playHapticFeedback(accuracy);
    }
  }

  /**
   * GERI SAYIM SESLERİ - 3-2-1
   * Her sayı farklı frekans ve patternte
   */
  async playCountdownSound(countNumber: number): Promise<void> {
    if (!this.config.enableSound && !this.config.enableHaptics) {
      return;
    }

    // Frekans: 3 = 600Hz, 2 = 700Hz, 1 = 800Hz
    const frequencies: Record<number, number> = { 3: 600, 2: 700, 1: 800 };
    const frequency = frequencies[countNumber] || 500;

    // Süre: Daha düşük sayı = daha uzun
    const duration = 150 + (3 - countNumber) * 50;

    // Ses oynat
    if (this.config.enableSound) {
      await this.playTone({ frequency, duration, volume: 0.8 });
    }

    // Haptic oynat
    if (this.config.enableHaptics && countNumber === 1) {
      // Son (1) sayısında güçlü titreşim
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (this.config.enableHaptics) {
      // 3 ve 2'de hafif titreşim
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  /**
   * ÇEKIM BAŞARISI SESİ - Fotoğraf çekildiğinde
   */
  async playCaptureSound(): Promise<void> {
    if (!this.config.enableSound && !this.config.enableHaptics) {
      return;
    }

    if (this.config.enableSound) {
      // İki notayı birleştir: C (262Hz) + G (392Hz)
      await this.playTone({ frequency: 262, duration: 100, volume: 0.6 });
      // Kısa pause
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.playTone({ frequency: 392, duration: 150, volume: 0.7 });
    }

    if (this.config.enableHaptics) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  /**
   * HATA SESİ - Doğrulama başarısız olduğunda
   */
  async playErrorSound(): Promise<void> {
    if (!this.config.enableSound && !this.config.enableHaptics) {
      return;
    }

    if (this.config.enableSound) {
      // Düşük iki ton: E (165Hz) + C (131Hz)
      await this.playTone({ frequency: 165, duration: 100, volume: 0.5 });
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.playTone({ frequency: 131, duration: 150, volume: 0.5 });
    }

    if (this.config.enableHaptics) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }

  /**
   * TITREŞIM FEEDBACK
   */
  private async playHapticFeedback(accuracy: number): Promise<void> {
    try {
      if (accuracy < 30) {
        // Kötü: Uyarı titreşimi
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (accuracy < 60) {
        // Orta: Hafif titreşim
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (accuracy < 85) {
        // İyi: Orta titreşim
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        // Mükemmel: Güçlü titreşim
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  /**
   * TON OYNAT - Web Audio API
   */
  private async playTone(params: ToneParams): Promise<void> {
    try {
      // React Native'de Web Audio yok, fallback olarak yapabileceğimiz bir şey var mı?
      // expo-av ile dosya oynatmak daha güvenilir
      // Burada sadece mock/simulation yapıyoruz

      // Gerçek implementasyon: Önceden kaydedilmiş WAV dosyaları kullan
      // veya Firebase Cloud Storage'dan indir

      // Şimdilik: Haptics + visual feedback yeterli
      this.toneGenerator.playTone(params.frequency, params.duration, params.volume);
    } catch (error) {
      console.warn('Tone playback failed:', error);
    }
  }

  /**
   * SESI DURDUR
   */
  async stop(): Promise<void> {
    this.isPlaying = false;
  }

  /**
   * RADAR SOUND - Pitch Delta'ya göre hız değişen radar sesi
   *
   * Kullanım: VERTEX ve BACK_DONOR açıları için
   * - pitchDelta küçük (doğru açıya yakın) → hızlı bip bip bip
   * - pitchDelta büyük (yanlış açı) → yavaş ... bip ... bip
   *
   * Örnek:
   * - pitchDelta = 5° → 150ms interval (hızlı)
   * - pitchDelta = 30° → 800ms interval (yavaş)
   */
  async playRadarSound(pitchDelta: number): Promise<void> {
    if (!this.config.enableSound && !this.config.enableHaptics) {
      return;
    }

    // Pitch delta'yı 0-100 accuracy'e çevir
    // pitchDelta: 0° = 100%, 30° = 0%
    const accuracy = Math.max(0, Math.min(100, 100 - (pitchDelta / 30) * 100));

    // Frekans: 300-700Hz arası (radar sesi)
    const frequency = 300 + (accuracy / 100) * 400;

    // Süre: Kısa bip (50-100ms)
    const duration = 60 + (accuracy / 100) * 40;

    // Ton oynat
    if (this.config.enableSound) {
      await this.playTone({ frequency, duration, volume: 0.5 });
    }

    // Haptic: Doğru açıya yaklaştıkça güçlenir
    if (this.config.enableHaptics) {
      if (accuracy > 80) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (accuracy > 50) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }

  /**
   * SESLERI EtkinLEŞTİR/DEVRE DIŞI BIRAKMast
   */
  setSoundEnabled(enabled: boolean): void {
    this.config.enableSound = enabled;
  }

  setHapticsEnabled(enabled: boolean): void {
    this.config.enableHaptics = enabled;
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * ISPLAYING STATE
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

/**
 * SINGLETON INSTANCE
 * Uygulamada tek bir AudioFeedback örneği kullan
 */
let audioFeedbackInstance: AudioFeedback | null = null;

export function getAudioFeedback(config?: Partial<AudioConfig>): AudioFeedback {
  if (!audioFeedbackInstance) {
    audioFeedbackInstance = new AudioFeedback(config);
  }
  return audioFeedbackInstance;
}

export function resetAudioFeedback(): void {
  if (audioFeedbackInstance) {
    audioFeedbackInstance.stop();
    audioFeedbackInstance = null;
  }
}

// Export types
export type { AudioConfig, ToneParams };
