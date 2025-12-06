/**
 * Geological Data Service
 * Provides USGS API integration and local caching with IndexedDB
 * Requirements: 1.2, 1.3
 */

import type { GeoCoordinate, GeologicalStack, GeologicalLayer } from 'deep-time-core/types';
import { parseGeologicalResponse, buildGeologicalStack } from 'deep-time-core/geological';

// ============================================
// Types
// ============================================

export interface GeologicalDataService {
  fetchGeology(location: GeoCoordinate): Promise<GeologicalStack>;
  getCached(location: GeoCoordinate): Promise<GeologicalStack | null>;
  cache(location: GeoCoordinate, data: GeologicalStack): Promise<void>;
  clearCache(): Promise<void>;
}

export type GeologicalErrorType =
  | 'network_error'
  | 'parse_error'
  | 'no_data'
  | 'cache_error'
  | 'api_error';

export class GeologicalError extends Error {
  constructor(
    public readonly type: GeologicalErrorType,
    message: string
  ) {
    super(message);
    this.name = 'GeologicalError';
  }
}

// ============================================
// IndexedDB Cache Implementation
// ============================================

const DB_NAME = 'deeptime-geological-cache';
const DB_VERSION = 1;
const STORE_NAME = 'geological-stacks';

interface CachedGeologicalData {
  key: string;
  location: GeoCoordinate;
  stack: GeologicalStack;
  cachedAt: string; // ISO date string
}

/**
 * Generates a cache key from coordinates
 * Uses 5 decimal places (~1.1m precision)
 */
export function generateCacheKey(location: GeoCoordinate): string {
  const lat = location.latitude.toFixed(5);
  const lon = location.longitude.toFixed(5);
  return `geo_${lat}_${lon}`;
}

/**
 * Opens the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new GeologicalError('cache_error', 'Failed to open cache database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };
  });
}

// ============================================
// USGS API Integration
// ============================================

const USGS_API_BASE = '/api/usgs/geology/state/json';

/**
 * Transforms USGS API response to our internal layer format
 * The USGS API returns geological unit data that we map to our layer structure
 */
function transformUSGSResponse(usgsData: unknown, _location: GeoCoordinate): unknown[] {
  // Handle various USGS response formats
  if (!usgsData || typeof usgsData !== 'object') {
    return [];
  }

  const data = usgsData as Record<string, unknown>;

  // USGS returns features array in GeoJSON format
  const features = data.features as unknown[] | undefined;
  if (!Array.isArray(features) || features.length === 0) {
    // Try alternate response format
    if (Array.isArray(data.units)) {
      return transformUSGSUnits(data.units as unknown[]);
    }
    return [];
  }

  return features.map((feature, index) => {
    const props = (feature as Record<string, unknown>).properties as Record<string, unknown> | undefined;
    if (!props) return null;

    // Map USGS properties to our layer format
    const unitAge = props.unit_age as string | undefined;
    const rockType = props.rocktype as string | undefined;
    const unitName = props.unit_name as string | undefined;

    return {
      id: `usgs-${index}`,
      depthStart: index * 10, // Estimated depth based on layer order
      depthEnd: (index + 1) * 10,
      material: mapRockTypeToMaterial(rockType),
      era: {
        name: unitName || 'Unknown',
        yearsAgo: estimateYearsAgo(unitAge),
        period: unitAge || 'Unknown',
      },
      period: unitAge || 'Unknown',
      fossilIndex: 'low',
      characteristics: {
        color: props.color as string | undefined,
      },
    };
  }).filter(Boolean);
}

/**
 * Transform USGS units array format
 */
function transformUSGSUnits(units: unknown[]): unknown[] {
  return units.map((unit, index) => {
    const u = unit as Record<string, unknown>;
    return {
      id: `usgs-unit-${index}`,
      depthStart: index * 10,
      depthEnd: (index + 1) * 10,
      material: mapRockTypeToMaterial(u.rocktype as string | undefined),
      era: {
        name: (u.name as string) || 'Unknown',
        yearsAgo: estimateYearsAgo(u.age as string | undefined),
        period: (u.age as string) || 'Unknown',
      },
      period: (u.age as string) || 'Unknown',
      fossilIndex: 'low',
      characteristics: {},
    };
  });
}

