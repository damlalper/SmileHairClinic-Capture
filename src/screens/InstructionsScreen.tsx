import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, CaptureAngle } from '../types';
import { COLORS, ANGLE_CONFIGS, CAPTURE_SEQUENCE } from '../constants/angles';

type InstructionsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Instructions'>;
  route: RouteProp<RootStackParamList, 'Instructions'>;
};

export default function InstructionsScreen({
  navigation,
  route,
}: InstructionsScreenProps) {
  const { angle } = route.params;
  const config = ANGLE_CONFIGS[angle];
  const currentIndex = CAPTURE_SEQUENCE.indexOf(angle);
  const totalSteps = CAPTURE_SEQUENCE.length;

  const startCamera = () => {
    navigation.navigate('Camera', { angle });
  };

  // Get emoji for each angle
  const getAngleEmoji = (angle: CaptureAngle): string => {
    switch (angle) {
      case CaptureAngle.FRONT:
        return '😊';
      case CaptureAngle.RIGHT_45:
        return '↗️';
      case CaptureAngle.LEFT_45:
        return '↖️';
      case CaptureAngle.VERTEX:
        return '⬆️';
      case CaptureAngle.BACK_DONOR:
        return '🔙';
      default:
        return '📸';
    }
  };

  // Get angle-specific technical requirements
  const getTechnicalRequirements = (angle: CaptureAngle) => {
    switch (angle) {
      case CaptureAngle.FRONT:
        return {
          pitch: '0° (±5°)',
          roll: '0° (±5°)',
          yaw: '0° (±10°)',
          distance: '30–40 cm',
        };
      case CaptureAngle.RIGHT_45:
        return {
          pitch: '0° (±5°)',
          roll: '0° (±5°)',
          yaw: '40°–50° (sağa)',
          distance: '30–40 cm',
        };
      case CaptureAngle.LEFT_45:
        return {
          pitch: '0° (±5°)',
          roll: '0° (±5°)',
          yaw: '-40° to -50° (sola)',
          distance: '30–40 cm',
        };
      case CaptureAngle.VERTEX:
        return {
          pitch: '-85° to -95° (aşağı)',
          roll: '0° (±5°)',
          yaw: 'Önemli değil',
          distance: '30–45 cm',
        };
      case CaptureAngle.BACK_DONOR:
        return {
          pitch: '-85° to -100° (arkaya)',
          roll: '0° (±5°)',
          yaw: '~180° (arka yön)',
          distance: '30–50 cm',
        };
      default:
        return null;
    }
  };

  const technicalReqs = getTechnicalRequirements(angle);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            Adım {currentIndex + 1} / {totalSteps}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentIndex + 1) / totalSteps) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Angle Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getAngleEmoji(angle)}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.description}</Text>

        {/* Instructions Card */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Nasıl Çekilir?</Text>
          <Text style={styles.instructionsText}>{config.instructions}</Text>

          {/* Target Info */}
          <View style={styles.targetSection}>
            <Text style={styles.targetLabel}>Hedef Alan:</Text>
            <Text style={styles.targetText}>{config.targetArea}</Text>
          </View>
        </View>

        {/* NEW: Technical Requirements Card */}
        {technicalReqs && (
          <View style={styles.technicalCard}>
            <Text style={styles.technicalTitle}>📐 Hedef Telefon Açısı</Text>
            <Text style={styles.technicalSubtitle}>
              AI AutoShot bu değerleri kontrol eder:
            </Text>
            <View style={styles.technicalGrid}>
              <TechnicalItem label="Pitch (Dikey)" value={technicalReqs.pitch} />
              <TechnicalItem label="Roll (Yatay)" value={technicalReqs.roll} />
              <TechnicalItem label="Yaw (Yön)" value={technicalReqs.yaw} />
              <TechnicalItem label="Mesafe" value={technicalReqs.distance} />
            </View>
          </View>
        )}

        {/* NEW: AI AutoShot Explanation Card */}
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>🤖 AI AutoShot Nasıl Çalışır?</Text>
          <Text style={styles.aiSubtitle}>
            Fotoğraf otomatik çekilir, siz sadece pozisyonu koruyun:
          </Text>
          <View style={styles.aiSteps}>
            <AIStep number="1" text="Doğru açı (pitch, roll, yaw)" />
            <AIStep number="2" text="Sabitlik (0.8-1.2 saniye)" />
            <AIStep number="3" text="Mesafe (30-50 cm aralığı)" />
            {angle === CaptureAngle.FRONT && (
              <AIStep number="4" text="Işık kontrolü (yüz için)" />
            )}
            {(angle === CaptureAngle.FRONT || angle === CaptureAngle.RIGHT_45 || angle === CaptureAngle.LEFT_45) && (
              <AIStep number="5" text="Yüz merkezleme (IoU check)" />
            )}
          </View>
          <View style={styles.aiNote}>
            <Text style={styles.aiNoteText}>
              ⏱️ Tüm koşullar sağlanınca geri sayım başlar (3-2-1)
            </Text>
          </View>
        </View>

        {/* Tips for critical angles */}
        {(angle === CaptureAngle.VERTEX ||
          angle === CaptureAngle.BACK_DONOR) && (
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              {angle === CaptureAngle.VERTEX
                ? 'İpucu: Telefonu başınızın tam üzerinde tutun ve ekranda görünen rehberi takip edin.'
                : 'İpucu: Telefonu ayna ile kontrol ederek başınızın arkasına konumlandırın.'}
            </Text>
          </View>
        )}

        {/* Visual Guide */}
        <View style={styles.visualGuide}>
          <Text style={styles.guideTitle}>Ne Göreceksiniz:</Text>
          <View style={styles.guideItems}>
            <Text style={styles.guideItem}>✓ Kamera önizlemesi</Text>
            <Text style={styles.guideItem}>
              ✓ Pozisyon doğruluk göstergesi
            </Text>
            <Text style={styles.guideItem}>✓ Anlık açı barları</Text>
            <Text style={styles.guideItem}>✓ Otomatik çekim (3-2-1)</Text>
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity style={styles.startButton} onPress={startCamera}>
          <Text style={styles.startButtonText}>Çekime Başla →</Text>
        </TouchableOpacity>

        {/* Back Button */}
        {currentIndex === 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Geri Dön</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Component: Technical Item
interface TechnicalItemProps {
  label: string;
  value: string;
}

const TechnicalItem: React.FC<TechnicalItemProps> = ({ label, value }) => (
  <View style={styles.technicalItem}>
    <Text style={styles.technicalLabel}>{label}</Text>
    <Text style={styles.technicalValue}>{value}</Text>
  </View>
);

// Helper Component: AI Step
interface AIStepProps {
  number: string;
  text: string;
}

const AIStep: React.FC<AIStepProps> = ({ number, text }) => (
  <View style={styles.aiStep}>
    <View style={styles.aiStepNumber}>
      <Text style={styles.aiStepNumberText}>{number}</Text>
    </View>
    <Text style={styles.aiStepText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.primary + '20',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  instructionsCard: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  targetSection: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  targetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  targetText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  technicalCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  technicalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 6,
  },
  technicalSubtitle: {
    fontSize: 13,
    color: '#1976D2',
    marginBottom: 14,
  },
  technicalGrid: {
    gap: 10,
  },
  technicalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
  },
  technicalLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  technicalValue: {
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '700',
  },
  aiCard: {
    backgroundColor: '#F3E5F5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CE93D8',
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginBottom: 6,
  },
  aiSubtitle: {
    fontSize: 13,
    color: '#7B1FA2',
    marginBottom: 14,
  },
  aiSteps: {
    gap: 10,
  },
  aiStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiStepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  aiStepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  aiNote: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    borderRadius: 8,
  },
  aiNoteText: {
    fontSize: 13,
    color: '#6A1B9A',
    fontWeight: '600',
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  visualGuide: {
    marginBottom: 24,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  guideItems: {
    gap: 8,
  },
  guideItem: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
