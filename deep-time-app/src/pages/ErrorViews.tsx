/**
 * Error and Fallback Views
 * GPS denied, API error, and offline views with appropriate actions
 * Requirements: 1.4, 1.5, 2.4, 5.3
 */

import { useState, useCallback, useEffect } from 'react';
import { LocationHeader } from '../components';
import { cacheService } from '../services/cache';
import type { GeoCoordinate, CachedLocation } from 'deep-time-core/types';

// ============================================
// Shared Components
// ============================================

interface SearchInputProps {
  onSearch: (query: string) => Promise<GeoCoordinate[]>;
  onLocationSelect: (location: GeoCoordinate) => void;
  placeholder?: string;
}

function SearchInput({ onSearch, onLocationSelect, placeholder }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoCoordinate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const searchResults = await onSearch(query);
      setResults(searchResults);
      if (searchResults.length === 0) {
        setError('No locations found. Try a different search term.');
      }
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [query, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const formatCoordinates = (loc: GeoCoordinate): string => {
    const lat = loc.latitude.toFixed(4);
    const lon = loc.longitude.toFixed(4);
    const latDir = loc.latitude >= 0 ? 'N' : 'S';
    const lonDir = loc.longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(parseFloat(lat))}°${latDir}, ${Math.abs(parseFloat(lon))}°${lonDir}`;
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Enter city, address, or landmark..."}
          className="flex-1 px-4 py-3 bg-deep-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="btn-primary touch-target flex items-center justify-center px-6"
        >
          {isSearching ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Search'
          )}
        </button>
      </div>
      
      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
      
      {results.length > 0 && (
        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
          {results.map((location, index) => (
            <button
              key={index}
              onClick={() => onLocationSelect(location)}
              className="w-full p-3 bg-deep-700 hover:bg-deep-600 rounded-lg text-left transition-colors touch-target"
            >
              <span className="text-white">{formatCoordinates(location)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// GPS Denied View (Requirement 1.4)
// ============================================

interface GPSDeniedViewProps {
  onSearch: (query: string) => Promise<GeoCoordinate[]>;
  onLocationSelect: (location: GeoCoordinate) => void;
  isOffline: boolean;
}

/**
 * GPS Denied View
 * Shown when user denies location permission
 * Requirement 1.4: Allow manual location entry via search
 */
export function GPSDeniedView({ onSearch, onLocationSelect, isOffline }: GPSDeniedViewProps) {
  return (
    <div className="min-h-screen bg-deep-900 text-white flex flex-col">
      <LocationHeader
        location={null}
        isLoading={false}
        isOffline={isOffline}
        onSearch={onSearch}
        onLocationSelect={onLocationSelect}
      />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">📍</div>
          <h2 className="text-2xl font-bold mb-3">Location Access Needed</h2>
          <p className="text-gray-400 mb-6">
            DeepTime needs your location to show the geological layers beneath your feet. 
            You can also search for any location manually.
          </p>
          
          <SearchInput
            onSearch={onSearch}
            onLocationSelect={onLocationSelect}
            placeholder="Search for a location..."
          />
          
          <div className="mt-8 p-4 bg-deep-800 rounded-xl text-left">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              How to enable location:
            </h3>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Open your browser settings</li>
              <li>Find site permissions or privacy settings</li>
              <li>Allow location access for this site</li>
              <li>Refresh the page</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// API Error View (Requirement 1.5)
// ============================================

interface APIErrorViewProps {
  error: string;
  onRetry: () => void;
  onSearch: (query: string) => Promise<GeoCoordinate[]>;
  onLocationSelect: (location: GeoCoordinate) => void;
  isOffline: boolean;
}

/**
 * API Error View
 * Shown when geological data fetch fails
 * Requirement 1.5: Display friendly error with retry option
 */
export function APIErrorView({ 
  error, 
  onRetry, 
  onSearch, 
  onLocationSelect,
  isOffline 
}: APIErrorViewProps) {
  return (
    <div className="min-h-screen bg-deep-900 text-white flex flex-col">
      <LocationHeader
        location={null}
        isLoading={false}
        isOffline={isOffline}
        onSearch={onSearch}
        onLocationSelect={onLocationSelect}
      />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🌍</div>
          <h2 className="text-2xl font-bold mb-3">Unable to Load Data</h2>
          <p className="text-gray-400 mb-2">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            This might be a temporary issue. Please try again or search for a different location.
          </p>
          
          <div className="flex flex-col gap-4 items-center">
            <button
              onClick={onRetry}
              className="btn-primary w-full max-w-xs touch-target"
            >
              Try Again
            </button>
            
            <div className="w-full max-w-xs">
              <p className="text-sm text-gray-500 mb-3">Or search for a location:</p>
              <SearchInput
                onSearch={onSearch}
                onLocationSelect={onLocationSelect}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Offline View (Requirement 5.3)
// ============================================

interface OfflineViewProps {
  onLocationSelect: (location: GeoCoordinate) => void;
  onRetry: () => void;
}

/**
 * Offline View
 * Shows cached locations when offline
 * Requirement 5.3: Display cached locations with offline indicator
 */
export function OfflineView({ onLocationSelect, onRetry }: OfflineViewProps) {
  const [cachedLocations, setCachedLocations] = useState<CachedLocation[]>([]);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  // Load cached locations from local IndexedDB cache
  // Requirement 5.3: Display cached locations with offline indicator
  useEffect(() => {
    async function loadCachedLocations() {
      try {
        await cacheService.initialize();
        const summaries = await cacheService.getAllLocationSummaries();
        
        // Load full location data for each summary
        const locations: CachedLocation[] = [];
        for (const summary of summaries) {
          const fullLocation = await cacheService.getLocation(summary.location);
          if (fullLocation) {
            locations.push(fullLocation);
          }
        }
        
        setCachedLocations(locations);
      } catch {
        // Failed to load cache, show empty state
        setCachedLocations([]);
      } finally {
        setIsLoadingCache(false);
      }
    }
    
    loadCachedLocations();
  }, []);

  const formatCoordinates = (loc: GeoCoordinate): string => {
    const lat = loc.latitude.toFixed(4);
    const lon = loc.longitude.toFixed(4);
    const latDir = loc.latitude >= 0 ? 'N' : 'S';
    const lonDir = loc.longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(parseFloat(lat))}°${latDir}, ${Math.abs(parseFloat(lon))}°${lonDir}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-deep-900 text-white flex flex-col">
      {/* Offline header */}
      <header className="flex items-center justify-between px-4 py-3 bg-deep-800/80 backdrop-blur-sm safe-top">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌍</span>
          <span className="font-semibold">DeepTime</span>
        </div>
        <span className="offline-badge">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
          </svg>
          Offline
        </span>
      </header>
      
      <div className="flex-1 flex flex-col p-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">📶</div>
          <h2 className="text-xl font-bold mb-2">You're Offline</h2>
          <p className="text-gray-400 text-sm">
            No internet connection. You can still explore previously visited locations.
          </p>
        </div>
        
        {isLoadingCache ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : cachedLocations.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Cached Locations ({cachedLocations.length})
            </h3>
            <div className="space-y-3">
              {cachedLocations.map((cached) => (
                <button
                  key={cached.id}
                  onClick={() => onLocationSelect(cached.location)}
                  className="w-full p-4 bg-deep-700 hover:bg-deep-600 rounded-xl text-left transition-colors touch-target"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">
                      {formatCoordinates(cached.location)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(cached.cachedAt)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {cached.geologicalStack.layers.length} geological layers
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-gray-400 mb-2">No cached locations</p>
            <p className="text-sm text-gray-500">
              Visit locations while online to save them for offline access.
            </p>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-deep-700">
          <button
            onClick={onRetry}
            className="btn-secondary w-full touch-target"
          >
            Check Connection
          </button>
        </div>
      </div>
    </div>
  );
}

export default { GPSDeniedView, APIErrorView, OfflineView };