/**
 * Maps USGS rock types to our MaterialType
 */
function mapRockTypeToMaterial(rockType: string | undefined): string {
  if (!rockType) return 'soil';

  const type = rockType.toLowerCase();
  if (type.includes('granite')) return 'granite';
  if (type.includes('basalt')) return 'basalt';
  if (type.includes('limestone')) return 'limestone';
  if (type.includes('sandstone')) return 'sandstone';
  if (type.includes('shale')) return 'shale';
  if (type.includes('sand')) return 'sand';
  if (type.includes('clay')) return 'clay';
  if (type.includes('fill') || type.includes('artificial')) return 'fill';
  return 'soil';
}

/**
 * Estimates years ago from geological age string
 */
function estimateYearsAgo(ageString: string | undefined): number {
  if (!ageString) return 0;

  const age = ageString.toLowerCase();

  // Geological time periods (approximate midpoints in years)
  if (age.includes('quaternary') || age.includes('holocene')) return 10000;
  if (age.includes('pleistocene')) return 1000000;
  if (age.includes('pliocene')) return 4000000;
  if (age.includes('miocene')) return 15000000;
  if (age.includes('oligocene')) return 30000000;
  if (age.includes('eocene')) return 45000000;
  if (age.includes('paleocene')) return 60000000;
  if (age.includes('cretaceous')) return 100000000;
  if (age.includes('jurassic')) return 175000000;
  if (age.includes('triassic')) return 225000000;
  if (age.includes('permian')) return 275000000;
  if (age.includes('carboniferous') || age.includes('pennsylvanian') || age.includes('mississippian')) return 325000000;
  if (age.includes('devonian')) return 385000000;
  if (age.includes('silurian')) return 430000000;
  if (age.includes('ordovician')) return 470000000;
  if (age.includes('cambrian')) return 520000000;
  if (age.includes('precambrian') || age.includes('proterozoic')) return 1500000000;
  if (age.includes('archean')) return 3000000000;

  return 0;
}

// ============================================
// Geological Data Service Implementation
// ============================================

