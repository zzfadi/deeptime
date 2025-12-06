/**
 * Location Context Service
 * Enriches location data with place names, geological features, and landmarks
 * Requirements: 1.2
 * 
 * This service builds LocationContext objects by:
 * - Fetching place names from coordinates via reverse geocoding
 * - Identifying geological features from layer data
 * - Finding nearby landmarks (when available)
 */

import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';
import type { LocationContext } from './types';
import { locationService } from '../location';

// ============================================
// Types
// ============================================

/**
 * Options for location context enrichment
 */
export interface LocationContextOptions {
  /** Whether to fetch place name via reverse geocoding */
  fetchPlaceName?: boolean;
  /** Whether to include geological features from layer */
  includeGeologicalFeatures?: boolean;
  /** Additional features to include */
  additionalFeatures?: string[];
  /** Additional landmarks to include */
  additionalLandmarks?: string[];
  /** Timeout for geocoding requests in ms */
  geocodingTimeout?: number;
}

/**
 * Error types for location context operations
 */
export type LocationContextErrorType =
  | 'geocoding_failed'
  | 'timeout'
  | 'network_error';

/**
 * Custom error class for location context errors
 */
export class LocationContextError extends Error {
  constructor(
    public readonly type: LocationContextErrorType,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'LocationContextError';
  }
}

// ============================================
// Location Context Service Interface
// ============================================

export interface LocationContextService {
  /**
   * Build a complete LocationContext for a location-era combination
   * Requirement 1.2: Include location-specific geological metadata in prompts
   */
  buildLocationContext(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    options?: LocationContextOptions
  ): Promise<LocationContext>;

  /**
   * Fetch place name from coordinates using reverse geocoding
   */
  fetchPlaceName(location: GeoCoordinate): Promise<string>;

  /**
   * Extract geological features from a geological layer
   */
  extractGeologicalFeatures(layer: GeologicalLayer): string[];

