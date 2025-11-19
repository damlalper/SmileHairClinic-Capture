/**
 * ═══════════════════════════════════════════════════════════════════
 * BACK DONOR CAPTURE SCREEN - WRAPPER
 * ═══════════════════════════════════════════════════════════════════
 *
 * This is a simple wrapper that redirects to the universal CameraScreen
 * with the BACK_DONOR angle parameter.
 *
 * All capture logic, validation, and UI is handled by CameraScreen.
 * BACK_DONOR uses sensor-only validation (no face detection).
 */

import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CaptureAngle, RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'BackDonorCapture'>;

const BackDonorCaptureScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    // Immediately navigate to CameraScreen with BACK_DONOR angle
    navigation.replace('Camera', { angle: CaptureAngle.BACK_DONOR });
  }, [navigation]);

  // Return null as we're immediately navigating away
  return null;
};

export default BackDonorCaptureScreen;