export const geologicalDataService: GeologicalDataService = {
  /**
   * Fetches geological data from USGS API for a location
   * Requirement 1.2: Query USGS geological database
   */
  async fetchGeology(location: GeoCoordinate): Promise<GeologicalStack> {
    // First check cache
    const cached = await this.getCached(location);
    if (cached) {
      return cached;
    }

    try {
      // Query USGS API
      const url = `${USGS_API_BASE}?latitude=${location.latitude}&longitude=${location.longitude}&format=json`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        // If USGS API fails, try to generate mock data for demo purposes
        return generateFallbackStack(location);
      }

      const usgsData = await response.json();

      // Transform USGS response to our format
      const rawLayers = transformUSGSResponse(usgsData, location);

      if (rawLayers.length === 0) {
        // No data from USGS, use fallback
        return generateFallbackStack(location);
      }

      // Parse using core library
      // Requirement 1.3: Construct GeologicalLayer stack
      const parseResult = parseGeologicalResponse(rawLayers);

      if (parseResult.errors.length > 0 || parseResult.layers.length === 0) {
        // Parse failed, use fallback
        return generateFallbackStack(location);
      }

      // Build the geological stack
      const buildResult = buildGeologicalStack(parseResult.layers, {
        location,
        dataSource: 'USGS',
        confidence: 0.8,
        queryTimestamp: new Date(),
      });

      if (!buildResult.stack) {
        return generateFallbackStack(location);
      }

      // Cache the result
      await this.cache(location, buildResult.stack);

      return buildResult.stack;
    } catch (error) {
      if (error instanceof GeologicalError) {
        throw error;
      }

      // Network error - try to return cached data or fallback
      const cached = await this.getCached(location);
      if (cached) {
        return cached;
      }

      // Generate fallback for demo
      return generateFallbackStack(location);
    }
  },

  /**
   * Gets cached geological data for a location
   */
  async getCached(location: GeoCoordinate): Promise<GeologicalStack | null> {
    try {
      const db = await openDatabase();
      const key = generateCacheKey(location);

      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onerror = () => {
          db.close();
          resolve(null);
        };

        request.onsuccess = () => {
          db.close();
          const cached = request.result as CachedGeologicalData | undefined;
          if (cached) {
            // Reconstruct dates
            const stack: GeologicalStack = {
              ...cached.stack,
              queryTimestamp: new Date(cached.stack.queryTimestamp),
            };
            resolve(stack);
          } else {
            resolve(null);
          }
        };
      });
    } catch {
      return null;
    }
  },

  /**
   * Caches geological data for a location
   */
  async cache(location: GeoCoordinate, data: GeologicalStack): Promise<void> {
    try {
      const db = await openDatabase();
      const key = generateCacheKey(location);

      const cachedData: CachedGeologicalData = {
        key,
        location,
        stack: {
          ...data,
          queryTimestamp: data.queryTimestamp,
        },
        cachedAt: new Date().toISOString(),
      };

      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(cachedData);

        request.onerror = () => {
          db.close();
          // Don't throw - caching is non-critical
          resolve();
        };

        request.onsuccess = () => {
          db.close();
          resolve();
        };
      });
    } catch {
      // Caching failed silently - non-critical
    }
  },

  /**
   * Clears all cached geological data
   */
  async clearCache(): Promise<void> {
    try {
      const db = await openDatabase();

      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => {
          db.close();
          resolve();
        };

        request.onsuccess = () => {
          db.close();
          resolve();
        };
      });
    } catch {
      // Clear failed silently
    }
  },
};

// ============================================
// Fallback Data Generation
// ============================================

/**
 * Generates fallback geological stack for demo purposes
 * when USGS API is unavailable or returns no data
 */
function generateFallbackStack(location: GeoCoordinate): GeologicalStack {
  const layers: GeologicalLayer[] = [
    {
      id: 'layer-0',
      depthStart: 0,
      depthEnd: 2,
      material: 'soil',
      era: { name: 'Holocene', yearsAgo: 10000, period: 'Quaternary' },
      period: 'Quaternary',
      fossilIndex: 'low',
      characteristics: { color: 'brown' },
    },
    {
      id: 'layer-1',
      depthStart: 2,
      depthEnd: 15,
      material: 'clay',
      era: { name: 'Pleistocene', yearsAgo: 1000000, period: 'Quaternary' },
      period: 'Quaternary',
      fossilIndex: 'medium',
      characteristics: { color: 'gray' },
    },
    {
      id: 'layer-2',
      depthStart: 15,
      depthEnd: 50,
      material: 'sandstone',
      era: { name: 'Miocene', yearsAgo: 15000000, period: 'Neogene' },
      period: 'Neogene',
      fossilIndex: 'high',
      characteristics: { color: 'tan' },
    },
    {
      id: 'layer-3',
      depthStart: 50,
      depthEnd: 150,
      material: 'limestone',
      era: { name: 'Cretaceous', yearsAgo: 100000000, period: 'Mesozoic' },
      period: 'Mesozoic',
      fossilIndex: 'exceptional',
      characteristics: { color: 'white' },
    },
    {
      id: 'layer-4',
      depthStart: 150,
      depthEnd: 500,
      material: 'granite',
      era: { name: 'Precambrian', yearsAgo: 1500000000, period: 'Proterozoic' },
      period: 'Proterozoic',
      fossilIndex: 'none',
      characteristics: { color: 'pink' },
    },
  ];

  return {
    location,
    layers,
    queryTimestamp: new Date(),
    dataSource: 'fallback',
    confidence: 0.5,
  };
}

export default geologicalDataService;
