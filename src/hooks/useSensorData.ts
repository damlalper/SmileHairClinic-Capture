import { useState, useEffect, useRef, useCallback } from 'react';
import { DeviceMotion } from 'expo-sensors';
import { SensorData } from '../types';
import { SensorCalibrator, RawSensorData } from '../utils/sensorCalibration';

/**
 * useSensorData
 * - Integrates SensorCalibrator for drift correction
 * - Exposes calibration control and confidence
 */
export const useSensorData = () => {
  const [sensorData, setSensorData] = useState<SensorData & { confidence?: number }>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    confidence: 0,
  });
  const [isAvailable, setIsAvailable] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationInfo, setCalibrationInfo] = useState<any>(null);

  const calibratorRef = useRef<SensorCalibrator | null>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    calibratorRef.current = new SensorCalibrator();

    let mounted = true;

    const setupSensor = async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!mounted) return;
        setIsAvailable(available);

        if (available) {
          DeviceMotion.setUpdateInterval(100);

          subscriptionRef.current = DeviceMotion.addListener((data) => {
            const { rotation, acceleration } = data as any;

            // Map DeviceMotion data into RawSensorData shape
            const raw: RawSensorData = {
              gyroX: rotation?.beta ?? 0,
              gyroY: rotation?.gamma ?? 0,
              gyroZ: rotation?.alpha ?? 0,
              accelX: acceleration?.x ?? 0,
              accelY: acceleration?.y ?? 0,
              accelZ: acceleration?.z ?? 0,
            };

            // If calibrator is ready, use corrected values
            if (calibratorRef.current?.getCalibrationInfo()) {
              const corrected = calibratorRef.current.correctSensorData(raw as any);
              setSensorData({ pitch: corrected.pitch, roll: corrected.roll, yaw: corrected.yaw, confidence: corrected.confidence });
            } else if (rotation) {
              // Fallback: convert rotation radians to degrees
              const pitch = (rotation.beta ?? 0) * (180 / Math.PI);
              const roll = (rotation.gamma ?? 0) * (180 / Math.PI);
              const yaw = (rotation.alpha ?? 0) * (180 / Math.PI);
              setSensorData({ pitch, roll, yaw, confidence: 0 });
            }
          });
        }
      } catch (error) {
        console.error('Error setting up sensors:', error);
      }
    };

    setupSensor();

    return () => {
      mounted = false;
      if (subscriptionRef.current) subscriptionRef.current.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCalibration = useCallback(async (onProgress?: (p: number) => void) => {
    calibratorRef.current ??= new SensorCalibrator();

    setCalibrating(true);
    try {
      // SensorCalibrator.startCalibration will collect samples (mock or real)
      const info = await calibratorRef.current.startCalibration(onProgress);
      setCalibrationInfo(info);
      return info;
    } catch (err) {
      console.warn('Calibration failed', err);
      return null;
    } finally {
      setCalibrating(false);
    }
  }, []);

  return { sensorData, isAvailable, calibrating, calibrationInfo, startCalibration };
};
