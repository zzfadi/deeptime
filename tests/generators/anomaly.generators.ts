import * as fc from 'fast-check';
import type {
  MagneticAnomaly,
  AnomalyClassification,
  MagnetometerReading,
  AnomalyDetectionResult,
} from '../../src/types';
import { geoCoordinateArb } from './geological.generators';

// Anomaly classification generator
export const anomalyClassificationArb: fc.Arbitrary<AnomalyClassification> = fc.constantFrom(
  'foundation',
  'pipe',
  'metal_debris',
  'unknown'
);

// Magnetic anomaly generator
export const magneticAnomalyArb: fc.Arbitrary<MagneticAnomaly> = fc.record({
  id: fc.uuid(),
  position: geoCoordinateArb,
  intensity: fc.double({ min: 0.1, max: 1000, noNaN: true }),
  classification: anomalyClassificationArb,
});

// Magnetometer reading generator
export const magnetometerReadingArb: fc.Arbitrary<MagnetometerReading> = fc
  .record({
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
    x: fc.double({ min: -100, max: 100, noNaN: true }),
    y: fc.double({ min: -100, max: 100, noNaN: true }),
    z: fc.double({ min: -100, max: 100, noNaN: true }),
  })
  .map(({ timestamp, x, y, z }) => ({
    timestamp,
    x,
    y,
    z,
    magnitude: Math.sqrt(x * x + y * y + z * z),
  }));


// Array of magnetometer readings generator
export const magnetometerReadingsArb = (
  minLength = 1,
  maxLength = 100
): fc.Arbitrary<MagnetometerReading[]> =>
  fc.array(magnetometerReadingArb, { minLength, maxLength });

// Anomaly detection result generator
export const anomalyDetectionResultArb: fc.Arbitrary<AnomalyDetectionResult> = fc.record({
  anomalies: fc.array(magneticAnomalyArb, { minLength: 0, maxLength: 10 }),
  baselineMagnitude: fc.double({ min: 20, max: 60, noNaN: true }),
  threshold: fc.double({ min: 5, max: 30, noNaN: true }),
  scanDuration: fc.double({ min: 1, max: 60, noNaN: true }),
});

// Generator for readings with controlled magnitudes for testing anomaly detection
export const readingsWithControlledMagnitudeArb = (
  baselineMagnitude: number,
  threshold: number
): fc.Arbitrary<MagnetometerReading[]> =>
  fc.array(
    fc.record({
      timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
      isAnomaly: fc.boolean(),
      scaleFactor: fc.double({ min: 0.1, max: 2.0, noNaN: true }),
    }).map(({ timestamp, isAnomaly, scaleFactor }) => {
      // Create magnitude based on whether this should be an anomaly
      const targetMagnitude = isAnomaly
        ? baselineMagnitude + threshold + (scaleFactor * 10)
        : baselineMagnitude * 0.8;
      
      // Distribute magnitude across x, y, z (simplified: equal distribution)
      const component = targetMagnitude / Math.sqrt(3);
      return {
        timestamp,
        x: component,
        y: component,
        z: component,
        magnitude: targetMagnitude,
      };
    }),
    { minLength: 10, maxLength: 50 }
  );

// Generator for grouped anomalies (anomalies within proximity)
export const groupedAnomaliesArb = (
  proximityThreshold: number
): fc.Arbitrary<MagneticAnomaly[]> =>
  fc.record({
    baseLatitude: fc.double({ min: -89, max: 89, noNaN: true }),
    baseLongitude: fc.double({ min: -179, max: 179, noNaN: true }),
    groupCount: fc.integer({ min: 2, max: 5 }),
  }).chain(({ baseLatitude, baseLongitude, groupCount }) =>
    fc.array(
      fc.record({
        id: fc.uuid(),
        latOffset: fc.double({ min: -proximityThreshold / 111000, max: proximityThreshold / 111000, noNaN: true }),
        lonOffset: fc.double({ min: -proximityThreshold / 111000, max: proximityThreshold / 111000, noNaN: true }),
        intensity: fc.double({ min: 0.1, max: 1000, noNaN: true }),
        classification: anomalyClassificationArb,
      }).map(({ id, latOffset, lonOffset, intensity, classification }) => ({
        id,
        position: {
          latitude: baseLatitude + latOffset,
          longitude: baseLongitude + lonOffset,
          altitude: 0,
          accuracy: 5,
        },
        intensity,
        classification,
      })),
      { minLength: groupCount, maxLength: groupCount }
    )
  );
