/**
 * Location Service
 * Provides GPS location and geocoding functionality
 * Requirements: 1.1, 1.4
 */

import type { GeoCoordinate } from 'deep-time-core/types';

export interface LocationService {
  getCurrentPosition(): Promise<GeoCoordinate>;
  searchLocation(query: string): Promise<GeoCoordinate[]>;
  isAvailable(): boolean;
}

export type LocationErrorType = 
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'not_supported'
  | 'geocoding_failed';

export class LocationError extends Error {
  constructor(
    public readonly type: LocationErrorType,
    message: string
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

/**
 * Maps GeolocationPositionError codes to our error types
 */
function mapGeolocationError(error: GeolocationPositionError): LocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new LocationError(
        'permission_denied',
        'Location permission was denied. Please enable location access or search manually.'
      );
    case error.POSITION_UNAVAILABLE:
      return new LocationError(
        'position_unavailable',
        'Unable to determine your location. Please try again or search manually.'
      );
    case error.TIMEOUT:
      return new LocationError(
        'timeout',
        'Location request timed out. Please try again.'
      );
    default:
      return new LocationError(
        'position_unavailable',
        'An unknown error occurred while getting your location.'
      );
  }
}

/**
 * Default location service implementation using browser Geolocation API
 * and Nominatim for geocoding (free, no API key required)
 */
export const locationService: LocationService = {
  /**
   * Check if geolocation is available in the browser
   */
  isAvailable(): boolean {
    return 'geolocation' in navigator;
  },

  /**
   * Get current GPS position using browser Geolocation API
   * Requirement 1.1: Request GPS location permission
   */
  async getCurrentPosition(): Promise<GeoCoordinate> {
    if (!this.isAvailable()) {
      throw new LocationError(
        'not_supported',
        'Geolocation is not supported by your browser.'
      );
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude ?? 0,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(mapGeolocationError(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache position for 1 minute
        }
      );
    });
  },

  /**
   * Search for locations by name using Nominatim geocoding API
   * Requirement 1.4: Allow manual location entry via search
   */
  async searchLocation(query: string): Promise<GeoCoordinate[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5`,
        {
          headers: {
            'User-Agent': 'DeepTime-PWA/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new LocationError(
          'geocoding_failed',
          'Failed to search for location. Please try again.'
        );
      }

      const results = await response.json();
      
      return results.map((result: { lat: string; lon: string }) => ({
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        altitude: 0,
        accuracy: 100, // Geocoding accuracy is approximate
      }));
    } catch (error) {
      if (error instanceof LocationError) {
        throw error;
      }
      throw new LocationError(
        'geocoding_failed',
        'Failed to search for location. Please check your internet connection.'
      );
    }
  },
};

export default locationService;
