// Core type definitions for DeepTime application
// Requirements: 1.3, 2.1, 3.1, 6.2, 9.1

// ============================================
// Geographic and Coordinate Types
// ============================================

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// ============================================
// Geological Types
// ============================================

export type MaterialType =
  | 'soil'
  | 'clay'
  | 'sand'
  | 'limestone'
  | 'granite'
  | 'shale'
  | 'sandstone'
  | 'basalt'
  | 'fill';

export type FossilIndex = 'none' | 'low' | 'medium' | 'high' | 'exceptional';

export interface GeologicalEra {
  name: string;
  yearsAgo: number;
  period: string;
  epoch?: string;
}


export interface LayerCharacteristics {
  color?: string;
  density?: number;
  waterContent?: number;
  mineralComposition?: string[];
}

export interface GeologicalLayer {
  id: string;
  depthStart: number;
  depthEnd: number;
  material: MaterialType;
  era: GeologicalEra;
  period: string;
  fossilIndex: FossilIndex;
  characteristics: LayerCharacteristics;
}

export interface GeologicalStack {
  location: GeoCoordinate;
  layers: GeologicalLayer[];
  queryTimestamp: Date;
  dataSource: string;
  confidence: number;
}

// ============================================
// Narrative Types
// ============================================

export interface ClimateDescription {
  temperature: string;
  humidity: string;
  atmosphere: string;
}

export interface Narrative {
  layerId: string;
  shortDescription: string;
  fullDescription: string;
  visualPrompt: string;
  flora: string[];
  fauna: string[];
  climate: ClimateDescription;
  soundscape: string;
}

export interface ObjectExplanation {
  objectType: string;
  name: string;
  description: string;
  audioTranscript: string;
  relatedFacts: string[];
}


// ============================================
// AR and Rendering Types
// ============================================

export type ARObjectType =
  | 'creature'
  | 'plant'
  | 'rock'
  | 'fossil'
  | 'structure'
  | 'utility';

export interface ARObject {
  id: string;
  type: ARObjectType;
  position: Vector3;
  scale: Vector3;
  modelId: string;
  interactable: boolean;
  metadata: Record<string, unknown>;
}

export interface EnvironmentSettings {
  skybox?: string;
  lighting?: string;
  fog?: number;
  ambientColor?: string;
}

export interface ARScene {
  id: string;
  era: GeologicalEra;
  objects: ARObject[];
  environment: EnvironmentSettings;
  isPlaceholder: boolean;
}

export interface ARPlane {
  id: string;
  center: Vector3;
  extent: Vector3;
  normal: Vector3;
}

// ============================================
// Anomaly Detection Types
// ============================================

export type AnomalyClassification =
  | 'foundation'
  | 'pipe'
  | 'metal_debris'
  | 'unknown';

export interface MagneticAnomaly {
  id: string;
  position: GeoCoordinate;
  intensity: number;
  classification: AnomalyClassification;
}

export interface MagnetometerReading {
  timestamp: Date;
  x: number;
  y: number;
  z: number;
  magnitude: number;
}

export interface AnomalyDetectionResult {
  anomalies: MagneticAnomaly[];
  baselineMagnitude: number;
  threshold: number;
  scanDuration: number;
}


// ============================================
// Mode and Configuration Types
// ============================================

export type AppMode = 'construction' | 'education' | 'environmental';

export interface TimeRange {
  minYearsAgo: number;
  maxYearsAgo: number;
  eraBoundaries: EraBoundary[];
}

export interface EraBoundary {
  yearsAgo: number;
  eraName: string;
  hapticIntensity: number;
}

export interface VisualizationPreset {
  name: string;
  settings: Record<string, unknown>;
}

export interface ModeConfiguration {
  mode: AppMode;
  priorityDataTypes: string[];
  visibleUIElements: string[];
  hiddenUIElements: string[];
  defaultTimeRange: TimeRange;
  visualizationPresets: VisualizationPreset[];
}

// ============================================
// Cache Types
// ============================================

export interface CachedLocation {
  id: string;
  location: GeoCoordinate;
  geologicalStack: GeologicalStack;
  narratives: Narrative[];
  cachedAt: Date;
  lastAccessed: Date;
  schemaVersion: number;
}

export interface CachedLocationSummary {
  id: string;
  location: GeoCoordinate;
  cachedAt: Date;
  lastAccessed: Date;
}

export interface StorageUsage {
  usedBytes: number;
  totalBytes: number;
  locationCount: number;
}

// ============================================
// Scan Types
// ============================================

export type ScanStatus = 'idle' | 'scanning' | 'processing' | 'complete' | 'error';

export interface DeviceCapabilities {
  hasLiDAR: boolean;
  hasMagnetometer: boolean;
  hasARKit: boolean;
}

export interface LiDARPointCloud {
  points: Vector3[];
  timestamp: Date;
}

export interface ScanResult {
  id: string;
  timestamp: Date;
  location: GeoCoordinate;
  lidarData: LiDARPointCloud | null;
  magnetometerReadings: MagnetometerReading[];
  deviceCapabilities: DeviceCapabilities;
}
