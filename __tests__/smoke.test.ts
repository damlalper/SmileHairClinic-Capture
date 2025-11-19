/**
 * Smoke Tests - Critical dependencies ve mimari uyumluluk testleri
 * Build öncesi bu testlerin geçmesi, production build'in başarılı olma olasılığını artırır
 */

describe('Critical Dependencies Smoke Tests', () => {
  it('should have package.json with correct dependencies', () => {
    const packageJson = require('../package.json');

    // Critical dependencies check
    expect(packageJson.dependencies['react-native-vision-camera']).toBeDefined();
    expect(packageJson.dependencies['react-native-worklets']).toBeDefined();
    expect(packageJson.dependencies['react-native-reanimated']).toBeDefined();
    expect(packageJson.dependencies['vision-camera-face-detector']).toBeDefined();
  });

  it('should have app.json with newArchEnabled: true', () => {
    const appJson = require('../app.json');
    expect(appJson.expo.newArchEnabled).toBe(true);
  });

  it('should have required plugins in app.json', () => {
    const appJson = require('../app.json');
    const plugins = appJson.expo.plugins;

    const hasVisionCamera = plugins.some((p: any) =>
      Array.isArray(p) && p[0] === 'react-native-vision-camera'
    );
    const hasCustomNewArchPlugin = plugins.includes('./plugins/withNewArchitecture');

    expect(hasVisionCamera).toBe(true);
    expect(hasCustomNewArchPlugin).toBe(true);
  });
});

describe('Configuration Validation', () => {
  it('should have correct Expo SDK version', () => {
    const packageJson = require('../package.json');
    expect(packageJson.dependencies.expo).toMatch(/~54.0/);
  });

  it('should have TypeScript configured', () => {
    const packageJson = require('../package.json');
    expect(packageJson.devDependencies.typescript).toBeDefined();
  });

  it('should have test scripts configured', () => {
    const packageJson = require('../package.json');
    expect(packageJson.scripts.test).toBe('jest');
    expect(packageJson.scripts['test:watch']).toBe('jest --watch');
    expect(packageJson.scripts['build:android']).toBe('eas build --platform android');
  });
});
