import { describe, it, expect } from 'vitest';
import { calculateBaseline, calculateRollingAverages } from '../../src/anomaly';
import type { MagnetometerReading } from '../../src/types';

// Helper to create a reading with a specific magnitude
function createReading(magnitude: number, timestamp = new Date()): MagnetometerReading {
  const component = magnitude / Math.sqrt(3);
  return {
    timestamp,
    x: component,
    y: component,
    z: component,
    magnitude,
  };
}

describe('calculateBaseline', () => {
  it('should calculate baseline from readings', () => {
    const readings = [
      createReading(40),
      createReading(42),
      createReading(38),
      createReading(41),
      createReading(39),
    ];

    const result = calculateBaseline(readings);
    
    expect(result.baseline).toBeCloseTo(40, 0);
    expect(result.readingsUsed).toBe(5);
  });

  it('should throw error for empty readings', () => {
    expect(() => calculateBaseline([])).toThrow('Cannot calculate baseline: no readings provided');
  });

  it('should use window size for rolling average', () => {
    const readings = [
      createReading(100), // old, outside window
      createReading(100), // old, outside window
      createReading(40),
      createReading(42),
      createReading(38),
    ];

    const result = calculateBaseline(readings, { windowSize: 3 });
    
    // Should only use last 3 readings: 40, 42, 38 = 120/3 = 40
    expect(result.baseline).toBeCloseTo(40, 0);
    expect(result.readingsUsed).toBe(3);
  });

  it('should handle single reading', () => {
    const readings = [createReading(45)];
    
    const result = calculateBaseline(readings);
    
    expect(result.baseline).toBe(45);
    expect(result.readingsUsed).toBe(1);
  });
});

describe('calculateRollingAverages', () => {
  it('should calculate rolling averages for all readings', () => {
    const readings = [
      createReading(10),
      createReading(20),
      createReading(30),
      createReading(40),
    ];

    const averages = calculateRollingAverages(readings, 2);
    
    // Window of 2:
    // [10] -> 10
    // [10, 20] -> 15
    // [20, 30] -> 25
    // [30, 40] -> 35
    expect(averages).toHaveLength(4);
    expect(averages[0]).toBe(10);
    expect(averages[1]).toBe(15);
    expect(averages[2]).toBe(25);
    expect(averages[3]).toBe(35);
  });

  it('should return empty array for empty readings', () => {
    expect(calculateRollingAverages([])).toEqual([]);
  });
});
