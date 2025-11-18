import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CaptureAngle } from '../types';
import { COLORS, CAPTURE_SEQUENCE } from '../constants/angles';
import { usePhotos } from '../context/PhotoContext';

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { clearPhotos } = usePhotos();

  const startCapture = () => {
    // Clear any previous photos
    clearPhotos();

    // Start with the first angle in the sequence
    const firstAngle = CAPTURE_SEQUENCE[0];
    navigation.navigate('Instructions', { angle: firstAngle });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[COLORS.primary, '#1a3a6b', '#0f2547']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>SMILE HAIR CLINIC</Text>
            <Text style={styles.subtitle}>Smart Self-Capture Tool</Text>
          </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📸</Text>
          </View>
          <Text style={styles.title}>
            Saç Analizi Fotoğraflarınızı Profesyonel Şekilde Çekin
          </Text>
          <Text style={styles.description}>
            Uygulama sizi 5 farklı açıdan yönlendirecek ve otomatik olarak
            fotoğraflarınızı çekecektir.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Özellikler</Text>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎯</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Akıllı Yönlendirme</Text>
              <Text style={styles.featureDescription}>
                Telefonunuzun konumunu anlık olarak algılar ve doğru pozisyona
                yönlendirir
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🤖</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Otomatik Çekim</Text>
              <Text style={styles.featureDescription}>
                Doğru pozisyona geldiğinizde fotoğraf otomatik olarak çekilir
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔊</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Sesli Rehber</Text>
              <Text style={styles.featureDescription}>
                Ekrana bakmasanız bile doğru açıya ne kadar yakın olduğunuzu
                hissedebilirsiniz
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>⏱️</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Hızlı Süreç</Text>
              <Text style={styles.featureDescription}>
                Tüm çekim süreci 2 dakikadan kısa sürer
              </Text>
            </View>
          </View>
        </View>

        {/* 5 Angles Info */}
        <View style={styles.anglesSection}>
          <Text style={styles.anglesTitle}>5 Açıdan Çekim</Text>
          <View style={styles.anglesList}>
            <Text style={styles.angleItem}>✓ Tam Yüz Karşıdan</Text>
            <Text style={styles.angleItem}>✓ 45° Sağa Bakarken</Text>
            <Text style={styles.angleItem}>✓ 45° Sola Bakarken</Text>
            <Text style={styles.angleItem}>✓ Tepe Kısmı (Vertex)</Text>
            <Text style={styles.angleItem}>✓ Arka Donör Bölgesi</Text>
          </View>
        </View>

        {/* NEW: Camera Cleaning Warning */}
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>🧹</Text>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Kameranızı Temizleyin!</Text>
            <Text style={styles.warningText}>
              Başlamadan önce arka kamera lensini temiz bir bezle silin. Net fotoğraflar için çok önemli!
            </Text>
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity style={styles.startButton} onPress={startCapture}>
          <Text style={styles.startButtonText}>Fotoğraf Çekimine Başla</Text>
        </TouchableOpacity>

          {/* Footer */}
          <Text style={styles.footer}>
            Çekim sırasında aydınlık bir ortamda olduğunuzdan emin olun
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  logo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  featuresSection: {
    marginBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 16,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    opacity: 0.85,
  },
  anglesSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  anglesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  anglesList: {
    gap: 8,
  },
  angleItem: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 6,
    opacity: 0.95,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 18,
  },
  startButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  startButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
    marginTop: 8,
  },
});
