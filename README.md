# 📸 Smile Hair Clinic - Smart Self-Capture Tool

A React Native mobile application that guides users to capture professional-quality hair/scalp photos from 5 critical angles using AI-powered positioning and automatic shutter.

## 🎯 Project Overview

This MVP was developed for the Smile Hair Clinic Hackathon to solve the challenge of capturing consistent, professional hair analysis photos without clinical assistance.

### Key Features

- ✅ **5-Angle Guided Capture Flow**: Front, Right 45°, Left 45°, Vertex, Back Donor
- ✅ **Real-time Sensor Integration**: Gyroscope + Accelerometer for angle detection
- ✅ **AR Overlay Guides**: Visual head silhouette to align positioning
- ✅ **Automatic Shutter**: Captures when position criteria are met
- ✅ **Audio Feedback**: Radar-style sound guidance
- ✅ **Visual Countdown**: 3-2-1 countdown before capture
- ✅ **Photo Review & Retake**: Quality control at each step
- ✅ **Progress Tracking**: Clear indication of completion status

## 🏗️ Technical Architecture

### Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Navigation**: React Navigation (Native Stack)
- **Camera**: expo-camera
- **Sensors**: expo-sensors (DeviceMotion)
- **Audio**: expo-av
- **Storage**: expo-file-system

### Project Structure

```
smile-hair-capture/
├── src/
│   ├── screens/           # Screen components
│   │   ├── WelcomeScreen.tsx
│   │   ├── InstructionsScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── ReviewScreen.tsx
│   │   └── CompletionScreen.tsx
│   ├── components/        # Reusable components
│   ├── navigation/        # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── hooks/            # Custom React hooks
│   │   └── useSensorData.ts
│   ├── utils/            # Utility functions
│   │   └── positionValidator.ts
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   ├── constants/        # App constants
│   │   └── angles.ts
│   └── assets/           # Images and sounds
├── App.tsx               # Root component
├── app.json             # Expo configuration
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript config
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo Go app on your mobile device (for testing)
- OR Android Studio / Xcode for native builds

### Installation

1. **Navigate to project directory**
   ```bash
   cd smile-hair-capture
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

### Running the App

#### Option 1: Expo Go (Recommended for quick testing)
1. Install Expo Go on your device:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code from the terminal with your camera

3. The app will open in Expo Go

#### Option 2: iOS Simulator (macOS only)
```bash
npm run ios
```

#### Option 3: Android Emulator
```bash
npm run android
```

## 📱 How to Use

### User Flow

1. **Welcome Screen**
   - Overview of features and 5-angle capture process
   - Tap "Fotoğraf Çekimine Başla" to begin

2. **Instructions Screen** (for each angle)
   - Detailed instructions for positioning
   - Tips for critical angles (Vertex & Back Donor)
   - Progress indicator

3. **Camera Screen**
   - Real-time position validation
   - AR overlay guide
   - Accuracy meter
   - Audio feedback
   - Automatic countdown when positioned correctly

4. **Review Screen**
   - Preview captured photo
   - Quality check
   - Options: Continue or Retake

5. **Completion Screen**
   - Gallery of all 5 photos
   - Statistics (time, completion %)
   - Save and share options

## 🎨 Angle Configurations

| # | Angle | Target Area | Phone Position | Difficulty |
|---|-------|-------------|----------------|------------|
| 1 | Front Face | Front view | 0° horizontal | Easy ⭐ |
| 2 | Right 45° | Right profile | 0° horizontal | Easy ⭐ |
| 3 | Left 45° | Left profile | 0° horizontal | Easy ⭐ |
| 4 | Vertex | Crown/top of head | 90° overhead | Hard ⭐⭐⭐ |
| 5 | Back Donor | Nape area | 0° behind head | Hard ⭐⭐⭐ |

## 🧪 Testing

### Manual Testing Checklist

- [ ] Camera permission granted successfully
- [ ] Sensor data reading correctly (check debug output)
- [ ] All 5 angles can be captured
- [ ] Automatic shutter triggers at correct position
- [ ] Countdown displays (3-2-1)
- [ ] Photos saved and displayed correctly
- [ ] Retake functionality works
- [ ] Navigation flow is smooth
- [ ] Progress indicators accurate

### Known Issues

1. **Audio Feedback**: Requires placeholder sound file at `src/assets/sounds/beep.mp3`
   - Currently shows error in console but doesn't break functionality
   - TODO: Add actual audio files

2. **Distance Estimation**: Currently uses simplified calculation
   - Production version should use ML-based face detection (MediaPipe)

3. **Sensor Calibration**: May vary between devices
   - Tolerance values may need adjustment based on testing

## 🔧 Configuration

### Adjusting Angle Tolerance

Edit `src/constants/angles.ts`:

```typescript
phoneAngle: {
  pitch: 90,        // Target angle
  roll: 0,
  tolerance: 20,    // Increase for more lenient detection
}
```

### Changing Success Threshold

Edit `src/utils/positionValidator.ts`:

```typescript
// Position is valid if both accuracies are above 80%
const isValid = angleAccuracy >= 80 && distanceAccuracy >= 80;
```

## 📊 Success Metrics (KPIs)

Based on PRD requirements:

- ✅ **5-angle completion rate**: Target 90%
- ✅ **Average capture time**: Target < 2 minutes
- ✅ **User satisfaction**: Target > 8/10
- ✅ **Consistency accuracy**: Target 85%

## 🏆 Hackathon Judging Criteria

| Criteria | Weight | Implementation |
|----------|--------|----------------|
| UX/UI Experience | 30% | Intuitive flow, clear guidance for critical angles |
| Technical Stability | 25% | Sensor integration, auto-capture reliability |
| Guidance Mechanism | 20% | Visual AR overlay + audio feedback |
| Innovation/Creativity | 15% | Smart angle detection algorithm |
| Presentation Quality | 10% | Demo-ready with polished UI |

## 🔮 Future Enhancements

### Phase 2 Features
- [ ] ML-based face/head detection (MediaPipe, TensorFlow Lite)
- [ ] Actual radar-style audio feedback (pitch changes based on accuracy)
- [ ] Cloud storage integration (Firebase)
- [ ] User authentication
- [ ] Photo comparison for consistency tracking
- [ ] AI quality validation
- [ ] Clinic dashboard for photo review
- [ ] Multi-language support
- [ ] Accessibility features

## 🐛 Troubleshooting

### Camera not working
```bash
# Clear cache and restart
npm start -- --clear
```

### Sensors not detecting
- Ensure you're testing on a physical device (sensors don't work in simulators)
- Check device orientation lock is disabled
- Try recalibrating device sensors in settings

### Build errors
```bash
# Clean install
rm -rf node_modules
npm install
```

## 📄 License

This project was developed for Smile Hair Clinic Hackathon.

## 👥 Credits

**Developed for**: Smile Hair Clinic Hackathon - Mobile App Category
**Purpose**: Professional self-capture tool for hair transplant analysis
**Platform**: iOS & Android (React Native + Expo)

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS (macOS only)
npm run ios

# Run on Android
npm run android

# Build for production (requires EAS)
eas build --platform android
eas build --platform ios
```

## 📞 Support

For questions or issues related to this project:
- Check existing issues in the repository
- Review the PRD document (prd.md)
- Consult the Hackathon brief PDF

---

**Made with ❤️ for Smile Hair Clinic**
