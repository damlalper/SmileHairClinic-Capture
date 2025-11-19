/**
 * ═══════════════════════════════════════════════════════════════════
 * RIGHT 45° PROFILE CAPTURE SCREEN - WRAPPER
 * ═══════════════════════════════════════════════════════════════════
 *
 * This is a simple wrapper that redirects to the universal CameraScreen
 * with the RIGHT_45 angle parameter.
 *
 * All capture logic, validation, and UI is handled by CameraScreen.
 */

import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CaptureAngle, RootStackParamList } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Right45Capture'>;

const Right45CaptureScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    // Immediately navigate to CameraScreen with RIGHT_45 angle
    navigation.replace('Camera', { angle: CaptureAngle.RIGHT_45 });
  }, [navigation]);

  // Return null as we're immediately navigating away
  return null;
};

export default Right45CaptureScreen;
