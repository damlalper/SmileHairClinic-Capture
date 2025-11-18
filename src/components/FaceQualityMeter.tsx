import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { QualityMetrics } from '../utils/imageQuality';

interface Props {
  metrics: QualityMetrics;
}

export const FaceQualityMeter: React.FC<Props> = ({ metrics }) => {
  const barColor = (value: number) => {
    if (value >= 75) return '#28a745';
    if (value >= 50) return '#ff9800';
    return '#e53935';
  };

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.title}>Face Quality</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Sharpness</Text>
        <View style={styles.barBackground}>
          <View style={[styles.bar, { width: `${metrics.sharpness}%`, backgroundColor: barColor(metrics.sharpness) }]} />
        </View>
        <Text style={styles.value}>{metrics.sharpness}%</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Brightness</Text>
        <View style={styles.barBackground}>
          <View style={[styles.bar, { width: `${(metrics.brightness / 255) * 100}%`, backgroundColor: barColor((metrics.brightness/255)*100) }]} />
        </View>
        <Text style={styles.value}>{metrics.brightness}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Contrast</Text>
        <View style={styles.barBackground}>
          <View style={[styles.bar, { width: `${metrics.contrast}%`, backgroundColor: barColor(metrics.contrast) }]} />
        </View>
        <Text style={styles.value}>{metrics.contrast}%</Text>
      </View>

      <Text style={styles.overall}>Overall: {metrics.overallScore}% — {metrics.feedback}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 10,
    borderRadius: 8,
    width: 220,
  },
  title: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: '#fff',
    width: 80,
    fontSize: 12,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  bar: {
    height: 8,
    borderRadius: 4,
  },
  value: {
    color: '#fff',
    width: 36,
    fontSize: 12,
    textAlign: 'right',
  },
  overall: {
    color: '#fff',
    marginTop: 6,
    fontSize: 12,
  },
});

export default FaceQualityMeter;
