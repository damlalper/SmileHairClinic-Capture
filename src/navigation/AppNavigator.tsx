import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { PhotoProvider } from '../context/PhotoContext';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import InstructionsScreen from '../screens/InstructionsScreen';
import ReviewScreen from '../screens/ReviewScreen';
import CompletionScreen from '../screens/CompletionScreen';
import FrontFaceCaptureScreen from '../screens/FrontFaceCaptureScreen';
import Left45CaptureScreen from '../screens/Left45CaptureScreen';
import Right45CaptureScreen from '../screens/Right45CaptureScreen';
import VertexCaptureScreen from '../screens/VertexCaptureScreen';
import BackDonorCaptureScreen from '../screens/BackDonorCaptureScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <PhotoProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Instructions" component={InstructionsScreen} />
          <Stack.Screen name="FrontFaceCapture" component={FrontFaceCaptureScreen} />
          <Stack.Screen name="Left45Capture" component={Left45CaptureScreen} />
          <Stack.Screen name="Right45Capture" component={Right45CaptureScreen} />
          <Stack.Screen name="VertexCapture" component={VertexCaptureScreen} />
          <Stack.Screen name="BackDonorCapture" component={BackDonorCaptureScreen} />
          <Stack.Screen name="Review" component={ReviewScreen} />
          <Stack.Screen name="Completion" component={CompletionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </PhotoProvider>
  );
}
