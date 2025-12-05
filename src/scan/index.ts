// Scan Manager for DeepTime application
// Requirements: 1.1, 1.5

import type {
  ScanResult,
  ScanStatus,
  GeoCoordinate,
  DeviceCapabilities,
  MagnetometerReading,
  LiDARPointCloud,
} from '../types';

// ============================================
// Sensor Interfaces
// ============================================

/**
 * Interface for GPS sensor abstraction
 * Allows for different implementations (real device, mock, etc.)
 */
export interface GPSSensor {
  /** Gets current GPS coordinates */
  getCurrentPosition(): Promise<GeoCoordinate>;
  /** Checks if GPS is available */
  isAvailable(): boolean;
}

/**
 * Interface for LiDAR sensor abstraction
 */
export interface LiDARSensor {
  /** Captures LiDAR point cloud data */
  capture(): Promise<LiDARPointCloud>;
  /** Checks if LiDAR is available on this device */
  isAvailable(): boolean;
}

/**
 * Interface for magnetometer sensor abstraction
 */
export interface MagnetometerSensor {
  /** Gets current magnetometer readings over a duration */
  captureReadings(durationMs: number): Promise<MagnetometerReading[]>;
  /** Checks if magnetometer is available */
  isAvailable(): boolean;
}

// ============================================
// Scan Manager Configuration
// ============================================

/**
 * Configuration for ScanManager
 */
export interface ScanManagerConfig {
  /** Duration for magnetometer capture in milliseconds */
  magnetometerCaptureDurationMs?: number;
  /** Timeout for the entire scan operation in milliseconds */
  scanTimeoutMs?: number;
}

const DEFAULT_MAGNETOMETER_DURATION_MS = 2000;
const DEFAULT_SCAN_TIMEOUT_MS = 5000;

// ============================================
// Scan Manager Implementation
// ============================================

/**
 * Error thrown when scan operation fails
 */
export class ScanError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'GPS_UNAVAILABLE' | 'CANCELLED' | 'SENSOR_ERROR'
  ) {
    super(message);
    this.name = 'ScanError';
  }
}

/**
 * Generates a unique scan ID
 */
function generateScanId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * ScanManager coordinates sensor data acquisition and initiates the data pipeline.
 * 
 * Requirements:
 * - 1.1: WHEN a user points the device camera at the ground THEN the DeepTime_App 
 *        SHALL capture LiDAR depth data and GPS coordinates within 2 seconds
 * - 1.5: IF the device lacks LiDAR capability THEN the DeepTime_App SHALL fall back 
 *        to GPS-only geological queries with reduced precision indication
 */
export class ScanManager {
  private status: ScanStatus = 'idle';
  private currentScanId: string | null = null;
  private isCancelled = false;

  private gpsSensor: GPSSensor;
  private lidarSensor: LiDARSensor | null;
  private magnetometerSensor: MagnetometerSensor | null;
  private config: Required<ScanManagerConfig>;

  constructor(
    gpsSensor: GPSSensor,
    lidarSensor: LiDARSensor | null,
    magnetometerSensor: MagnetometerSensor | null,
    config: ScanManagerConfig = {}
  ) {
    this.gpsSensor = gpsSensor;
    this.lidarSensor = lidarSensor;
    this.magnetometerSensor = magnetometerSensor;
    this.config = {
      magnetometerCaptureDurationMs: config.magnetometerCaptureDurationMs ?? DEFAULT_MAGNETOMETER_DURATION_MS,
      scanTimeoutMs: config.scanTimeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS,
    };
  }

  /**
   * Returns current scan status
   */
  getStatus(): ScanStatus {
    return this.status;
  }

  /**
   * Cancels an in-progress scan
   */
  cancelScan(): void {
    if (this.status === 'scanning' || this.status === 'processing') {
      this.isCancelled = true;
      this.status = 'idle';
      this.currentScanId = null;
    }
  }

  /**
   * Gets device capabilities based on available sensors
   */
  getDeviceCapabilities(): DeviceCapabilities {
    return {
      hasLiDAR: this.lidarSensor?.isAvailable() ?? false,
      hasMagnetometer: this.magnetometerSensor?.isAvailable() ?? false,
      hasARKit: true, // Assumed available if app is running
    };
  }

