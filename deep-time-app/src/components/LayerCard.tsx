/**
 * LayerCard Component
 * Expandable geological layer card with collapsed/expanded states
 * Requirements: 1.2, 2.1, 2.3, 2.4, 2.5, 4.1, 4.3, 4.4
 * 
 * Design: "Sedimentary Storytelling" - layers feel like actual rock strata
 * with textures, colors, and fossils emerging when tapped.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GeologicalLayer, GeoCoordinate, Narrative } from 'deep-time-core/types';
import type { GeneratedImage, GeneratedVideo } from '../services/ai/types';
import { formatYearsAgo } from './TimeSlider';
import { contentOrchestrator } from '../services/ai/contentOrchestrator';
import { cacheManager } from '../services/ai/cacheManager';

// ============================================
// Touch Target Constants (Requirement 4.1)
// ============================================

/** Minimum touch target height per WCAG/Apple HIG guidelines */
export const MIN_TOUCH_TARGET_HEIGHT = 44;

/** Collapsed layer card height - exceeds minimum for comfortable touch */
export const COLLAPSED_LAYER_HEIGHT = 72;

// ============================================
// Types
// ============================================

export interface LayerCardProps {
  /** The geological layer data */
  layer: GeologicalLayer;
  /** Whether this card is currently expanded */
  isExpanded: boolean;
  /** Callback when card is tapped to toggle expansion */
  onToggle: () => void;
  /** Callback when AR button is tapped */
  onEnterAR: () => void;
  /** Current location for AI content generation */
  location: GeoCoordinate | null;
  /** Whether AR is supported on this device */
  isARSupported?: boolean;
  /** Whether AR support check is still in progress */
  isARChecking?: boolean;
}

export interface LayerCardState {
  narrative: Narrative | null;
  isLoadingNarrative: boolean;
  image: GeneratedImage | null;
  isLoadingImage: boolean;
  video: GeneratedVideo | null;
  isLoadingVideo: boolean;
  error: string | null;
}

// ============================================
// Era Color Palette (from design.md)
// ============================================

const ERA_COLORS: Record<string, string> = {
  quaternary: '#8B7355',
  neogene: '#C4A35A',
  paleogene: '#7D8471',
  cretaceous: '#5B8A72',
  jurassic: '#4A6741',
  triassic: '#8B4513',
  permian: '#CD853F',
  carboniferous: '#2F4F4F',
  devonian: '#708090',
  silurian: '#5F9EA0',
  ordovician: '#4682B4',
  cambrian: '#6B8E23',
  precambrian: '#483D8B',
  holocene: '#4a5d23',
  pleistocene: '#5c7080',
  pliocene: '#8b7355',
  miocene: '#9c8b7a',
  oligocene: '#a67b5b',
  eocene: '#b8860b',
  paleocene: '#cd853f',
  archean: '#4a0000',
  hadean: '#1a0000',
  proterozoic: '#800000',
};

/**
 * Get era color from era name
 * Requirement 1.2: Color-coded indicator for each layer
 */
export function getEraColor(eraName: string): string {
  const normalized = eraName.toLowerCase().trim();
  
  // Sort by length descending to match longer names first
  const sortedKeys = Object.keys(ERA_COLORS).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    if (normalized.includes(key)) {
      return ERA_COLORS[key];
    }
  }
  
  return '#6b5b4f'; // Default earth tone
}


// ============================================
// Helper Components for Media Display
// ============================================

/**
 * GeneratedImageDisplay - Displays AI-generated image with proper URL cleanup
 * Requirement 3.3: Display generated image inline below description
 */
function GeneratedImageDisplay({ 
  image, 
  eraName 
}: { 
  image: GeneratedImage | null; 
  eraName: string;
}) {
  // Use ref to track the blob URL so we can clean it up properly
  const blobUrlRef = useRef<string | null>(null);
  
  // Create blob URL when image changes
  if (image?.imageData && !blobUrlRef.current) {
    blobUrlRef.current = URL.createObjectURL(image.imageData);
  }
  
  // Cleanup on unmount or when image changes
  useEffect(() => {
    const currentBlobUrl = blobUrlRef.current;
    
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        blobUrlRef.current = null;
      }
    };
  }, [image?.imageData]);

  if (!image || !blobUrlRef.current) return null;

  return (
    <div className="rounded-lg overflow-hidden">
      <img
        src={blobUrlRef.current}
        alt={`AI visualization of ${eraName}`}
        className="w-full h-auto"
        loading="lazy"
      />
    </div>
  );
}

/**
 * GeneratedVideoDisplay - Displays AI-generated video with proper URL cleanup
 * Requirement 3.5: Display generated video inline below image
 */
