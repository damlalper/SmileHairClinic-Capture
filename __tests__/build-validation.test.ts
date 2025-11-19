/**
 * Build Validation Tests
 * EAS build'e göndermeden ÖNCE kritik konfigürasyon hatalarını yakalar
 */

describe('New Architecture Build Requirements', () => {
  it('CRITICAL: newArchEnabled must be true for worklets and reanimated', () => {
    const appJson = require('../app.json');

    // Bu false ise build MUTLAKA PATLAR
    expect(appJson.expo.newArchEnabled).toBe(true);
  });

  it('CRITICAL: custom New Architecture plugin must be configured', () => {
    const appJson = require('../app.json');
    const plugins = appJson.expo.plugins;

    const hasCustomPlugin = plugins.includes('./plugins/withNewArchitecture');

    if (!hasCustomPlugin) {
      throw new Error(
        'FATAL: Custom New Architecture plugin missing!\n' +
        'This plugin adds newArchEnabled=true to gradle.properties'
      );
    }

    expect(hasCustomPlugin).toBe(true);
  });
});

describe('Vision Camera Configuration', () => {
  it('CRITICAL: vision camera plugin must be properly configured', () => {
    const appJson = require('../app.json');
    const plugins = appJson.expo.plugins;

    const visionCameraPlugin = plugins.find((p: any) =>
      Array.isArray(p) && p[0] === 'react-native-vision-camera'
    );

    if (!visionCameraPlugin) {
      throw new Error(
        'FATAL: react-native-vision-camera plugin missing! Camera will not work.'
      );
    }

    expect(visionCameraPlugin).toBeDefined();
  });

  it('CRITICAL: vision-camera-face-detector dependency exists', () => {
    const packageJson = require('../package.json');

    const hasFaceDetector = packageJson.dependencies['vision-camera-face-detector'];

    if (!hasFaceDetector) {
      throw new Error(
        'FATAL: vision-camera-face-detector is missing! Face detection will fail.'
      );
    }

    expect(hasFaceDetector).toBeDefined();
  });
});

describe('Package Version Conflicts', () => {
  it('CRITICAL: react-native-reanimated version must support New Architecture', () => {
    const packageJson = require('../package.json');
    const reanimatedVersion = packageJson.dependencies['react-native-reanimated'];

    // Reanimated 4.x New Architecture'ı destekler
    const isCompatible = reanimatedVersion.includes('4.') || reanimatedVersion.includes('~4.');

    if (!isCompatible) {
      throw new Error(
        `FATAL: react-native-reanimated version ${reanimatedVersion} does not support New Architecture!\n` +
        'Minimum required: 4.0.0'
      );
    }

    expect(isCompatible).toBe(true);
  });

  it('CRITICAL: react-native-worklets version compatibility', () => {
    const packageJson = require('../package.json');
    const workletsVersion = packageJson.dependencies['react-native-worklets'];

    if (!workletsVersion) {
      throw new Error(
        'FATAL: react-native-worklets is missing from dependencies!\n' +
        'Build will fail: "[VisionCamera] react-native-worklets-core not found"'
      );
    }

    expect(workletsVersion).toBeDefined();
  });

  it('CRITICAL: React and React Native version consistency', () => {
    const packageJson = require('../package.json');
    const reactVersion = packageJson.dependencies.react;
    const rnVersion = packageJson.dependencies['react-native'];

    // React 19.x ile RN 0.81.x uyumlu olmalı
    const reactMajor = parseInt(reactVersion.split('.')[0]);
    const rnMinor = parseFloat(rnVersion.split('.')[1]);

    if (reactMajor === 19 && rnMinor < 80) {
      throw new Error(
        `WARNING: React ${reactVersion} with React Native ${rnVersion} may cause issues.\n` +
        'Consider upgrading React Native to 0.80+'
      );
    }

    expect(reactVersion).toBeDefined();
    expect(rnVersion).toBeDefined();
  });
});

describe('Android Build Configuration', () => {
  it('CRITICAL: Android package name must be set', () => {
    const appJson = require('../app.json');
    const androidPackage = appJson.expo.android?.package;

    if (!androidPackage) {
      throw new Error(
        'FATAL: Android package name is missing!\n' +
        'Set expo.android.package in app.json'
      );
    }

    expect(androidPackage).toBe('com.damlalper.smilehaircapture');
  });

  it('CRITICAL: Camera permission must be declared', () => {
    const appJson = require('../app.json');
    const permissions = appJson.expo.android?.permissions || [];

    const hasCameraPermission = permissions.includes('CAMERA') ||
                               permissions.includes('android.permission.CAMERA');

    if (!hasCameraPermission) {
      throw new Error(
        'FATAL: CAMERA permission not declared in android.permissions!\n' +
        'App will crash when trying to access camera.'
      );
    }

    expect(hasCameraPermission).toBe(true);
  });
});

describe('Expo Configuration Integrity', () => {
  it('CRITICAL: Expo SDK version matches dependencies', () => {
    const packageJson = require('../package.json');
    const expoVersion = packageJson.dependencies.expo;

    // Expo 54 SDK kullanılıyor mu?
    const isExpo54 = expoVersion.includes('54.');

    if (!isExpo54) {
      throw new Error(
        `WARNING: Expo SDK ${expoVersion} may not be compatible with some dependencies.\n` +
        'Expected: ~54.0.x'
      );
    }

    expect(isExpo54).toBe(true);
  });

  it('CRITICAL: EAS project ID must be configured', () => {
    const appJson = require('../app.json');
    const projectId = appJson.expo.extra?.eas?.projectId;

    if (!projectId) {
      throw new Error(
        'FATAL: EAS project ID is missing!\n' +
        'Run: eas build:configure'
      );
    }

    expect(projectId).toBe('4dfef98b-0a04-4d75-bd57-ee27b9dc2f00');
  });
});

describe('TypeScript Configuration', () => {
  it('CRITICAL: TypeScript must be in devDependencies', () => {
    const packageJson = require('../package.json');
    const hasTypeScript = packageJson.devDependencies.typescript;

    if (!hasTypeScript) {
      throw new Error(
        'FATAL: TypeScript is missing from devDependencies!\n' +
        'Build will fail for .ts and .tsx files.'
      );
    }

    expect(hasTypeScript).toBeDefined();
  });
});
