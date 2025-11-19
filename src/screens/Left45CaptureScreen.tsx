/**
 * ═══════════════════════════════════════════════════════════════════
 * LEFT 45° PROFILE CAPTURE SCREEN - WRAPPER
 * ═══════════════════════════════════════════════════════════════════
 *
 * This is a simple wrapper that redirects to the universal CameraScreen
 * with the LEFT_45 angle parameter.
 *
 * All capture logic, validation, and UI is handled by CameraScreen.
 */

import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CaptureAngle, RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Left45Capture'>;

const Left45CaptureScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    // Immediately navigate to CameraScreen with LEFT_45 angle
    navigation.replace('Camera', { angle: CaptureAngle.LEFT_45 });
  }, [navigation]);

  // Return null as we're immediately navigating away
  return null;
};

export default Left45CaptureScreen;
