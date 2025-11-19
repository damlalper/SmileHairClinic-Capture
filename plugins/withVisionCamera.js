const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Custom Vision Camera Plugin
 * Adds camera permissions without frame processor setup (which requires MainApplication.kt)
 */
const withVisionCamera = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    // Add camera permissions if not already present
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO', // For future video support
    ];

    permissions.forEach((permission) => {
      const exists = androidManifest['uses-permission'].some(
        (p) => p.$['android:name'] === permission
      );

      if (!exists) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Add camera feature requirement
    if (!androidManifest['uses-feature']) {
      androidManifest['uses-feature'] = [];
    }

    const cameraFeature = {
      $: {
        'android:name': 'android.hardware.camera',
        'android:required': 'true',
      },
    };

    const cameraFeatureExists = androidManifest['uses-feature'].some(
      (f) => f.$['android:name'] === 'android.hardware.camera'
    );

    if (!cameraFeatureExists) {
      androidManifest['uses-feature'].push(cameraFeature);
    }

    return config;
  });
};

module.exports = withVisionCamera;
