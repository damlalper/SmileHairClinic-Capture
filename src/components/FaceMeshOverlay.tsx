import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { FaceAnalysis, FaceLandmarks } from '../utils/faceDetection';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FaceMeshOverlayProps {
  faceAnalysis: FaceAnalysis | null;
  isPositionValid: boolean;
  alignmentScore: number;
  showLandmarks?: boolean;
  showGuidelines?: boolean;
  showHairline?: boolean;
}

/**
* Yüz mesh ve landmark gösterimi için gelişmiş overlay bileşeni
* MediaPipe benzeri yüz noktaları ve yönergeler çizer
*/
export const FaceMeshOverlay: React.FC<FaceMeshOverlayProps> = ({
  faceAnalysis,
  isPositionValid,
  alignmentScore,
  showLandmarks = true,
  showGuidelines = true,
  showHairline = true,
}) => {
  const svgRef = useRef<Svg>(null);

  if (!faceAnalysis || !faceAnalysis.faceDetected) {
    return null;
  }

  const { landmarks } = faceAnalysis;
  
  // Landmark noktalarını normalize et
  const normalizeLandmarks = (landmarks: FaceLandmarks) => {
    // Tekil noktalar için dizi oluştur
    return {
      leftEye: [{ x: landmarks.leftEye.x, y: landmarks.leftEye.y }],
      rightEye: [{ x: landmarks.rightEye.x, y: landmarks.rightEye.y }],
      noseBase: [{ x: landmarks.noseBase.x, y: landmarks.noseBase.y }],
      lips: [{ x: landmarks.bottomMouth.x, y: landmarks.bottomMouth.y }],
      faceOval: [
        { x: landmarks.leftCheek.x, y: landmarks.leftCheek.y },
        { x: landmarks.rightCheek.x, y: landmarks.rightCheek.y }
      ],
      leftEyebrow: [{ x: landmarks.leftEye.x - 20, y: landmarks.leftEye.y - 20 }],
      rightEyebrow: [{ x: landmarks.rightEye.x + 20, y: landmarks.rightEye.y - 20 }],
      forehead: [{ x: landmarks.noseBase.x, y: Math.max(0, landmarks.noseBase.y - 100) }]
    };
  };

  const normalizedLandmarks = normalizeLandmarks(landmarks);

  // Calculate bounding box from landmarks
  const boundingBox = {
    x: Math.min(landmarks.leftEye.x, landmarks.rightEye.x, landmarks.leftCheek.x, landmarks.rightCheek.x),
    y: Math.min(landmarks.leftEye.y, landmarks.rightEye.y, landmarks.noseBase.y),
    width: Math.max(landmarks.leftEye.x, landmarks.rightEye.x, landmarks.leftCheek.x, landmarks.rightCheek.x) -
           Math.min(landmarks.leftEye.x, landmarks.rightEye.x, landmarks.leftCheek.x, landmarks.rightCheek.x),
    height: Math.max(landmarks.bottomMouth.y, landmarks.leftCheek.y, landmarks.rightCheek.y) -
            Math.min(landmarks.leftEye.y, landmarks.rightEye.y, landmarks.noseBase.y)
  };

  // Calculate face position
  const centerX = (boundingBox.x + boundingBox.width / 2) * screenWidth;
  const centerY = (boundingBox.y + boundingBox.height / 2) * screenHeight;
  const facePosition = {
    centered: Math.abs(centerX - screenWidth / 2) < 50 && Math.abs(centerY - screenHeight / 2) < 50
  };

  // Renk temaları
  const getColorByScore = (score: number) => {
    if (score >= 90) return '#00FF00'; // Yeşil - Mükemmel
    if (score >= 70) return '#FFFF00'; // Sarı - İyi
    if (score >= 50) return '#FFA500'; // Turuncu - Orta
    return '#FF0000'; // Kırmızı - Kötü
  };

  const primaryColor = getColorByScore(alignmentScore);
  const secondaryColor = isPositionValid ? '#00FF00' : '#FF0000';

  // Yüz ovali çizimi
  const renderFaceOval = () => {
    if (!showLandmarks) return null;
    
    const points = normalizedLandmarks.faceOval;
    if (points.length < 2) return null;

    return (
      <Line
        x1={points[0].x * screenWidth}
        y1={points[0].y * screenHeight}
        x2={points[1].x * screenWidth}
        y2={points[1].y * screenHeight}
        stroke={primaryColor}
        strokeWidth="2"
        opacity={0.8}
      />
    );
  };

  // Göz landmark'ları
  const renderEyes = () => {
    if (!showLandmarks) return null;
    
    const leftEyePoint = normalizedLandmarks.leftEye[0];
    const rightEyePoint = normalizedLandmarks.rightEye[0];

    return (
      <>
        <Circle
          cx={leftEyePoint.x * screenWidth}
          cy={leftEyePoint.y * screenHeight}
          r="3"
          fill="#00BFFF"
          opacity={0.9}
        />
        <Circle
          cx={rightEyePoint.x * screenWidth}
          cy={rightEyePoint.y * screenHeight}
          r="3"
          fill="#00BFFF"
          opacity={0.9}
        />
      </>
    );
  };

  // Kaş landmark'ları
  const renderEyebrows = () => {
    if (!showLandmarks) return null;
    
    const leftEyebrowPoint = normalizedLandmarks.leftEyebrow[0];
    const rightEyebrowPoint = normalizedLandmarks.rightEyebrow[0];

    return (
      <>
        <Circle
          cx={leftEyebrowPoint.x * screenWidth}
          cy={leftEyebrowPoint.y * screenHeight}
          r="2"
          fill="#8A2BE2"
          opacity={0.8}
        />
        <Circle
          cx={rightEyebrowPoint.x * screenWidth}
          cy={rightEyebrowPoint.y * screenHeight}
          r="2"
          fill="#8A2BE2"
          opacity={0.8}
        />
      </>
    );
  };

  // Burun landmark'ları
  const renderNose = () => {
    if (!showLandmarks) return null;
    
    const nosePoint = normalizedLandmarks.noseBase[0];

    return (
      <Circle
        cx={nosePoint.x * screenWidth}
        cy={nosePoint.y * screenHeight}
        r="2"
        fill="#FF69B4"
        opacity={0.8}
      />
    );
  };

  // Dudak landmark'ları
  const renderLips = () => {
    if (!showLandmarks) return null;
    
    const lipsPoint = normalizedLandmarks.lips[0];

    return (
      <Circle
        cx={lipsPoint.x * screenWidth}
        cy={lipsPoint.y * screenHeight}
        r="2"
        fill="#FF1493"
        opacity={0.8}
      />
    );
  };

  // Saç çizgisi gösterimi
  const renderHairline = () => {
    if (!showHairline || !faceAnalysis.hairlineVisible) return null;
    
    const foreheadPoint = normalizedLandmarks.forehead[0];

    return (
      <Circle
        cx={foreheadPoint.x * screenWidth}
        cy={foreheadPoint.y * screenHeight}
        r="4"
        fill="#FFD700"
        opacity={0.7}
      />
    );
  };

  // Rehber çizgileri
  const renderGuidelines = () => {
    if (!showGuidelines) return null;

    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    const faceWidth = 200; // Varsayılan değer
    const faceHeight = 250; // Varsayılan değer

    return (
      <>
        {/* Merkez çizgileri */}
        <Line
          x1={centerX - 100}
          y1={centerY}
          x2={centerX + 100}
          y2={centerY}
          stroke={secondaryColor}
          strokeWidth="1"
          opacity={0.5}
          strokeDasharray="5,5"
        />
        <Line
          x1={centerX}
          y1={centerY - 100}
          x2={centerX}
          y2={centerY + 100}
          stroke={secondaryColor}
          strokeWidth="1"
          opacity={0.5}
          strokeDasharray="5,5"
        />

        {/* Yüz sınırlama kutusu */}
        <Path
          d={`M ${boundingBox.x * screenWidth} ${boundingBox.y * screenHeight} 
               L ${(boundingBox.x + boundingBox.width) * screenWidth} ${boundingBox.y * screenHeight}
               L ${(boundingBox.x + boundingBox.width) * screenWidth} ${(boundingBox.y + boundingBox.height) * screenHeight}
               L ${boundingBox.x * screenWidth} ${(boundingBox.y + boundingBox.height) * screenHeight} Z`}
          stroke={primaryColor}
          strokeWidth="3"
          fill="none"
          opacity={0.9}
        />

        {/* Hizalama göstergeleri */}
        {facePosition.centered && (
          <Circle
            cx={centerX}
            cy={centerY}
            r="50"
            stroke={secondaryColor}
            strokeWidth="2"
            fill="none"
            opacity={0.7}
          />
        )}
      </>
    );
  };

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg
        ref={svgRef}
        width={screenWidth}
        height={screenHeight}
        style={styles.svg}
      >
        {renderGuidelines()}
        {renderFaceOval()}
        {renderEyes()}
        {renderEyebrows()}
        {renderNose()}
        {renderLips()}
        {renderHairline()}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  svg: {
    backgroundColor: 'transparent',
  },
});