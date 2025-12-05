// Anomaly detection and magnetometer processing
// Requirements: 1.4, 6.1

import type { MagnetometerReading } from '../types';

/**
 * Configuration for baseline calculation
 */
export interface BaselineConfig {
  /** Window size for rolling average (number of readings) */
  windowSize?: number;
}

const DEFAULT_WINDOW_SIZE = 10;

/**
 * Result of baseline calculation
 */
export interface BaselineResult {
  /** The calculated baseline magnitude */
  baseline: number;
  /** Number of readings used in calculation */
  readingsUsed: number;
}

/**
 * Calculates a rolling average baseline from magnetometer readings.
 * 
 * The rolling average provides stability by smoothing out noise in
 * individual readings. This baseline is used as a reference point
 * for anomaly detection (Requirement 1.4, 6.1).
 * 
 * @param readings - Array of magnetometer readings
 * @param config - Optional configuration for baseline calculation
 * @returns BaselineResult with calculated baseline and metadata
 * @throws Error if readings array is empty
 */
export function calculateBaseline(
  readings: MagnetometerReading[],
  config: BaselineConfig = {}
): BaselineResult {
  if (!readings || readings.length === 0) {
    throw new Error('Cannot calculate baseline: no readings provided');
  }

  const windowSize = config.windowSize ?? DEFAULT_WINDOW_SIZE;
  
  // Use all readings if fewer than window size
  const effectiveWindowSize = Math.min(windowSize, readings.length);
  
  // Calculate rolling average using the most recent readings
  // For stability, we use the last N readings where N = effectiveWindowSize
  const recentReadings = readings.slice(-effectiveWindowSize);
  
  const sum = recentReadings.reduce((acc, reading) => acc + reading.magnitude, 0);
  const baseline = sum / recentReadings.length;

  return {
    baseline,
    readingsUsed: recentReadings.length,
  };
}

/**
 * Calculates a full rolling average series for all readings.
 * 
 * This function computes a rolling average at each point in the
 * readings array, which can be useful for visualizing baseline
 * drift over time.
 * 
 * @param readings - Array of magnetometer readings
 * @param windowSize - Size of the rolling window
 * @returns Array of rolling average values, one per reading
 */
export function calculateRollingAverages(
  readings: MagnetometerReading[],
  windowSize: number = DEFAULT_WINDOW_SIZE
): number[] {
  if (!readings || readings.length === 0) {
    return [];
  }

  const averages: number[] = [];
  
  for (let i = 0; i < readings.length; i++) {
    // Calculate window start (inclusive)
    const windowStart = Math.max(0, i - windowSize + 1);
    const windowReadings = readings.slice(windowStart, i + 1);
    
    const sum = windowReadings.reduce((acc, r) => acc + r.magnitude, 0);
    averages.push(sum / windowReadings.length);
  }

  return averages;
}

// ============================================
// Anomaly Detection
// ============================================

import type { GeoCoordinate, MagneticAnomaly, AnomalyDetectionResult, AnomalyClassification } from '../types';

/**
 * Configuration for anomaly detection
 */
export interface AnomalyDetectionConfig {
  /** Threshold delta above baseline to flag as anomaly (in microtesla) */
  thresholdDelta?: number;
  /** Window size for baseline calculation */
  baselineWindowSize?: number;
}

const DEFAULT_THRESHOLD_DELTA = 10; // microtesla

/**
 * Input reading with associated position for anomaly detection
 */
export interface PositionedReading {
  reading: MagnetometerReading;
  position: GeoCoordinate;
}

/**
 * Detected anomaly before classification
 */
export interface DetectedAnomaly {
  id: string;
  position: GeoCoordinate;
  intensity: number;
  reading: MagnetometerReading;
}

/**
 * Generates a unique ID for an anomaly based on position and timestamp
 */
function generateAnomalyId(position: GeoCoordinate, timestamp: Date): string {
  return `anomaly-${position.latitude.toFixed(6)}-${position.longitude.toFixed(6)}-${timestamp.getTime()}`;
}

/**
 * Detects magnetic anomalies from a set of positioned magnetometer readings.
 * 
 * An anomaly is flagged when a reading's magnitude exceeds the baseline
 * by more than the configured threshold delta (Requirement 1.4).
 * 
 * The baseline is calculated using a rolling average of all readings,
 * providing stability against noise.
 * 
 * @param positionedReadings - Array of readings with associated GPS coordinates
 * @param config - Optional configuration for detection parameters
 * @returns Array of detected anomalies with positions and intensities
 */
