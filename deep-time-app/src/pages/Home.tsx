/**
 * Home Page Component
 * Main view displaying geological stack summary with time slider and era card
 * Requirements: 1.1, 1.2, 3.1, 5.3
 */

import { useEffect, useCallback } from 'react';
import { useAppStore, getEraBoundaries } from '../store/appStore';
import { LocationHeader, TimeSlider, EraCard, FullPageSpinner, OnlineStatusToast } from '../components';
import { GPSDeniedView, APIErrorView, OfflineView } from './ErrorViews';
import { useOfflineStatus } from '../hooks';
import type { GeoCoordinate } from 'deep-time-core/types';

export interface HomeProps {
  /** Callback when user wants to view era details */
  onViewEraDetail?: () => void;
}

/**
 * Home Page
 * Displays the main geological exploration interface
 * 
 * Requirements:
 * - 1.1: Request GPS location permission on mount
 * - 1.2: Query USGS geological database for location
 * - 3.1: Provide visual feedback showing current era via TimeSlider
 */
export function Home({ onViewEraDetail }: HomeProps) {
  const {
    location,
    isLocationLoading,
    geologicalStack,
    currentEra,
    timePosition,
    narrative,
    isNarrativeLoading,
    isLoading,
    error,
    locationError,
    requestLocation,
    searchLocation,
    setLocation,
    setTimePosition,
    initializeForLocation,
    clearErrors,
    setOfflineStatus,
    loadCachedLocations,
  } = useAppStore();

  // Use offline status hook for real-time online/offline detection
  // Requirement 5.3: Display cached locations with offline indicator
  const { isOffline, justCameOnline } = useOfflineStatus();

  // Sync offline status to store
  useEffect(() => {
    setOfflineStatus(isOffline);
  }, [isOffline, setOfflineStatus]);

  // Load cached locations on mount
  useEffect(() => {
    loadCachedLocations();
  }, [loadCachedLocations]);

  // Request location on mount (Requirement 1.1)
  // Note: On iOS Safari, geolocation requires user gesture, so we skip auto-request on iOS
  useEffect(() => {
    // Check if iOS - don't auto-request on iOS as it requires user gesture
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    const hasTriedLocation = sessionStorage.getItem('locationRequested');
    
    // Only auto-request on non-iOS devices
    if (!isIOS && !location && !isLocationLoading && !error && !locationError && !hasTriedLocation) {
      sessionStorage.setItem('locationRequested', 'true');
      requestLocation();
    }
  }, [location, isLocationLoading, error, locationError, requestLocation]);

  // Manual location request handler (for mobile/iOS)
  const handleRequestLocation = useCallback(() => {
    clearErrors();
    requestLocation();
  }, [clearErrors, requestLocation]);

  // Handle location selection from search
  const handleLocationSelect = useCallback(
    async (selectedLocation: GeoCoordinate) => {
      setLocation(selectedLocation);
      await initializeForLocation(selectedLocation);
    },
    [setLocation, initializeForLocation]
  );

  // Handle retry after error
  const handleRetry = useCallback(() => {
    clearErrors();
    requestLocation();
  }, [clearErrors, requestLocation]);

  // Get era boundaries for the time slider
  const eraBoundaries = getEraBoundaries(geologicalStack);

  // Check if GPS was denied (Requirement 1.4)
  const isGPSDenied = locationError?.includes('denied') || 
                      locationError?.includes('permission') ||
                      locationError?.includes('blocked');

  // Show GPS denied view with search option
  if (isGPSDenied && !geologicalStack) {
    return (
      <GPSDeniedView
        onSearch={searchLocation}
        onLocationSelect={handleLocationSelect}
        isOffline={isOffline}
      />
    );
  }

  // Show offline view with cached locations (Requirement 5.3)
  if (isOffline && !geologicalStack && !isLoading) {
    return (
      <OfflineView
        onLocationSelect={handleLocationSelect}
        onRetry={handleRetry}
      />
    );
  }

  // Show loading state while getting initial location
  if (isLoading && !geologicalStack) {
    return (
      <div className="min-h-screen bg-deep-900 text-white flex flex-col">
        <LocationHeader
          location={location}
          isLoading={isLocationLoading}
          isOffline={isOffline}
          onSearch={searchLocation}
          onLocationSelect={handleLocationSelect}
          onRequestLocation={handleRequestLocation}
        />
        <FullPageSpinner label="Discovering geological layers..." />
      </div>
    );
  }

  // Show API error state with retry (Requirement 1.5)
  if (error && !geologicalStack) {
    return (
      <APIErrorView
        error={error}
        onRetry={handleRetry}
        onSearch={searchLocation}
        onLocationSelect={handleLocationSelect}
        isOffline={isOffline}
      />
    );
  }

  return (
    <div className="min-h-screen bg-deep-900 text-white flex flex-col">
      {/* Header with location */}
      <LocationHeader
        location={location}
        isLoading={isLocationLoading}
        isOffline={isOffline}
        onSearch={searchLocation}
        onLocationSelect={handleLocationSelect}
        onRequestLocation={handleRequestLocation}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        {/* Time slider - vertical on mobile, side panel on desktop */}
        {geologicalStack && eraBoundaries.length > 0 && (
          <div className="h-64 md:h-auto md:w-48 flex-shrink-0">
            <TimeSlider
              value={timePosition}
              onChange={setTimePosition}
              eraBoundaries={eraBoundaries}
              snapToEra={true}
            />
          </div>
        )}

        {/* Era card with tap to view details */}
        <div className="flex-1 overflow-y-auto">
          <div 
            onClick={onViewEraDetail}
            className={onViewEraDetail ? 'cursor-pointer' : ''}
          >
            <EraCard
              era={currentEra}
              narrative={narrative}
              isLoading={isNarrativeLoading}
              webXRSupported={false}
            />
          </div>
          
          {/* Geological stack summary */}
          {geologicalStack && (
            <div className="mt-4 p-4 bg-deep-800 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                Geological Stack Summary
              </h3>
              <div className="space-y-2">
                {geologicalStack.layers
                  .sort((a, b) => a.depthStart - b.depthStart)
                  .slice(0, 5)
                  .map((layer) => (
                    <div 
                      key={layer.id}
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                        currentEra?.id === layer.id 
                          ? 'bg-blue-600/20 border border-blue-500/30' 
                          : 'bg-deep-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: layer.era.yearsAgo > 66_000_000 
                              ? '#4a3d2d' 
                              : layer.era.yearsAgo > 2_600_000 
                                ? '#3d4a2d' 
                                : '#2d3d4a' 
                          }}
                        />
                        <span className="text-sm text-white">{layer.era.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {layer.depthStart}m - {layer.depthEnd}m
                      </span>
                    </div>
                  ))}
                {geologicalStack.layers.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{geologicalStack.layers.length - 5} more layers
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer with app info */}
      <footer className="px-4 py-2 text-center text-xs text-gray-500 safe-bottom">
        DeepTime • Explore geological time beneath your feet
      </footer>

      {/* Online/Offline status toast */}
      <OnlineStatusToast isOffline={isOffline} justCameOnline={justCameOnline} />
    </div>
  );
}

export default Home;