function GeneratedVideoDisplay({ video }: { video: GeneratedVideo | null }) {
  // Use ref to track the blob URL so we can clean it up properly
  const blobUrlRef = useRef<string | null>(null);
  
  // Create blob URL when video changes
  if (video?.videoData && !blobUrlRef.current) {
    blobUrlRef.current = URL.createObjectURL(video.videoData);
  }
  
  // Cleanup on unmount or when video changes
  useEffect(() => {
    const currentBlobUrl = blobUrlRef.current;
    
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        blobUrlRef.current = null;
      }
    };
  }, [video?.videoData]);

  if (!video || !blobUrlRef.current) return null;

  return (
    <div className="rounded-lg overflow-hidden">
      <video
        src={blobUrlRef.current}
        controls
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-auto"
      />
    </div>
  );
}

// ============================================
// LayerCard Component
// ============================================

/**
 * LayerCard - Expandable geological layer card
 * 
 * Collapsed state (72px height):
 * - Era color bar on left edge
 * - Era name in Playfair Display typography
 * - Time period in muted text
 * - Chevron indicator on right
 * - Subtle rock texture overlay
 * 
 * Expanded state:
 * - Smooth height animation (300ms ease-out)
 * - Full narrative text
 * - Climate/flora/fauna tags
 * - "Generate Image" and "Enter AR" buttons
 * - Generated content appears inline
 */
