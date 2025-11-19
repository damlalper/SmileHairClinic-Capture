/**
 * ═══════════════════════════════════════════════════════════════════
 * VERTEX (TOP) CAPTURE SCREEN - WRAPPER
 * ═══════════════════════════════════════════════════════════════════
 *
 * This is a simple wrapper that redirects to the universal CameraScreen
 * with the VERTEX angle parameter.
 *
 * All capture logic, validation, and UI is handled by CameraScreen.
 * VERTEX uses sensor-only validation (no face detection).
 */

import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CaptureAngle, RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'VertexCapture'>;

const VertexCaptureScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    // Immediately navigate to CameraScreen with VERTEX angle
    navigation.replace('Camera', { angle: CaptureAngle.VERTEX });
  }, [navigation]);

  // Return null as we're immediately navigating away
  return null;
};

export default VertexCaptureScreen;