export function detectAnomalies(
  positionedReadings: PositionedReading[],
  config: AnomalyDetectionConfig = {}
): DetectedAnomaly[] {
  if (!positionedReadings || positionedReadings.length === 0) {
    return [];
  }

  const thresholdDelta = config.thresholdDelta ?? DEFAULT_THRESHOLD_DELTA;
  const baselineWindowSize = config.baselineWindowSize ?? DEFAULT_WINDOW_SIZE;

  // Extract readings for baseline calculation
  const readings = positionedReadings.map(pr => pr.reading);
  
  // Calculate baseline from all readings
  const { baseline } = calculateBaseline(readings, { windowSize: baselineWindowSize });
  
  // Calculate the threshold: baseline + delta
  const threshold = baseline + thresholdDelta;

  // Flag readings that exceed the threshold
  const anomalies: DetectedAnomaly[] = [];
  
  for (const positionedReading of positionedReadings) {
    const { reading, position } = positionedReading;
    
    if (reading.magnitude > threshold) {
      anomalies.push({
        id: generateAnomalyId(position, reading.timestamp),
        position,
        intensity: reading.magnitude - baseline, // Intensity is how much it exceeds baseline
        reading,
      });
    }
  }

  return anomalies;
}

/**
 * Detects anomalies and returns a full detection result with metadata.
 * 
 * This is a higher-level function that wraps detectAnomalies and provides
 * additional context about the detection process.
 * 
 * @param positionedReadings - Array of readings with associated GPS coordinates
 * @param config - Optional configuration for detection parameters
 * @returns Full anomaly detection result with baseline, threshold, and timing info
 */
// ============================================
// Anomaly Classification
// ============================================

/**
 * Spatial characteristics of an anomaly for classification
 */
export interface SpatialCharacteristics {
  /** Approximate width of the anomaly in meters */
  width: number;
  /** Approximate length of the anomaly in meters */
  length: number;
  /** Depth estimate in meters (if available) */
  depth?: number;
  /** Shape descriptor */
  shape: 'linear' | 'rectangular' | 'irregular' | 'point';
}

/**
 * Input for anomaly classification
 */
export interface ClassificationInput {
  /** Intensity of the magnetic anomaly (magnitude above baseline) */
  intensity: number;
  /** Spatial characteristics of the anomaly */
  spatial: SpatialCharacteristics;
}

// Classification thresholds based on typical magnetic signatures
const INTENSITY_THRESHOLDS = {
  /** High intensity typically indicates large metal structures like foundations */
  HIGH: 50,
  /** Medium intensity often indicates pipes or conduits */
  MEDIUM: 20,
  /** Low intensity may indicate small metal debris */
  LOW: 5,
};

// Aspect ratio thresholds for shape-based classification
const ASPECT_RATIO_THRESHOLDS = {
  /** Linear features (pipes) typically have high aspect ratios */
  LINEAR: 3.0,
  /** Rectangular features (foundations) have moderate aspect ratios */
  RECTANGULAR: 1.5,
};

/**
 * Classifies a magnetic anomaly based on intensity and spatial characteristics.
 * 
 * Classification logic:
 * - Foundation: High intensity + rectangular/large area
 * - Pipe: Linear shape (high aspect ratio) regardless of intensity
 * - Metal debris: Low-medium intensity + irregular/point shape + small area
 * - Unknown: When characteristics don't clearly match known patterns
 * 
 * This function is deterministic: the same input will always produce
 * the same classification (Requirement 6.3, Property 8).
 * 
 * @param input - Classification input with intensity and spatial characteristics
 * @returns AnomalyClassification type
 */