export function LayerCard({
  layer,
  isExpanded,
  onToggle,
  onEnterAR,
  location,
  isARSupported = false,
  isARChecking = false,
}: LayerCardProps) {
  const [state, setState] = useState<LayerCardState>({
    narrative: null,
    isLoadingNarrative: false,
    image: null,
    isLoadingImage: false,
    video: null,
    isLoadingVideo: false,
    error: null,
  });

  const eraColor = getEraColor(layer.era.name);

  // Load narrative when expanded
  // Requirement 3.1: Display cached narrative immediately if available
  // Requirement 3.2: Fetch with loading indicator if no cache
  // Property 5: Cache-first narrative loading
  useEffect(() => {
    if (!isExpanded || !location) return;
    
    // Skip if we already have narrative loaded
    if (state.narrative) return;
    
    let cancelled = false;

    async function loadNarrative() {
      // Check cache first - this is synchronous-ish (IndexedDB is fast)
      // Requirement 3.1: Display cached narrative immediately if available
      const cached = await cacheManager.getContent(location!, layer);
      
      if (cached && cacheManager.isValid(cached.metadata)) {
        // Cache HIT - display immediately WITHOUT loading state
        // This is the key cache-first behavior
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            narrative: cached.content.narrative,
            image: cached.content.image,
            video: cached.content.video,
            isLoadingNarrative: false,
            error: null,
          }));
        }
        return;
      }

      // Cache MISS - show loading indicator and fetch from API
      // Requirement 3.2: Fetch with loading indicator if no cache
      if (!cancelled) {
        setState(prev => ({ ...prev, isLoadingNarrative: true, error: null }));
      }

      try {
        const result = await contentOrchestrator.getContent(location!, layer, {
          skipImage: true,
          skipVideo: true,
          useFallbackOnError: true,
        });

        if (!cancelled) {
          setState(prev => ({
            ...prev,
            narrative: result.content.narrative,
            isLoadingNarrative: false,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            isLoadingNarrative: false,
            error: error instanceof Error ? error.message : 'Failed to load narrative',
          }));
        }
      }
    }

    loadNarrative();

    return () => {
      cancelled = true;
    };
  }, [isExpanded, location, layer, state.narrative]);

  // Handle image generation
  // Requirement 3.3: Generate and display AI image on button tap
  const handleGenerateImage = useCallback(async () => {
    if (!location || state.isLoadingImage) return;

    setState(prev => ({ ...prev, isLoadingImage: true, error: null }));

    try {
      // Force refresh to bypass cache and generate new image
      // User explicitly requested image generation
      const result = await contentOrchestrator.getContent(location, layer, {
        skipVideo: true,
        useFallbackOnError: true,
        forceRefresh: true,
      });

      setState(prev => ({
        ...prev,
        image: result.content.image,
        isLoadingImage: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoadingImage: false,
        error: error instanceof Error ? error.message : 'Failed to generate image',
      }));
    }
  }, [location, layer, state.isLoadingImage]);

  // Handle video generation
  // Requirement 3.4, 3.5: Generate video after image is available
  const handleGenerateVideo = useCallback(async () => {
    if (!location || state.isLoadingVideo || !state.image) return;

    setState(prev => ({ ...prev, isLoadingVideo: true, error: null }));

    try {
      // Force refresh to bypass cache and generate new video
      // User explicitly requested video generation
      const result = await contentOrchestrator.getContent(location, layer, {
        useFallbackOnError: true,
        forceRefresh: true,
      });

      setState(prev => ({
        ...prev,
        video: result.content.video,
        isLoadingVideo: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoadingVideo: false,
        error: error instanceof Error ? error.message : 'Failed to generate video',
      }));
    }
  }, [location, layer, state.isLoadingVideo, state.image]);

  // Handle retry on error
  // Requirement 3.6: Retry button for failed operations
  const handleRetry = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    // Re-trigger narrative load by toggling expansion
    if (isExpanded && location) {
      setState(prev => ({ ...prev, isLoadingNarrative: true }));
      contentOrchestrator.getContent(location, layer, {
        skipImage: true,
        skipVideo: true,
        useFallbackOnError: true,
      }).then(result => {
        setState(prev => ({
          ...prev,
          narrative: result.content.narrative,
          isLoadingNarrative: false,
        }));
      }).catch(error => {
        setState(prev => ({
          ...prev,
          isLoadingNarrative: false,
          error: error instanceof Error ? error.message : 'Failed to load narrative',
        }));
      });
    }
  }, [isExpanded, location, layer]);

  return (
    <div
      className={`
        relative overflow-hidden transition-all duration-300 ease-out
        bg-stone-900/80 backdrop-blur-sm
        border-b border-stone-800/50
      `}
      style={{
        minHeight: isExpanded ? 'auto' : `${COLLAPSED_LAYER_HEIGHT}px`,
      }}
      data-testid="layer-card"
      data-expanded={isExpanded}
    >
      {/* Era color bar - left edge indicator */}
      {/* Requirement 1.2: Color-coded indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: eraColor }}
      />

      {/* Rock texture overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Collapsed state - clickable header */}
      {/* Requirement 4.1: Minimum 44px touch target (72px height exceeds minimum) */}
      <button
        onClick={onToggle}
        className={`
          relative w-full text-left px-4 py-4 pl-5
          flex items-center justify-between
          focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-inset
          transition-colors hover:bg-stone-800/30
          touch-manipulation
        `}
        style={{ minHeight: `${COLLAPSED_LAYER_HEIGHT}px` }}
        aria-expanded={isExpanded}
        aria-label={`${layer.era.name}, ${formatYearsAgo(layer.era.yearsAgo)} years ago. Tap to ${isExpanded ? 'collapse' : 'expand'}`}
        data-testid="layer-card-toggle"
      >
        <div className="flex-1 min-w-0">
          {/* Era name - Playfair Display typography */}
          <h3
            className="text-lg font-semibold text-white truncate"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {layer.era.name}
          </h3>
          {/* Time period - muted text */}
          <p className="text-sm text-stone-400 font-mono">
            {formatYearsAgo(layer.era.yearsAgo)} years ago
          </p>
        </div>

        {/* Chevron indicator */}
        <svg
          className={`
            w-5 h-5 text-stone-500 transition-transform duration-300
            ${isExpanded ? 'rotate-180' : 'rotate-0'}
          `}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {/* Requirement 2.1, 2.3, 2.4: Expanded state with narrative, tags, buttons */}
      {/* Requirement 4.3, 4.4: Responsive layout with proper scrolling */}
      {isExpanded && (
        <div 
          className="px-4 pb-4 pl-5 space-y-4 animate-fadeIn overflow-y-auto"
          style={{
            // Requirement 4.4: Enable vertical scrolling within expanded layer section
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          }}
          data-testid="layer-card-expanded-content"
        >
          {/* Narrative section */}
          {state.isLoadingNarrative ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-stone-700/50 rounded w-full" />
              <div className="h-4 bg-stone-700/50 rounded w-5/6" />
              <div className="h-4 bg-stone-700/50 rounded w-4/6" />
            </div>
          ) : state.narrative ? (
            <div className="space-y-3">
              {/* Short description */}
              <p className="text-stone-300 leading-relaxed">
                {state.narrative.shortDescription}
              </p>

              {/* Climate/Flora/Fauna tags */}
              {/* Requirement 2.3: Display climate/flora/fauna tags */}
              <div className="flex flex-wrap gap-2">
                {state.narrative.climate && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-900/30 text-blue-300">
                    🌡️ {state.narrative.climate.temperature}
                  </span>
                )}
                {state.narrative.flora?.slice(0, 2).map((plant, i) => (
                  <span key={`flora-${i}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900/30 text-green-300">
                    🌿 {plant}
                  </span>
                ))}
                {state.narrative.fauna?.slice(0, 2).map((animal, i) => (
                  <span key={`fauna-${i}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-900/30 text-amber-300">
                    🦎 {animal}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Error state with retry */}
          {/* Requirement 3.6: Error message with retry button */}
          {/* Requirement 4.1: Adequate touch target for retry button */}
          {state.error && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-900/20 border border-red-800/30">
              <p className="text-sm text-red-300 flex-1">{state.error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-sm font-medium text-red-300 hover:text-red-200 hover:bg-red-800/30 rounded transition-colors touch-manipulation active:scale-[0.98]"
                style={{ minHeight: `${MIN_TOUCH_TARGET_HEIGHT}px` }}
                data-testid="retry-button"
              >
                Retry
              </button>
            </div>
          )}

          {/* Generated image display */}
          {/* Requirement 3.3: Display generated image inline below description */}
          <GeneratedImageDisplay image={state.image} eraName={layer.era.name} />

          {/* Generated video display */}
          {/* Requirement 3.5: Display generated video inline below image */}
          <GeneratedVideoDisplay video={state.video} />

          {/* Action buttons */}
          {/* Requirement 2.4: Generate Image and Enter AR buttons */}
          {/* Requirement 4.1: Adequate touch targets (minimum 44px) */}
          {/* Requirement 4.3: Responsive layout - stack buttons in portrait, row in landscape */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Generate Image button */}
            {!state.image && (
              <button
                onClick={handleGenerateImage}
                disabled={state.isLoadingImage || !location}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3
                  rounded-lg font-medium text-sm transition-all
                  touch-manipulation active:scale-[0.98]
                  ${state.isLoadingImage
                    ? 'bg-stone-700/50 text-stone-400 cursor-wait'
                    : 'bg-amber-600/80 hover:bg-amber-600 text-white active:bg-amber-700'
                  }
                `}
                style={{ minHeight: `${MIN_TOUCH_TARGET_HEIGHT}px` }}
                data-testid="generate-image-button"
              >
                {state.isLoadingImage ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Generate Image
                  </>
                )}
              </button>
            )}

            {/* Generate Video button - only shows after image */}
            {/* Requirement 3.4: Show video button after image is generated */}
            {state.image && !state.video && (
              <button
                onClick={handleGenerateVideo}
                disabled={state.isLoadingVideo || !location}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3
                  rounded-lg font-medium text-sm transition-all
                  touch-manipulation active:scale-[0.98]
                  ${state.isLoadingVideo
                    ? 'bg-stone-700/50 text-stone-400 cursor-wait'
                    : 'bg-purple-600/80 hover:bg-purple-600 text-white active:bg-purple-700'
                  }
                `}
                style={{ minHeight: `${MIN_TOUCH_TARGET_HEIGHT}px` }}
                data-testid="generate-video-button"
              >
                {state.isLoadingVideo ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Generate Video
                  </>
                )}
              </button>
            )}

            {/* Enter AR button */}
            {/* Requirement 2.4, 5.1, 5.2: Enter AR button with support detection */}
            {/* Property 9: AR button state - disabled when not supported, enabled when supported */}
            <div className="relative group">
              <button
                onClick={onEnterAR}
                disabled={!isARSupported || isARChecking}
                className={`
                  flex items-center justify-center gap-2 px-4 py-3
                  rounded-lg font-medium text-sm transition-all
                  touch-manipulation
                  ${isARSupported && !isARChecking
                    ? 'bg-teal-600/80 hover:bg-teal-600 text-white active:bg-teal-700 active:scale-[0.98]'
                    : 'bg-stone-700/50 text-stone-500 cursor-not-allowed'
                  }
                `}
                style={{ minHeight: `${MIN_TOUCH_TARGET_HEIGHT}px` }}
                aria-label={
                  isARChecking
                    ? 'Checking AR support...'
                    : isARSupported
                      ? `Enter AR mode for ${layer.era.name}`
                      : 'AR not supported on this device'
                }
                data-testid="enter-ar-button"
                data-ar-supported={isARSupported}
              >
                {isARChecking ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Checking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Enter AR
                  </>
                )}
              </button>
              {/* Tooltip explaining why AR is unavailable */}
              {/* Requirement 5.2: Tooltip explaining why AR is unavailable */}
              {!isARSupported && !isARChecking && (
                <div 
                  className="
                    absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                    px-3 py-2 rounded-lg bg-stone-800 text-stone-300 text-xs
                    whitespace-nowrap opacity-0 group-hover:opacity-100
                    transition-opacity duration-200 pointer-events-none
                    shadow-lg border border-stone-700/50
                  "
                  role="tooltip"
                  data-testid="ar-tooltip"
                >
                  AR requires a compatible device with camera access
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-stone-800" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Depth info footer */}
          <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-800/50">
            <span>Depth: {layer.depthStart}m – {layer.depthEnd}m</span>
            <span className="capitalize">{layer.material}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LayerCard;
