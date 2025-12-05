/**
 * LocationHeader Component
 * Displays current location name, search button, and offline indicator
 * Requirements: 1.1, 1.4, 5.3
 */

import { useState, useCallback, useEffect } from 'react';
import type { GeoCoordinate } from 'deep-time-core/types';
import { locationService, type GeoCoordinateWithName } from '../services/location';

export interface LocationHeaderProps {
  location: GeoCoordinate | null;
  isLoading: boolean;
  isOffline: boolean;
  onSearch: (query: string) => Promise<GeoCoordinate[]>;
  onLocationSelect: (location: GeoCoordinate) => void;
  onRequestLocation?: () => void;
}

/**
 * Formats coordinates for display (fallback)
 */
function formatCoordinates(location: GeoCoordinate): string {
  const lat = location.latitude.toFixed(2);
  const lon = location.longitude.toFixed(2);
  const latDir = location.latitude >= 0 ? 'N' : 'S';
  const lonDir = location.longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(parseFloat(lat))}°${latDir}, ${Math.abs(parseFloat(lon))}°${lonDir}`;
}

/**
 * Search icon SVG component
 */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}


/**
 * Location pin icon SVG component
 */
function LocationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

/**
 * Offline indicator badge
 * Requirement 5.3: Display cached locations with offline indicator
 */
function OfflineBadge() {
  return (
    <span className="offline-badge">
      <svg
        className="w-3 h-3"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
          clipRule="evenodd"
        />
        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
      </svg>
      Offline
    </span>
  );
}

/**
 * Search modal for manual location entry
 * Requirement 1.4: Allow manual location entry via search
 */
interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<GeoCoordinate[]>;
  onLocationSelect: (location: GeoCoordinate) => void;
}

function SearchModal({ isOpen, onClose, onLocationSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoCoordinateWithName[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      // Use locationService directly to get display names
      const searchResults = await locationService.searchLocation(query);
      setResults(searchResults);
      if (searchResults.length === 0) {
        setError('No locations found. Try a different search term.');
      }
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const handleSelect = useCallback((location: GeoCoordinateWithName) => {
    onLocationSelect(location);
    onClose();
    setQuery('');
    setResults([]);
  }, [onLocationSelect, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-deep-800 rounded-2xl shadow-xl animate-slide-up">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-3">Search Location</h2>
          
          {/* Search input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter city, address, or landmark..."
              className="flex-1 px-4 py-3 bg-deep-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="btn-primary touch-target flex items-center justify-center"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <SearchIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Error message */}
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
          
          {/* Results */}
          {results.length > 0 && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {results.map((location, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(location)}
                  className="w-full p-3 bg-deep-700 hover:bg-deep-600 rounded-lg text-left transition-colors touch-target"
                >
                  <div className="flex items-center gap-2">
                    <LocationIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{location.displayName || formatCoordinates(location)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}


/**
 * LocationHeader Component
 * Displays current location name with search and offline indicators
 * 
 * Requirements:
 * - 1.1: Request GPS location permission (displays location status)
 * - 1.4: Allow manual location entry via search
 * - 5.3: Display cached locations with offline indicator
 */
export function LocationHeader({
  location,
  isLoading,
  isOffline,
  onSearch,
  onLocationSelect,
  onRequestLocation,
}: LocationHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Reverse geocode when location changes to get a friendly name
  useEffect(() => {
    if (!location) {
      setLocationName(null);
      return;
    }

    // Check if location already has a display name (from search)
    const locWithName = location as GeoCoordinateWithName;
    if (locWithName.displayName) {
      setLocationName(locWithName.displayName);
      return;
    }

    // Otherwise, reverse geocode
    setIsReverseGeocoding(true);
    locationService.reverseGeocode(location)
      .then(name => {
        setLocationName(name);
      })
      .catch(() => {
        setLocationName(formatCoordinates(location));
      })
      .finally(() => {
        setIsReverseGeocoding(false);
      });
  }, [location]);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-deep-800/80 backdrop-blur-sm safe-top">
        {/* Location display */}
        <div className="flex items-center gap-2 min-w-0">
          <LocationIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
          
          {isLoading ? (
            <span className="text-gray-400 animate-pulse">Locating...</span>
          ) : location ? (
            <span className="text-white truncate">
              {isReverseGeocoding ? formatCoordinates(location) : (locationName || formatCoordinates(location))}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              {onRequestLocation && (
                <button 
                  onClick={onRequestLocation}
                  className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  📍 Use GPS
                </button>
              )}
              <span className="text-gray-500">or</span>
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
              >
                Search
              </button>
            </div>
          )}
        </div>

        {/* Right side: offline badge and search button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isOffline && <OfflineBadge />}
          
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors touch-target"
            aria-label="Search location"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Search modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={onSearch}
        onLocationSelect={onLocationSelect}
      />
    </>
  );
}

export default LocationHeader;
