import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  geoCoordinateArb,
  geologicalLayerArb,
  geologicalStackArb,
  narrativeArb,
  magneticAnomalyArb,
  magnetometerReadingArb,
} from './index';

describe('Domain Generators', () => {
  it('geoCoordinateArb generates valid coordinates', () => {
    fc.assert(
      fc.property(geoCoordinateArb, (coord) => {
        expect(coord.latitude).toBeGreaterThanOrEqual(-90);
        expect(coord.latitude).toBeLessThanOrEqual(90);
        expect(coord.longitude).toBeGreaterThanOrEqual(-180);
        expect(coord.longitude).toBeLessThanOrEqual(180);
        expect(coord.accuracy).toBeGreaterThan(0);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('geologicalLayerArb generates layers with valid depth ordering', () => {
    fc.assert(
      fc.property(geologicalLayerArb, (layer) => {
        expect(layer.depthEnd).toBeGreaterThan(layer.depthStart);
        expect(layer.depthStart).toBeGreaterThanOrEqual(0);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('geologicalStackArb generates stacks with properly ordered layers', () => {
    fc.assert(
      fc.property(geologicalStackArb, (stack) => {
        expect(stack.layers.length).toBeGreaterThan(0);
        for (let i = 0; i < stack.layers.length - 1; i++) {
          expect(stack.layers[i].depthEnd).toBe(stack.layers[i + 1].depthStart);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('narrativeArb generates narratives with required fields', () => {
    fc.assert(
      fc.property(narrativeArb, (narrative) => {
        expect(narrative.flora.length).toBeGreaterThan(0);
        expect(narrative.fauna.length).toBeGreaterThan(0);
        expect(narrative.climate).toBeDefined();
        expect(narrative.climate.temperature).toBeDefined();
        expect(narrative.climate.humidity).toBeDefined();
        expect(narrative.climate.atmosphere).toBeDefined();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('magneticAnomalyArb generates valid anomalies', () => {
    fc.assert(
      fc.property(magneticAnomalyArb, (anomaly) => {
        expect(anomaly.intensity).toBeGreaterThan(0);
        expect(['foundation', 'pipe', 'metal_debris', 'unknown']).toContain(
          anomaly.classification
        );
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('magnetometerReadingArb generates readings with correct magnitude', () => {
    fc.assert(
      fc.property(magnetometerReadingArb, (reading) => {
        const expectedMagnitude = Math.sqrt(
          reading.x ** 2 + reading.y ** 2 + reading.z ** 2
        );
        expect(reading.magnitude).toBeCloseTo(expectedMagnitude, 10);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