  /**
   * Initiates a ground scan at current location.
   * 
   * Coordinates multiple sensors:
   * 1. GPS for location (required)
   * 2. LiDAR for depth data (optional, falls back gracefully)
   * 3. Magnetometer for anomaly detection (optional)
   * 
   * Requirements:
   * - 1.1: Capture LiDAR depth data and GPS coordinates within 2 seconds
   * - 1.5: Fall back to GPS-only if device lacks LiDAR
   * 
   * @returns ScanResult with captured sensor data
   * @throws ScanError if scan fails or times out
   */
  async startScan(): Promise<ScanResult> {
    // Check if already scanning
    if (this.status === 'scanning' || this.status === 'processing') {
      throw new ScanError('Scan already in progress', 'SENSOR_ERROR');
    }

    // Check GPS availability (required)
    if (!this.gpsSensor.isAvailable()) {
      this.status = 'error';
      throw new ScanError('GPS sensor is not available', 'GPS_UNAVAILABLE');
    }

    // Reset state
    this.isCancelled = false;
    this.status = 'scanning';
    this.currentScanId = generateScanId();
    const scanId = this.currentScanId;
    const timestamp = new Date();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new ScanError('Scan operation timed out', 'TIMEOUT'));
        }, this.config.scanTimeoutMs);
      });

      // Run scan with timeout
      const scanPromise = this.performScan(scanId, timestamp);
      const result = await Promise.race([scanPromise, timeoutPromise]);

      // Check if cancelled during scan
      if (this.isCancelled) {
        throw new ScanError('Scan was cancelled', 'CANCELLED');
      }

      this.status = 'complete';
      return result;

    } catch (error) {
      this.status = 'error';
      this.currentScanId = null;
      throw error;
    }
  }

  /**
   * Performs the actual scan operation, coordinating all sensors
   */
  private async performScan(scanId: string, timestamp: Date): Promise<ScanResult> {
    this.status = 'scanning';

    // Capture GPS location (required)
    const location = await this.gpsSensor.getCurrentPosition();

    if (this.isCancelled) {
      throw new ScanError('Scan was cancelled', 'CANCELLED');
    }

    // Capture LiDAR data (optional - falls back gracefully per Requirement 1.5)
    let lidarData: LiDARPointCloud | null = null;
    if (this.lidarSensor?.isAvailable()) {
      try {
        lidarData = await this.lidarSensor.capture();
      } catch {
        // LiDAR capture failed, continue without it
        lidarData = null;
      }
    }

    if (this.isCancelled) {
      throw new ScanError('Scan was cancelled', 'CANCELLED');
    }

    // Capture magnetometer readings (optional)
    let magnetometerReadings: MagnetometerReading[] = [];
    if (this.magnetometerSensor?.isAvailable()) {
      try {
        magnetometerReadings = await this.magnetometerSensor.captureReadings(
          this.config.magnetometerCaptureDurationMs
        );
      } catch {
        // Magnetometer capture failed, continue without it
        magnetometerReadings = [];
      }
    }

    if (this.isCancelled) {
      throw new ScanError('Scan was cancelled', 'CANCELLED');
    }

    this.status = 'processing';

    // Build device capabilities
    const deviceCapabilities = this.getDeviceCapabilities();

    // Adjust accuracy based on LiDAR availability (Requirement 1.5)
    // If no LiDAR, reduce the accuracy indication
    const adjustedLocation: GeoCoordinate = {
      ...location,
      accuracy: lidarData ? location.accuracy : Math.max(location.accuracy, 10), // Reduced precision without LiDAR
    };

    return {
      id: scanId,
      timestamp,
      location: adjustedLocation,
      lidarData,
      magnetometerReadings,
      deviceCapabilities,
    };
  }
}

// ============================================
// Mock Sensor Implementations (for testing)
// ============================================

/**
 * Mock GPS sensor for testing
 */
export class MockGPSSensor implements GPSSensor {
  private available: boolean;
  private position: GeoCoordinate;

  constructor(position: GeoCoordinate, available = true) {
    this.position = position;
    this.available = available;
  }

  async getCurrentPosition(): Promise<GeoCoordinate> {
    if (!this.available) {
      throw new Error('GPS not available');
    }
    return { ...this.position };
  }

  isAvailable(): boolean {
    return this.available;
  }

  setPosition(position: GeoCoordinate): void {
    this.position = position;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }
}

/**
 * Mock LiDAR sensor for testing
 */
export class MockLiDARSensor implements LiDARSensor {
  private available: boolean;
  private pointCloud: LiDARPointCloud;

  constructor(available = true) {
    this.available = available;
    this.pointCloud = {
      points: [],
      timestamp: new Date(),
    };
  }

  async capture(): Promise<LiDARPointCloud> {
    if (!this.available) {
      throw new Error('LiDAR not available');
    }
    return {
      ...this.pointCloud,
      timestamp: new Date(),
    };
  }

  isAvailable(): boolean {
    return this.available;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  setPointCloud(pointCloud: LiDARPointCloud): void {
    this.pointCloud = pointCloud;
  }
}

/**
 * Mock magnetometer sensor for testing
 */
export class MockMagnetometerSensor implements MagnetometerSensor {
  private available: boolean;
  private readings: MagnetometerReading[];

  constructor(available = true) {
    this.available = available;
    this.readings = [];
  }

  async captureReadings(_durationMs: number): Promise<MagnetometerReading[]> {
    if (!this.available) {
      throw new Error('Magnetometer not available');
    }
    return [...this.readings];
  }

  isAvailable(): boolean {
    return this.available;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  setReadings(readings: MagnetometerReading[]): void {
    this.readings = readings;
  }
}
