/**
 * Home Page Component
 * Main view with crossfading era cards during slider navigation
 * Requirements: 1.1, 1.2, 3.1, 5.3
 */

import { useEffect, useCallback, useState, useMemo } from 'react';
import { useAppStore, getEraBoundaries } from '../store/appStore';
import { LocationHeader, TimeSlider, EraCard, FullPageSpinner, OnlineStatusToast } from '../components';
import type { TransitionState } from '../components/TimeSlider';
import { GPSDeniedView, APIErrorView, OfflineView } from './ErrorViews';
import { useOfflineStatus } from '../hooks';
import type { GeoCoordinate, GeologicalLayer, Narrative } from 'deep-time-core/types';

export interface HomeProps {
  onViewEraDetail?: () => void;
}

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
    narrativeCache,
  } = useAppStore();

  const { isOffline, justCameOnline } = useOfflineStatus();
  const [transition, setTransition] = useState<TransitionState | null>(null);

  useEffect(() => {
    setOfflineStatus(isOffline);
  }, [isOffline, setOfflineStatus]);

  useEffect(() => {
    loadCachedLocations();
  }, [loadCachedLocations]);

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

  const handleTransitionChange = useCallback((state: TransitionState) => {
    setTransition(state);
  }, []);

  const eraBoundaries = getEraBoundaries(geologicalStack);

  // Get current and next era layers for crossfading
  const currentEraLayer = useMemo((): GeologicalLayer | null => {
    if (!transition?.currentEra || !geologicalStack) return currentEra;
    return geologicalStack.layers.find(l => l.id === transition.currentEra?.layerId) || currentEra;
  }, [transition?.currentEra, geologicalStack, currentEra]);

  const nextEraLayer = useMemo((): GeologicalLayer | null => {
    if (!transition?.isDragging || !transition?.nextEra || !geologicalStack) return null;
    return geologicalStack.layers.find(l => l.id === transition.nextEra?.layerId) || null;
  }, [transition?.isDragging, transition?.nextEra, geologicalStack]);

  // Get cached narratives for both eras
  const currentNarrative = useMemo((): Narrative | null => {
    if (!currentEraLayer) return narrative;
    return narrativeCache.get(currentEraLayer.id) || narrative;
  }, [currentEraLayer, narrativeCache, narrative]);

  const nextNarrative = useMemo((): Narrative | null => {
    if (!nextEraLayer) return null;
    return narrativeCache.get(nextEraLayer.id) || null;
  }, [nextEraLayer, narrativeCache]);

  const isGPSDenied = locationError?.includes('denied') ||
    locationError?.includes('permission') ||
    locationError?.includes('blocked');

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

  // Calculate opacity for crossfade between consecutive eras
  const showCrossfade = transition?.isDragging && nextEraLayer && transition.progress > 0;
  const currentOpacity = showCrossfade ? 1 - transition.progress : 1;
  const nextOpacity = showCrossfade ? transition.progress : 0;

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

      <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        {geologicalStack && eraBoundaries.length > 0 && (
          <div className="h-64 md:h-auto md:w-48 flex-shrink-0">
            <TimeSlider
              value={timePosition}
              onChange={setTimePosition}
              eraBoundaries={eraBoundaries}
              snapToEra={true}
              onTransitionChange={handleTransitionChange}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Era Cards with crossfade during drag */}
          <div
            onClick={onViewEraDetail}
            className={`relative ${onViewEraDetail ? 'cursor-pointer' : ''}`}
          >
            {/* Current era - always visible, fades out when transitioning to next */}
            <div
              className="transition-opacity duration-150"
              style={{ opacity: currentOpacity }}
            >
              <EraCard
                era={currentEraLayer}
                narrative={currentNarrative}
                isLoading={isNarrativeLoading}
                webXRSupported={false}
              />
            </div>

            {/* Next era - overlaid on top, fades in during transition */}
            {showCrossfade && (
              <div
                className="absolute inset-0 transition-opacity duration-150 pointer-events-none"
                style={{ opacity: nextOpacity }}
              >
                <EraCard
                  era={nextEraLayer}
                  narrative={nextNarrative}
                  isLoading={false}
                  webXRSupported={false}
                />
              </div>
            )}
          </div>

          {/* Geological Stack */}
          {geologicalStack && (
            <GeologicalStackView
              layers={geologicalStack.layers}
              currentEraId={currentEra?.id}
              onLayerClick={(layer) => setTimePosition(layer.era.yearsAgo)}
            />
          )}
        </div>
      </main>

      <footer className="px-4 py-2 text-center text-xs text-gray-500 safe-bottom">
        DeepTime • Explore geological time beneath your feet
      </footer>

      <OnlineStatusToast isOffline={isOffline} justCameOnline={justCameOnline} />
    </div>
  );
}


/** Redesigned Geological Stack View */
interface GeologicalStackViewProps {
  layers: GeologicalLayer[];
  currentEraId?: string;
  onLayerClick: (layer: GeologicalLayer) => void;
}

function GeologicalStackView({ layers, currentEraId, onLayerClick }: GeologicalStackViewProps) {
  const sortedLayers = [...layers].sort((a, b) => a.depthStart - b.depthStart);
  const displayLayers = sortedLayers.slice(0, 6);

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #12151a 0%, #0d0f12 100%)' }}>
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          Geological Column
        </h3>
      </div>

      <div className="p-2">
        {displayLayers.map((layer, index) => {
          const isActive = currentEraId === layer.id;
          const depth = layer.era.yearsAgo;
          const hue = 120 - (index / displayLayers.length) * 80; // Green to amber

          return (
            <button
              key={layer.id}
              onClick={() => onLayerClick(layer)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg mb-1 transition-all duration-200 text-left ${
                isActive ? 'ring-1 ring-white/20' : 'hover:bg-white/5'
              }`}
              style={{
                background: isActive
                  ? `linear-gradient(90deg, hsla(${hue}, 40%, 25%, 0.4), transparent)`
                  : 'transparent',
              }}
            >
              {/* Stratum indicator */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue}, 35%, 30%), hsl(${hue}, 30%, 20%))`,
                  boxShadow: isActive ? `0 0 12px hsla(${hue}, 50%, 40%, 0.4)` : 'none',
                }}
              >
                <span className="text-white/80 font-medium">{index + 1}</span>
              </div>

              {/* Era info */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/70'}`}>
                  {layer.era.name}
                </div>
                <div className="text-xs text-white/40 flex items-center gap-2">
                  <span>{layer.depthStart}m – {layer.depthEnd}m</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="capitalize">{layer.material}</span>
                </div>
              </div>

              {/* Time badge */}
              <div
                className="px-2 py-1 rounded text-[10px] font-medium"
                style={{
                  background: isActive ? `hsla(${hue}, 40%, 30%, 0.5)` : 'rgba(255,255,255,0.05)',
                  color: isActive ? `hsl(${hue}, 60%, 70%)` : 'rgba(255,255,255,0.4)',
                }}
              >
                {depth >= 1_000_000
                  ? `${(depth / 1_000_000).toFixed(0)}M`
                  : depth >= 1_000
                    ? `${(depth / 1_000).toFixed(0)}K`
                    : depth} ya
              </div>
            </button>
          );
        })}

        {layers.length > 6 && (
          <div className="text-center py-2">
            <span className="text-xs text-white/30">+{layers.length - 6} deeper layers</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