  /**
   * Format coordinates as a fallback place name
   */
  formatCoordinatesAsName(location: GeoCoordinate): string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Formats material type into a readable geological feature description
 */
function formatMaterialFeature(material: string): string {
  const materialDescriptions: Record<string, string> = {
    soil: 'rich soil deposits',
    clay: 'clay-rich sediments',
    sand: 'sandy formations',
    limestone: 'limestone bedrock',
    granite: 'granite formations',
    shale: 'shale deposits',
    sandstone: 'sandstone layers',
    basalt: 'basaltic rock formations',
    fill: 'sedimentary fill',
  };
  
  return materialDescriptions[material] || `${material} formations`;
}

/**
 * Formats fossil index into a readable description
 */
function formatFossilFeature(fossilIndex: string): string | null {
  const fossilDescriptions: Record<string, string> = {
    exceptional: 'exceptionally rich fossil deposits',
    high: 'abundant fossil remains',
    medium: 'moderate fossil presence',
    low: 'sparse fossil evidence',
    none: null as unknown as string, // No feature to add
  };
  
  return fossilDescriptions[fossilIndex] || null;
}

/**
 * Formats depth range into a readable description
 */
function formatDepthFeature(depthStart: number, depthEnd: number): string {
  const thickness = Math.abs(depthEnd - depthStart);
  if (thickness > 100) {
    return `deep geological layer (${thickness}m thick)`;
  } else if (thickness > 50) {
    return `substantial geological layer (${thickness}m thick)`;
  } else if (thickness > 10) {
    return `moderate geological layer (${thickness}m thick)`;
  }
  return `thin geological layer (${thickness}m thick)`;
}

/**
 * Formats layer characteristics into readable features
 */
function formatCharacteristicsFeatures(characteristics: GeologicalLayer['characteristics']): string[] {
  const features: string[] = [];
  
  if (characteristics?.color) {
    features.push(`${characteristics.color} coloration`);
  }
  
  if (characteristics?.mineralComposition && characteristics.mineralComposition.length > 0) {
    const minerals = characteristics.mineralComposition.slice(0, 3).join(', ');
    features.push(`mineral composition including ${minerals}`);
  }
  
  return features;
}

// ============================================
// Location Context Service Implementation
// ============================================

export const locationContextService: LocationContextService = {
  /**
   * Build a complete LocationContext for a location-era combination
   * Property 2: Geological metadata in prompts
   */
  async buildLocationContext(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    options: LocationContextOptions = {}
  ): Promise<LocationContext> {
    const {
      fetchPlaceName = true,
      includeGeologicalFeatures = true,
      additionalFeatures = [],
      additionalLandmarks = [],
      geocodingTimeout = 5000,
    } = options;

    // Start with basic context
    let placeName = this.formatCoordinatesAsName(location);
    
    // Fetch place name if requested
    if (fetchPlaceName) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error('Geocoding timeout')), geocodingTimeout);
        });
        
        // Race between geocoding and timeout
        placeName = await Promise.race([
          this.fetchPlaceName(location),
          timeoutPromise,
        ]);
      } catch (error) {
        // Log warning but continue with coordinate-based name
        console.warn('[LocationContextService] Failed to fetch place name:', error);
        // Keep the formatted coordinates as fallback
      }
    }

    // Extract geological features
    let geologicalFeatures: string[] = [];
    if (includeGeologicalFeatures) {
      geologicalFeatures = this.extractGeologicalFeatures(layer);
    }

    // Add any additional features
    if (additionalFeatures.length > 0) {
      geologicalFeatures = [...geologicalFeatures, ...additionalFeatures];
    }

    // Build the location context
    const context: LocationContext = {
      coordinates: location,
      placeName,
      geologicalFeatures,
      nearbyLandmarks: additionalLandmarks,
    };

    return context;
  },

  /**
   * Fetch place name from coordinates using reverse geocoding
   */
  async fetchPlaceName(location: GeoCoordinate): Promise<string> {
    try {
      const placeName = await locationService.reverseGeocode(location);
      return placeName;
    } catch (error) {
      console.warn('[LocationContextService] Reverse geocoding failed:', error);
      return this.formatCoordinatesAsName(location);
    }
  },

  /**
   * Extract geological features from a geological layer
   * Property 2: Geological metadata in prompts
   * Property 5: Geological details in content
   */
  extractGeologicalFeatures(layer: GeologicalLayer): string[] {
    const features: string[] = [];

    // Add material type feature
    if (layer.material) {
      features.push(formatMaterialFeature(layer.material));
    }

    // Add fossil index feature (if significant)
    if (layer.fossilIndex) {
      const fossilFeature = formatFossilFeature(layer.fossilIndex);
      if (fossilFeature) {
        features.push(fossilFeature);
      }
    }

    // Add depth feature
    if (layer.depthStart !== undefined && layer.depthEnd !== undefined) {
      features.push(formatDepthFeature(layer.depthStart, layer.depthEnd));
    }

    // Add characteristics features
    if (layer.characteristics) {
      const charFeatures = formatCharacteristicsFeatures(layer.characteristics);
      features.push(...charFeatures);
    }

    // Add era-specific context
    if (layer.era) {
      features.push(`${layer.era.period} period geological signature`);
    }

    return features;
  },

  /**
   * Format coordinates as a fallback place name
   */
  formatCoordinatesAsName(location: GeoCoordinate): string {
    const lat = Math.abs(location.latitude).toFixed(4);
    const lon = Math.abs(location.longitude).toFixed(4);
    const latDir = location.latitude >= 0 ? 'N' : 'S';
    const lonDir = location.longitude >= 0 ? 'E' : 'W';
    return `Location at ${lat}°${latDir}, ${lon}°${lonDir}`;
  },
};

// ============================================
// Convenience Functions
// ============================================

/**
 * Quick helper to build location context with default options
 */
export async function buildLocationContext(
  location: GeoCoordinate,
  layer: GeologicalLayer
): Promise<LocationContext> {
  return locationContextService.buildLocationContext(location, layer);
}

/**
 * Build location context synchronously (without geocoding)
 * Useful when you need immediate results without async operations
 */
export function buildLocationContextSync(
  location: GeoCoordinate,
  layer: GeologicalLayer,
  placeName?: string
): LocationContext {
  const features = locationContextService.extractGeologicalFeatures(layer);
  
  return {
    coordinates: location,
    placeName: placeName || locationContextService.formatCoordinatesAsName(location),
    geologicalFeatures: features,
    nearbyLandmarks: [],
  };
}

export default locationContextService;
