/**
 * ═══════════════════════════════════════════════════════════════════
 * PHOTO PREVIEW SCREEN - Review & Retake
 * ═══════════════════════════════════════════════════════════════════
 *
 * After capturing a photo, user can:
 * - Preview the captured photo
 * - Retake (go back to camera)
 * - Continue to next angle
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, CapturedPhoto, CaptureAngle } from '../types';
import { COLORS, CAPTURE_SEQUENCE } from '../constants/angles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type PhotoPreviewScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhotoPreview'>;
  route: RouteProp<RootStackParamList, 'PhotoPreview'>;
};

export default function PhotoPreviewScreen({ navigation, route }: PhotoPreviewScreenProps) {
  const { photo } = route.params;
  const insets = useSafeAreaInsets();

  // Determine next angle
  const currentIndex = CAPTURE_SEQUENCE.indexOf(photo.angle);
  const isLastAngle = currentIndex === CAPTURE_SEQUENCE.length - 1;
  const nextAngle = isLastAngle ? null : CAPTURE_SEQUENCE[currentIndex + 1];

  const handleRetake = () => {
    // Go back to camera with same angle
    navigation.navigate('Camera', { angle: photo.angle });
  };

  const handleContinue = () => {
    if (isLastAngle) {
      // All angles captured, go to Review/Completion
      navigation.navigate('Review');
    } else {
      // Navigate to next angle
      navigation.navigate('Camera', { angle: nextAngle! });
    }
  };

  // Get angle name for display
  const getAngleName = (angle: CaptureAngle): string => {
    switch (angle) {
      case CaptureAngle.FRONT:
        return 'Ön Yüz';
      case CaptureAngle.RIGHT_45:
        return 'Sağ 45°';
      case CaptureAngle.LEFT_45:
        return 'Sol 45°';
      case CaptureAngle.VERTEX:
        return 'Tepe';
      case CaptureAngle.BACK_DONOR:
        return 'Ense';
      default:
        return angle;
    }
  };

  return (
    <View style={styles.container}>
      {/* Photo Preview */}
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: photo.uri }}
          style={styles.photo}
          resizeMode="contain"
        />
      </View>

      {/* Overlay Info */}
      <View style={[styles.topOverlay, { paddingTop: Math.max(insets.top + 10, 20) }]}>
        <Text style={styles.angleTitle}>{getAngleName(photo.angle)}</Text>
        <Text style={styles.timestamp}>
          {new Date(photo.timestamp).toLocaleTimeString('tr-TR')}
        </Text>
      </View>

      {/* Metadata Info (Optional) */}
      {photo.metadata && (
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataText}>
            Pitch: {photo.metadata.pitch.toFixed(1)}° | Roll: {photo.metadata.roll.toFixed(1)}°
          </Text>
          <Text style={styles.metadataText}>
            Mesafe: {photo.metadata.distance}cm
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={[styles.bottomOverlay, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
        <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
          <Text style={styles.retakeButtonText}>🔄 Yeniden Çek</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>
            {isLastAngle ? '✓ Tamamla' : `→ Devam Et${nextAngle ? ` (${getAngleName(nextAngle)})` : ''}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  angleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  metadataContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginVertical: 2,
    fontFamily: 'monospace',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continueButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
