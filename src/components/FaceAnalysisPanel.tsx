import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FaceAnalysis, FACE_VALIDATION_CRITERIA } from '../utils/faceDetection';

interface FaceAnalysisPanelProps {
  faceAnalysis: FaceAnalysis | null;
  isVisible?: boolean;
  onToggle?: () => void;
}

/**
* Gelişmiş yüz analiz sonuçlarını gösteren panel
* Debug ve kullanıcı geri bildirimi için
*/
export const FaceAnalysisPanel: React.FC<FaceAnalysisPanelProps> = ({
  faceAnalysis,
  isVisible = true,
  onToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!faceAnalysis || !isVisible) {
    return null;
  }

  const togglePanel = () => {
    setIsExpanded(!isExpanded);
    onToggle?.();
  };

  // Skor renkleri
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#00FF00'; // Yeşil
    if (score >= 70) return '#FFFF00'; // Sarı
    if (score >= 50) return '#FFA500'; // Turuncu
    return '#FF0000'; // Kırmızı
  };

  // Durum ikonları
  const getStatusIcon = (isValid: boolean) => {
    return isValid ? '✓' : '✗';
  };

  // Durum renkleri
  const getStatusColor = (isValid: boolean) => {
    return isValid ? '#00FF00' : '#FF0000';
  };

  const renderScoreItem = (label: string, score: number, suffix: string = '%') => (
    <View style={styles.scoreItem}>
      <Text style={styles.scoreLabel}>{label}:</Text>
      <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
        {score.toFixed(1)}{suffix}
      </Text>
    </View>
  );

  const renderStatusItem = (label: string, isValid: boolean, description?: string) => (
    <View style={styles.statusItem}>
      <View style={styles.statusRow}>
        <Text style={[styles.statusIcon, { color: getStatusColor(isValid) }]}>
          {getStatusIcon(isValid)}
        </Text>
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
      {description && (
        <Text style={styles.statusDescription}>{description}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Panel Header */}
      <TouchableOpacity style={styles.header} onPress={togglePanel}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>📊</Text>
          <Text style={styles.headerTitle}>Yüz Analizi</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.alignmentScore, { color: getScoreColor(faceAnalysis.alignmentScore) }]}>
            %{faceAnalysis.alignmentScore.toFixed(0)}
          </Text>
          <Text style={styles.icon}>{isExpanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <ScrollView style={styles.content}>
          {/* Genel Skorlar */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genel Değerlendirme</Text>
            {renderScoreItem('Hizalama Skoru', faceAnalysis.alignmentScore)}
            {renderScoreItem('Işık Kalitesi', faceAnalysis.lightingScore || 0)}
            {renderScoreItem('Netlik Skoru', faceAnalysis.sharpnessScore || 0)}
            {renderScoreItem('Göz Açıklığı', faceAnalysis.eyeOpenScore)}
          </View>

          {/* Yüz Pozisyonu */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yüz Pozisyonu</Text>
            {renderStatusItem(
              'Merkezde',
              faceAnalysis.facePosition.centered,
              `X: ${faceAnalysis.facePosition.x.toFixed(1)}, Y: ${faceAnalysis.facePosition.y.toFixed(1)}`
            )}
            {renderStatusItem(
              'Boyut Uygun',
              faceAnalysis.facePosition.sizeValid || false,
              `Genişlik: ${((faceAnalysis.facePosition.relativeWidth || 0) * 100).toFixed(1)}%`
            )}
          </View>

          {/* Yüz Açıları */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yüz Açıları</Text>
            {renderStatusItem(
              'Roll (Yatay Döndürme)',
              faceAnalysis.faceAngles.roll.valid,
              `${faceAnalysis.faceAngles.roll.angle.toFixed(1)}° (Limit: ±${FACE_VALIDATION_CRITERIA.maxRollAngle}°)`
            )}
            {renderStatusItem(
              'Yaw (Yan Döndürme)',
              faceAnalysis.faceAngles.yaw.valid,
              `${faceAnalysis.faceAngles.yaw.angle.toFixed(1)}° (Limit: ±${FACE_VALIDATION_CRITERIA.maxYawAngle}°)`
            )}
            {renderStatusItem(
              'Pitch (Yukarı/Aşağı)',
              faceAnalysis.faceAngles.pitch.valid,
              `${faceAnalysis.faceAngles.pitch.angle.toFixed(1)}° (Limit: ±${FACE_VALIDATION_CRITERIA.maxPitchAngle}°)`
            )}
          </View>

          {/* Saç Analizi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saç Analizi</Text>
            {renderStatusItem(
              'Saç Çizgisi Görünür',
              faceAnalysis.hairlineVisible
            )}
            {renderScoreItem('Alın Oranı', (1 - faceAnalysis.foreheadExposure) * 100)}
            {renderStatusItem(
              'Gülümseme',
              !faceAnalysis.isSmiling,
              `Olasılık: ${(faceAnalysis.smilingProbability * 100).toFixed(1)}%`
            )}
          </View>

          {/* Kalite Kontrolleri */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kalite Kontrolleri</Text>
            {renderStatusItem(
              'Işık Yeterli',
              (faceAnalysis.lightingScore || 0) >= 70
            )}
            {renderStatusItem(
              'Netlik Yeterli',
              (faceAnalysis.sharpnessScore || 0) >= 70
            )}
            {renderStatusItem(
              'Gözler Açık',
              faceAnalysis.eyeOpenScore >= 80
            )}
          </View>

          {/* Zaman Bilgisi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zaman Bilgisi</Text>
            <Text style={styles.timestamp}>
              Tespit: {new Date(faceAnalysis.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1000,
    maxHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  icon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alignmentScore: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  content: {
    padding: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusItem: {
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
  statusLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  statusDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    marginLeft: 22,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
  },
});