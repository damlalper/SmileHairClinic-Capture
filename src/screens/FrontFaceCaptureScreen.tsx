/**
 * ═══════════════════════════════════════════════════════════════════
 * FRONT FACE CAPTURE SCREEN - WRAPPER
 * ═══════════════════════════════════════════════════════════════════
 *
 * This is a simple wrapper that redirects to the universal CameraScreen
 * with the FRONT angle parameter.
 *
 * All capture logic, validation, and UI is handled by CameraScreen.
 */

import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CaptureAngle, RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'FrontFaceCapture'>;

const FrontFaceCaptureScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    // Immediately navigate to CameraScreen with FRONT angle
    navigation.replace('Camera', { angle: CaptureAngle.FRONT });
  }, [navigation]);

  // Return null as we're immediately navigating away
  return null;
};

export default FrontFaceCaptureScreen;
