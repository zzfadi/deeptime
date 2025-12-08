/**
 * Home Page Component
 * Main view with simplified layer exploration interface
 * Requirements: 1.1, 1.2, 4.1, 4.3, 6.1, 6.2
 */

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { LocationHeader, FullPageSpinner, OnlineStatusToast, LayerExplorer } from '../components';
import { GPSDeniedView, APIErrorView, OfflineView } from './ErrorViews';
import { useOfflineStatus, useWebXRSupport } from '../hooks';
import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';

export interface HomeProps {
  /** Callback when AR is entered for a specific layer */
  onEnterAR?: (layer: GeologicalLayer) => void;
}

/**
 * Home Page - Simplified Layer Explorer
 * Requirement 1.1: Display geological layers as a vertical scrollable list
 * Requirement 4.1: Fill available screen space on mobile
 * Requirement 4.3: Adapt layout on orientation changes
 * Requirement 6.1: No separate EraDetail page - all content inline
 * Requirement 6.2: Display all layer content inline within expanded layer
 */
export function Home({ onEnterAR }: HomeProps) {
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
    selectEra,
    currentEra,
  } = useAppStore();

  const { isOffline, justCameOnline } = useOfflineStatus();
  
  // AR support detection
  // Requirement 5.2: Detect AR support and update button state
  const { isARSupported, isChecking: isARChecking } = useWebXRSupport();
  
  // Track the last expanded layer for state preservation
  // Requirement 5.4: Preserve expanded layer state when returning from AR
  const [lastExpandedLayerId, setLastExpandedLayerId] = useState<string | null>(
    currentEra?.id ?? null
  );

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
   * Handle AR entry from LayerExplorer
   * Requirement 5.3: Transition to AR view for selected era
   * Requirement 5.4: Preserve expanded layer state for return from AR
   */
  const handleEnterAR = useCallback((layer: GeologicalLayer) => {
    // Save the expanded layer ID for state preservation when returning from AR
    setLastExpandedLayerId(layer.id);
    selectEra(layer);
    onEnterAR?.(layer);
  }, [selectEra, onEnterAR]);

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

      {/* Main content area - LayerExplorer fills remaining space */}
      {/* Requirement 4.1: Fill available screen space on mobile */}
      {/* Requirement 4.3: Adapt layout on orientation changes */}
      {/* Requirement 6.1, 6.2: All layer content displayed inline, no separate detail page */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Requirement 5.4: Pass initialExpandedLayerId for state preservation when returning from AR */}
        <LayerExplorer
          geologicalStack={geologicalStack}
          location={location}
          isLoading={isLoading}
          onEnterAR={handleEnterAR}
          isARSupported={isARSupported}
          isARChecking={isARChecking}
          initialExpandedLayerId={lastExpandedLayerId}
        />
      </main>

      <OnlineStatusToast isOffline={isOffline} justCameOnline={justCameOnline} />
    </div>
  );
}

export default Home;
