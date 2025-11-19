const { withGradleProperties, AndroidConfig } = require('@expo/config-plugins');

/**
 * Custom Expo Config Plugin to enable New Architecture for Android
 * This adds newArchEnabled=true to android/gradle.properties
 */
const withNewArchitecture = (config) => {
  // First, ensure gradle.properties modifications
  config = withGradleProperties(config, (config) => {
    // Remove any existing newArchEnabled entry
    config.modResults = config.modResults.filter(
      item => !(item.type === 'property' && item.key === 'newArchEnabled')
    );

    // Add newArchEnabled=true
    config.modResults.push({
      type: 'property',
      key: 'newArchEnabled',
      value: 'true',
    });

    // Also add hermesEnabled for better performance with New Architecture
    const hasHermes = config.modResults.some(
      item => item.type === 'property' && item.key === 'hermesEnabled'
    );

    if (!hasHermes) {
      config.modResults.push({
        type: 'property',
        key: 'hermesEnabled',
        value: 'true',
      });
    }

    return config;
  });

  return config;
};

module.exports = withNewArchitecture;