export function classifyAnomaly(input: ClassificationInput): AnomalyClassification {
  const { intensity, spatial } = input;
  const { width, length, shape } = spatial;
  
  // Calculate area and aspect ratio for classification
  const area = width * length;
  const aspectRatio = Math.max(width, length) / Math.max(Math.min(width, length), 0.01);
  
  // Rule 1: Linear shapes are typically pipes
  // Pipes have high aspect ratios (long and narrow)
  if (shape === 'linear' || aspectRatio >= ASPECT_RATIO_THRESHOLDS.LINEAR) {
    return 'pipe';
  }
  
  // Rule 2: High intensity + large rectangular area = foundation
  // Foundations are large metal structures with strong magnetic signatures
  if (
    intensity >= INTENSITY_THRESHOLDS.HIGH &&
    (shape === 'rectangular' || aspectRatio >= ASPECT_RATIO_THRESHOLDS.RECTANGULAR) &&
    area >= 1.0 // At least 1 square meter
  ) {
    return 'foundation';
  }
  
  // Rule 3: Medium-high intensity + moderate rectangular area = foundation
  // Smaller foundations or structural elements
  if (
    intensity >= INTENSITY_THRESHOLDS.MEDIUM &&
    shape === 'rectangular' &&
    area >= 0.5
  ) {
    return 'foundation';
  }
  
  // Rule 4: Low-medium intensity + small/irregular/point = metal debris
  // Small metal objects like nails, cans, tools
  if (
    intensity < INTENSITY_THRESHOLDS.HIGH &&
    (shape === 'irregular' || shape === 'point' || area < 0.5)
  ) {
    return 'metal_debris';
  }
  
  // Rule 5: Very low intensity = likely metal debris
  if (intensity < INTENSITY_THRESHOLDS.LOW) {
    return 'metal_debris';
  }
  
  // Default: unknown when characteristics don't clearly match
  return 'unknown';
}

/**
 * Classifies a detected anomaly using its intensity and inferred spatial characteristics.
 * 
 * This is a convenience function that creates spatial characteristics from
 * a DetectedAnomaly and delegates to classifyAnomaly.
 * 
 * @param anomaly - The detected anomaly to classify
 * @param spatialHint - Optional spatial characteristics (defaults to point/irregular)
 * @returns AnomalyClassification type
 */
export function classifyDetectedAnomaly(
  anomaly: DetectedAnomaly,
  spatialHint?: Partial<SpatialCharacteristics>
): AnomalyClassification {
  const defaultSpatial: SpatialCharacteristics = {
    width: 0.1,
    length: 0.1,
    shape: 'point',
  };
  
  const spatial: SpatialCharacteristics = {
    ...defaultSpatial,
    ...spatialHint,
  };
  
  return classifyAnomaly({
    intensity: anomaly.intensity,
    spatial,
  });
}

// ============================================
// Full Detection with Metadata
// ============================================

// ============================================
// Anomaly Proximity Grouping
// ============================================

/**
 * Configuration for proximity grouping
 */
export interface ProximityGroupingConfig {
  /** Distance threshold in meters for grouping anomalies */
  thresholdMeters?: number;
}

const DEFAULT_PROXIMITY_THRESHOLD_METERS = 2.0;

/**
 * A group of anomalies that are within proximity threshold of each other
 */
export interface AnomalyGroup {
  /** Unique identifier for the group */
  id: string;
  /** Anomalies in this group */
  anomalies: MagneticAnomaly[];
  /** Centroid position of the group */
  centroid: GeoCoordinate;
  /** Combined intensity (max of all anomalies in group) */
  combinedIntensity: number;
}

/**
 * Calculates the Haversine distance between two geographic coordinates.
 * 
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in meters
 */
