/**
 * Home Page Component
 * Main view with 3D cross-section visualization of geological layers
 * Requirements: 1.1, 1.2, 3.5, 4.1, 4.3
 */

import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { LocationHeader, FullPageSpinner, OnlineStatusToast, CrossSectionView } from '../components';
import { GPSDeniedView, APIErrorView, OfflineView } from './ErrorViews';
import { useOfflineStatus } from '../hooks';
import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';

export interface HomeProps {
  onViewEraDetail?: () => void;
}

/**
 * Home Page - 3D Cross-Section View
 * Requirement 1.1: Render 3D visualization showing all geological layers
 * Requirement 3.5: Navigate to full EraDetail page
 * Requirement 4.1: Fill available screen space on mobile
 * Requirement 4.3: Adapt layout on orientation changes
 */
export function Home({ onViewEraDetail }: HomeProps) {
  const {
    location,
    isLocationLoading,
    geologicalStack,
    isLoading,
    error,
    locationError,
    requestLocation,
    searchLocation,
    setLocation,
    initializeForLocation,
    clearErrors,
    setOfflineStatus,
    loadCachedLocations,
    narrativeCache,
    selectEra,
  } = useAppStore();

  const { isOffline, justCameOnline } = useOfflineStatus();

  useEffect(() => {
    setOfflineStatus(isOffline);
  }, [isOffline, setOfflineStatus]);

  useEffect(() => {
    loadCachedLocations();
  }, [loadCachedLocations]);

  // Auto-request location on non-iOS devices
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const hasTriedLocation = sessionStorage.getItem('locationRequested');
    if (!isIOS && !location && !isLocationLoading && !error && !locationError && !hasTriedLocation) {
      sessionStorage.setItem('locationRequested', 'true');
      requestLocation();
    }
  }, [location, isLocationLoading, error, locationError, requestLocation]);

  const handleRequestLocation = useCallback(() => {
    clearErrors();
    requestLocation();
  }, [clearErrors, requestLocation]);

  const handleLocationSelect = useCallback(
    async (selectedLocation: GeoCoordinate) => {
      setLocation(selectedLocation);
      await initializeForLocation(selectedLocation);
    },
    [setLocation, initializeForLocation]
  );

  const handleRetry = useCallback(() => {
    clearErrors();
    requestLocation();
  }, [clearErrors, requestLocation]);

  /**
   * Handle layer selection from CrossSectionView
   * Updates the app store with the selected era
   */
  const handleLayerSelect = useCallback((layer: GeologicalLayer) => {
    selectEra(layer);
  }, [selectEra]);

  /**
   * Handle view details navigation
   * Requirement 3.5: Navigate to full EraDetail page
   */
  const handleViewDetails = useCallback((layer: GeologicalLayer) => {
    selectEra(layer);
    onViewEraDetail?.();
  }, [selectEra, onViewEraDetail]);

  const isGPSDenied = locationError?.includes('denied') ||
    locationError?.includes('permission') ||
    locationError?.includes('blocked');

  // Error states
  if (isGPSDenied && !geologicalStack) {
    return (
      <GPSDeniedView
        onSearch={searchLocation}
        onLocationSelect={handleLocationSelect}
        isOffline={isOffline}
      />
    );
  }

  if (isOffline && !geologicalStack && !isLoading) {
    return (
      <OfflineView
        onLocationSelect={handleLocationSelect}
        onRetry={handleRetry}
      />
    );
  }

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
    <div className="h-screen bg-deep-900 text-white flex flex-col overflow-hidden">
      {/* LocationHeader - kept unchanged per requirements */}
      <LocationHeader
        location={location}
        isLoading={isLocationLoading}
        isOffline={isOffline}
        onSearch={searchLocation}
        onLocationSelect={handleLocationSelect}
        onRequestLocation={handleRequestLocation}
      />

      {/* Main content area - CrossSectionView fills remaining space */}
      {/* Requirement 4.1: Fill available screen space on mobile */}
      {/* Requirement 4.3: Adapt layout on orientation changes */}
      <main className="flex-1 overflow-hidden">
        <CrossSectionView
          geologicalStack={geologicalStack}
          narrativeCache={narrativeCache}
          onLayerSelect={handleLayerSelect}
          onViewDetails={handleViewDetails}
          isLoading={isLoading}
          location={location}
        />
      </main>

      <OnlineStatusToast isOffline={isOffline} justCameOnline={justCameOnline} />
    </div>
  );
}

export default Home;
