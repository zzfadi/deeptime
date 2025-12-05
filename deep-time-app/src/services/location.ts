/**
 * Location Service
 * Provides GPS location and geocoding functionality
 * Requirements: 1.1, 1.4
 */

import type { GeoCoordinate } from 'deep-time-core/types';

export interface GeoCoordinateWithName extends GeoCoordinate {
  displayName?: string;
}

export interface LocationService {
  getCurrentPosition(): Promise<GeoCoordinate>;
  searchLocation(query: string): Promise<GeoCoordinateWithName[]>;
  reverseGeocode(location: GeoCoordinate): Promise<string>;
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
  async searchLocation(query: string): Promise<GeoCoordinateWithName[]> {
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
      
      return results.map((result: { lat: string; lon: string; display_name: string }) => ({
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        altitude: 0,
        accuracy: 100, // Geocoding accuracy is approximate
        displayName: formatDisplayName(result.display_name),
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

  /**
   * Reverse geocode coordinates to get a place name
   */
  async reverseGeocode(location: GeoCoordinate): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=10`,
        {
          headers: {
            'User-Agent': 'DeepTime-PWA/1.0',
          },
        }
      );

      if (!response.ok) {
        return formatCoordinatesSimple(location);
      }

      const result = await response.json();
      
      if (result.address) {
        // Try to get a meaningful name: city, town, village, county, or state
        const name = result.address.city 
          || result.address.town 
          || result.address.village 
          || result.address.county
          || result.address.state
          || result.address.country;
        
        if (name) {
          // Add country if different from name
          const country = result.address.country;
          if (country && country !== name) {
            return `${name}, ${country}`;
          }
          return name;
        }
      }
      
      return formatCoordinatesSimple(location);
    } catch {
      return formatCoordinatesSimple(location);
    }
  },
};

/**
 * Format display name from Nominatim (shorten long names)
 */
function formatDisplayName(fullName: string): string {
  const parts = fullName.split(',').map(p => p.trim());
  // Take first 2-3 meaningful parts
  if (parts.length <= 2) return fullName;
  return parts.slice(0, 3).join(', ');
}

/**
 * Simple coordinate formatting
 */
function formatCoordinatesSimple(location: GeoCoordinate): string {
  const lat = Math.abs(location.latitude).toFixed(2);
  const lon = Math.abs(location.longitude).toFixed(2);
  const latDir = location.latitude >= 0 ? 'N' : 'S';
  const lonDir = location.longitude >= 0 ? 'E' : 'W';
  return `${lat}°${latDir}, ${lon}°${lonDir}`;
}

export default locationService;