export function calculateDistanceMeters(
  coord1: GeoCoordinate,
  coord2: GeoCoordinate
): number {
  const R = 6371000; // Earth's radius in meters
  
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculates the centroid of a set of geographic coordinates.
 * 
 * @param coords - Array of coordinates
 * @returns Centroid coordinate
 */
function calculateCentroid(coords: GeoCoordinate[]): GeoCoordinate {
  if (coords.length === 0) {
    throw new Error('Cannot calculate centroid of empty coordinate array');
  }
  
  if (coords.length === 1) {
    return { ...coords[0] };
  }
  
  const sumLat = coords.reduce((sum, c) => sum + c.latitude, 0);
  const sumLon = coords.reduce((sum, c) => sum + c.longitude, 0);
  const sumAlt = coords.reduce((sum, c) => sum + c.altitude, 0);
  const avgAccuracy = coords.reduce((sum, c) => sum + c.accuracy, 0) / coords.length;
  
  return {
    latitude: sumLat / coords.length,
    longitude: sumLon / coords.length,
    altitude: sumAlt / coords.length,
    accuracy: avgAccuracy,
  };
}

/**
 * Generates a unique ID for an anomaly group
 */
function generateGroupId(anomalies: MagneticAnomaly[]): string {
  const ids = anomalies.map(a => a.id).sort().join('-');
  return `group-${ids.substring(0, 32)}`;
}

/**
 * Groups magnetic anomalies by proximity using a distance threshold.
 * 
 * Anomalies within the threshold distance of each other are grouped together.
 * Uses a union-find approach: if anomaly A is within threshold of B, and B is
 * within threshold of C, then A, B, and C are all in the same group.
 * 
 * This satisfies Requirement 6.4: "WHEN multiple anomalies are detected in
 * proximity THEN the DeepTime_App SHALL group them into a single highlighted region"
 * 
 * @param anomalies - Array of magnetic anomalies to group
 * @param config - Optional configuration for grouping parameters
 * @returns Array of anomaly groups
 */
export function groupAnomaliesByProximity(
  anomalies: MagneticAnomaly[],
  config: ProximityGroupingConfig = {}
): AnomalyGroup[] {
  if (!anomalies || anomalies.length === 0) {
    return [];
  }
  
  const thresholdMeters = config.thresholdMeters ?? DEFAULT_PROXIMITY_THRESHOLD_METERS;
  
  // Union-Find data structure for grouping
  const parent: number[] = anomalies.map((_, i) => i);
  
  function find(i: number): number {
    if (parent[i] !== i) {
      parent[i] = find(parent[i]); // Path compression
    }
    return parent[i];
  }
  
  function union(i: number, j: number): void {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }
  
  // Group anomalies that are within threshold distance
  for (let i = 0; i < anomalies.length; i++) {
    for (let j = i + 1; j < anomalies.length; j++) {
      const distance = calculateDistanceMeters(
        anomalies[i].position,
        anomalies[j].position
      );
      
      if (distance <= thresholdMeters) {
        union(i, j);
      }
    }
  }
  
  // Collect anomalies into groups by their root
  const groupMap = new Map<number, MagneticAnomaly[]>();
  
  for (let i = 0; i < anomalies.length; i++) {
    const root = find(i);
    if (!groupMap.has(root)) {
      groupMap.set(root, []);
    }
    groupMap.get(root)!.push(anomalies[i]);
  }
  
  // Convert to AnomalyGroup array
  const groups: AnomalyGroup[] = [];
  
  for (const groupAnomalies of groupMap.values()) {
    const positions = groupAnomalies.map(a => a.position);
    const centroid = calculateCentroid(positions);
    const combinedIntensity = Math.max(...groupAnomalies.map(a => a.intensity));
    
    groups.push({
      id: generateGroupId(groupAnomalies),
      anomalies: groupAnomalies,
      centroid,
      combinedIntensity,
    });
  }
  
  return groups;
}

// ============================================
// Full Detection with Metadata
// ============================================

export function detectAnomaliesWithMetadata(
  positionedReadings: PositionedReading[],
  config: AnomalyDetectionConfig = {}
): AnomalyDetectionResult {
  const startTime = Date.now();
  const thresholdDelta = config.thresholdDelta ?? DEFAULT_THRESHOLD_DELTA;
  
  if (!positionedReadings || positionedReadings.length === 0) {
    return {
      anomalies: [],
      baselineMagnitude: 0,
      threshold: thresholdDelta,
      scanDuration: 0,
    };
  }

  const baselineWindowSize = config.baselineWindowSize ?? DEFAULT_WINDOW_SIZE;

  // Extract readings for baseline calculation
  const readings = positionedReadings.map(pr => pr.reading);
  
  // Calculate baseline
  const { baseline } = calculateBaseline(readings, { windowSize: baselineWindowSize });

  // Detect anomalies
  const detectedAnomalies = detectAnomalies(positionedReadings, config);

  // Convert to MagneticAnomaly format (with default classification)
  const anomalies: MagneticAnomaly[] = detectedAnomalies.map(da => ({
    id: da.id,
    position: da.position,
    intensity: da.intensity,
    classification: 'unknown' as const, // Classification is done separately in task 3.4
  }));

  const endTime = Date.now();

  return {
    anomalies,
    baselineMagnitude: baseline,
    threshold: thresholdDelta,
    scanDuration: (endTime - startTime) / 1000, // Convert to seconds
  };
}
