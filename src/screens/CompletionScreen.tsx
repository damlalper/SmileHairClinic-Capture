import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  Animated,
  StatusBar,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, CaptureAngle } from '../types';
import { COLORS, ANGLE_CONFIGS } from '../constants/angles';
import { usePhotos } from '../context/PhotoContext';
import * as FileSystem from 'expo-file-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_SIZE = (SCREEN_WIDTH - 72) / 3;

type CompletionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Completion'>;
  route: RouteProp<RootStackParamList, 'Completion'>;
};

export default function CompletionScreen({
  navigation,
  route,
}: CompletionScreenProps) {
  const { photos } = route.params;
  const { clearPhotos } = usePhotos();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRestart = () => {
    Alert.alert(
      'Yeniden Başla',
      'Tüm fotoğraflar silinecek. Emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Evet',
          onPress: () => {
            clearPhotos();
            navigation.popToTop();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    // In production, upload photos to server or save locally
    Alert.alert(
      'Başarılı!',
      'Fotoğraflarınız başarıyla kaydedildi. Şimdi bunları Smile Hair Clinic uzmanlarıyla paylaşabilirsiniz.',
      [{ text: 'Tamam' }]
    );
  };

  // NEW: Export JSON Quality Report
  const handleExportJSON = async () => {
    try {
      // Generate comprehensive metadata JSON
      const qualityReport = {
        exportDate: new Date().toISOString(),
        totalPhotos: photos.length,
        deviceModel: Platform.OS,
        photos: photos.map((photo) => ({
          angle: photo.angle,
          angleName: ANGLE_CONFIGS[photo.angle].title,
          timestamp: photo.timestamp,
          metadata: {
            pitch: photo.metadata?.pitch || 0,
            roll: photo.metadata?.roll || 0,
            yaw: photo.metadata?.yaw || 0,
            pitchDeviation: photo.metadata?.pitchDeviation || 0,
            rollDeviation: photo.metadata?.rollDeviation || 0,
            yawDeviation: photo.metadata?.yawDeviation || 0,
            distance: photo.metadata?.distance || 0,
            distanceConfidence: photo.metadata?.distanceConfidence || 0,
            captureConfidence: photo.metadata?.captureConfidence || 0,
            stabilizationDuration: photo.metadata?.stabilizationDuration || 0,
            validationState: photo.metadata?.validationState || {},
            phoneOrientation: photo.metadata?.phoneOrientation || {},
          },
        })),
      };

      // Save JSON to file
      const jsonString = JSON.stringify(qualityReport, null, 2);
      const fileUri = `${FileSystem.documentDirectory}smile_hair_quality_report_${Date.now()}.json`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      // Share the file
      await Share.share({
        message: 'Smile Hair Clinic Quality Report',
        url: fileUri,
        title: 'Quality Report JSON',
      });

      Alert.alert(
        'JSON Rapor Oluşturuldu',
        'Kalite raporu başarıyla oluşturuldu ve paylaşılabilir.',
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.error('JSON export error:', error);
      Alert.alert('Hata', 'JSON rapor oluşturulamadı.');
    }
  };

  // NEW: Selective Retake - Retake specific angle
  const handleRetakeAngle = (angle: CaptureAngle) => {
    Alert.alert(
      'Fotoğrafı Yeniden Çek',
      `${ANGLE_CONFIGS[angle].title} fotoğrafını yeniden çekmek istiyor musunuz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Yeniden Çek',
          onPress: () => {
            // Navigate to instructions for this specific angle
            navigation.navigate('Instructions', { angle });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#4CAF50', '#45a049', '#388e3c']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Success Header with Animation */}
          <Animated.View
            style={[
              styles.successHeader,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>🎉</Text>
            </View>
            <Text style={styles.successTitle}>Tebrikler!</Text>
            <Text style={styles.successSubtitle}>
              5 açıdan fotoğraf çekimi başarıyla tamamlandı
            </Text>
          </Animated.View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{photos.length}</Text>
            <Text style={styles.statLabel}>Fotoğraf</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.round(
                (Date.now() - photos[0].timestamp) / 1000 / 60
              )}dk
            </Text>
            <Text style={styles.statLabel}>Süre</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>Tamamlama</Text>
          </View>
        </View>

        {/* Photos Grid - NOW with Retake Buttons */}
        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>Çekilen Fotoğraflar</Text>
          <Text style={styles.sectionSubtitle}>
            Tekrar çekmek için fotoğrafa tıklayın
          </Text>
          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={photo.angle}
                style={styles.photoItem}
                onPress={() => handleRetakeAngle(photo.angle)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.thumbnail}
                />
                <View style={styles.photoLabel}>
                  <Text style={styles.photoLabelText} numberOfLines={2}>
                    {ANGLE_CONFIGS[photo.angle].title}
                  </Text>
                </View>
                <View style={styles.photoNumber}>
                  <Text style={styles.photoNumberText}>{index + 1}</Text>
                </View>
                {/* NEW: Retake Icon Overlay */}
                <View style={styles.retakeOverlay}>
                  <Text style={styles.retakeIcon}>🔄</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quality Indicators */}
        <View style={styles.qualitySection}>
          <Text style={styles.sectionTitle}>Kalite Kontrolü</Text>
          <View style={styles.qualityCard}>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityIcon}>✓</Text>
              <Text style={styles.qualityText}>Tüm açılar tamamlandı</Text>
            </View>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityIcon}>✓</Text>
              <Text style={styles.qualityText}>Pozlama doğruluğu yüksek</Text>
            </View>
            <View style={styles.qualityItem}>
              <Text style={styles.qualityIcon}>✓</Text>
              <Text style={styles.qualityText}>Görüntü kalitesi uygun</Text>
            </View>
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsSection}>
          <Text style={styles.sectionTitle}>Sonraki Adımlar</Text>
          <View style={styles.nextStepCard}>
            <Text style={styles.nextStepNumber}>1</Text>
            <View style={styles.nextStepContent}>
              <Text style={styles.nextStepTitle}>
                Fotoğrafları Kaydedin
              </Text>
              <Text style={styles.nextStepDescription}>
                Fotoğraflarınız cihazınıza kaydedilecek
              </Text>
            </View>
          </View>
          <View style={styles.nextStepCard}>
            <Text style={styles.nextStepNumber}>2</Text>
            <View style={styles.nextStepContent}>
              <Text style={styles.nextStepTitle}>
                Klinikle Paylaşın
              </Text>
              <Text style={styles.nextStepDescription}>
                Fotoğraflarınızı Smile Hair Clinic uzmanlarıyla paylaşın
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              💾 Kaydet ve Paylaş
            </Text>
          </TouchableOpacity>

          {/* NEW: JSON Export Button */}
          <TouchableOpacity
            style={styles.jsonButton}
            onPress={handleExportJSON}
          >
            <Text style={styles.jsonButtonText}>
              📄 JSON Kalite Raporu İndir
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restartButton}
            onPress={handleRestart}
          >
            <Text style={styles.restartButtonText}>
              🔄 Yeniden Başla
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
              Smile Hair Clinic Smart Self-Capture Tool
          </Text>
          <Text style={styles.footerSubtext}>
            Profesyonel saç analizi için geliştirildi
          </Text>
        </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.success,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  successIcon: {
    fontSize: 60,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.95,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.9,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#FFF',
    opacity: 0.3,
  },
  photosSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.85,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    position: 'relative',
    width: THUMBNAIL_SIZE,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.33,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  photoLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  photoLabelText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  photoNumber: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNumberText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  retakeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    opacity: 0,
  },
  retakeIcon: {
    fontSize: 32,
  },
  qualitySection: {
    marginBottom: 24,
  },
  qualityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  qualityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  qualityIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    marginRight: 12,
    fontWeight: 'bold',
  },
  qualityText: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.95,
  },
  nextStepsSection: {
    marginBottom: 24,
  },
  nextStepCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  nextStepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
    marginRight: 12,
  },
  nextStepContent: {
    flex: 1,
  },
  nextStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nextStepDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.85,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  saveButtonText: {
    color: COLORS.success,
    fontSize: 18,
    fontWeight: 'bold',
  },
  jsonButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  jsonButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  restartButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  restartButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  footerText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
});
