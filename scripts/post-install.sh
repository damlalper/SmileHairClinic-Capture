#!/bin/bash

# Post-install script for EAS Build
# This script patches android/gradle.properties to enable New Architecture

GRADLE_PROPERTIES="android/gradle.properties"

if [ -f "$GRADLE_PROPERTIES" ]; then
  echo "✅ Found gradle.properties, ensuring newArchEnabled=true"

  # Remove existing newArchEnabled line if exists
  sed -i '/newArchEnabled/d' "$GRADLE_PROPERTIES"

  # Add newArchEnabled=true
  echo "newArchEnabled=true" >> "$GRADLE_PROPERTIES"
  echo "hermesEnabled=true" >> "$GRADLE_PROPERTIES"

  echo "✅ gradle.properties updated successfully"
else
  echo "⚠️  gradle.properties not found - will be created during prebuild"
fi
