/**
 * CrossSectionView Component
 * Main container for the 3D cross-section visualization
 * Composes LayerStack and LayerInfoPanel with AI content integration
 * Requirements: 1.4, 2.1, 3.3, 3.4, 4.1, 4.2, 4.3
 */

import { useState, useCallback, useEffect } from 'react';
import type { GeologicalStack, GeologicalLayer, GeoCoordinate, Narrative } from 'deep-time-core/types';
import type { EraContent } from '../services/ai/types';
import { LayerStack } from './LayerStack';
import { LayerInfoPanel } from './LayerInfoPanel';
import { useCrossSectionState } from '../hooks/useCrossSectionState';
import { contentOrchestrator } from '../services/ai/contentOrchestrator';

/**
 * Custom hook to detect orientation changes
 * Requirement 4.3: Adapt layout on orientation changes
 */
function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'portrait';
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  });

  useEffect(() => {
    const handleResize = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setOrientation(newOrientation);
    };

    // Listen for both resize and orientation change events
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return orientation;
}

export interface CrossSectionViewProps {
  /** Geological stack data for the current location */
  geologicalStack: GeologicalStack | null;
  /** Cache of narratives by layer ID */
  narrativeCache: Map<string, Narrative>;
  /** Callback when a layer is selected */
  onLayerSelect?: (layer: GeologicalLayer) => void;
  /** Callback to navigate to full era details */
  onViewDetails: (layer: GeologicalLayer) => void;
  /** Whether geological data is loading */
  isLoading: boolean;
  /** Current location coordinates */
  location: GeoCoordinate | null;
}

/**
 * CrossSectionView Component
 * Orchestrates the 3D layer visualization and info panel
 * Requirement 1.4: Display placeholder when no geological data
 * Requirement 2.1: Smooth scroll/drag animation through layers
 * Requirement 4.1: Fill available screen space on mobile
 * Requirement 4.2: Respond to swipe and tap interactions
 * Requirement 4.3: Adapt layout on orientation changes
 */
export function CrossSectionView({
  geologicalStack,
  narrativeCache,
  onLayerSelect,
  onViewDetails,
  isLoading,
  location,
}: CrossSectionViewProps) {
  // Cross-section state management (scroll, selection, haptics)
  const {
    scrollPosition,
    activeLayer,
    activeLayerId,
    setScrollPosition,
    selectLayer,
  } = useCrossSectionState(geologicalStack);

  // Track orientation for responsive layout
  // Requirement 4.3: Adapt layout on orientation changes
  const orientation = useOrientation();

  // AI content state
  const [aiContent, setAiContent] = useState<EraContent | null>(null);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Get narrative for active layer from cache
  const activeNarrative = activeLayer 
    ? narrativeCache.get(activeLayer.id) ?? null 
    : null;

  const layers = geologicalStack?.layers ?? [];


  /**
   * Handle layer click - select layer and notify parent
   * Requirement 2.2: Select layer on tap/click
   */
  const handleLayerClick = useCallback((layer: GeologicalLayer) => {
    selectLayer(layer);
    onLayerSelect?.(layer);
  }, [selectLayer, onLayerSelect]);

  /**
   * Handle view details navigation
   * Requirement 3.5: Navigate to full EraDetail page
   */
  const handleViewDetails = useCallback(() => {
    if (activeLayer) {
      onViewDetails(activeLayer);
    }
  }, [activeLayer, onViewDetails]);

  /**
   * Load AI content when active layer changes
   * Requirement 3.3, 3.4: Load and display AI content
   */
  useEffect(() => {
    if (!activeLayer || !location) {
      setAiContent(null);
      return;
    }

    let cancelled = false;

    const loadContent = async () => {
      setIsLoadingNarrative(true);
      try {
        const result = await contentOrchestrator.getContent(
          location,
          activeLayer,
          { skipVideo: true, useFallbackOnError: true }
        );
        
        if (!cancelled) {
          setAiContent(result.content);
        }
      } catch (error) {
        console.error('[CrossSectionView] Failed to load AI content:', error);
        if (!cancelled) {
          setAiContent(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingNarrative(false);
        }
      }
    };

    loadContent();

    return () => {
      cancelled = true;
    };
  }, [activeLayer?.id, location]);

  /**
   * Generate AI image for active layer
   * Requirement 3.3: Provide buttons to generate AI image
   * Requirement 3.4: Display image inline within panel
   */
  const handleGenerateImage = useCallback(async () => {
    if (!activeLayer || !location || isImageLoading) return;

    setIsImageLoading(true);
    try {
      const result = await contentOrchestrator.getContent(
        location,
        activeLayer,
        { skipVideo: true, forceRefresh: !aiContent?.image }
      );
      setAiContent(result.content);
    } catch (error) {
      console.error('[CrossSectionView] Image generation failed:', error);
    } finally {
      setIsImageLoading(false);
    }
  }, [activeLayer, location, isImageLoading, aiContent?.image]);

  /**
   * Generate AI video for active layer
   * Requirement 3.3: Provide buttons to generate AI video
   * Requirement 3.4: Display video inline within panel
   */
  const handleGenerateVideo = useCallback(async () => {
    if (!activeLayer || !location || isVideoLoading) return;

    setIsVideoLoading(true);
    try {
      const result = await contentOrchestrator.getContent(
        location,
        activeLayer,
        { forceRefresh: !aiContent?.video }
      );
      setAiContent(result.content);
    } catch (error) {
      console.error('[CrossSectionView] Video generation failed:', error);
    } finally {
      setIsVideoLoading(false);
    }
  }, [activeLayer, location, isVideoLoading, aiContent?.video]);


  // Loading state
  // Requirement 1.4: Display placeholder with appropriate messaging
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="w-12 h-12 border-4 border-white/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-white/60 text-sm">Loading geological data...</p>
      </div>
    );
  }

  // Empty state - no geological data
  // Requirement 1.4: Display placeholder when no geological data
  if (!geologicalStack || layers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-slate-900 to-slate-950 px-6 text-center">
        <div className="w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-white/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Explore a Location
        </h2>
        <p className="text-white/50 text-sm max-w-xs">
          Select a location to see the geological layers beneath your feet and travel through deep time.
        </p>
      </div>
    );
  }

  // Convert enhanced narrative to base Narrative type for panel
  const panelNarrative = aiContent?.narrative ?? activeNarrative;

  // Determine layout based on orientation and screen size
  // Requirement 4.1: Fill available screen space on mobile
  // Requirement 4.3: Adapt layout on orientation changes
  const isLandscapeMobile = orientation === 'landscape' && typeof window !== 'undefined' && window.innerHeight < 500;

  return (
    <div 
      className={`
        relative w-full h-full 
        bg-gradient-to-b from-slate-900 via-slate-950 to-black
        ${isLandscapeMobile ? 'flex flex-row' : ''}
      `}
      role="region"
      aria-label="3D Cross-Section View"
      data-orientation={orientation}
    >
      {/* 3D Layer Stack */}
      {/* Requirement 4.1: Fill available screen space */}
      <div className={isLandscapeMobile ? 'flex-1 h-full' : 'w-full h-full'}>
        <LayerStack
          layers={layers}
          activeLayerId={activeLayerId}
          scrollPosition={scrollPosition}
          onLayerClick={handleLayerClick}
          onScrollChange={setScrollPosition}
        />
      </div>

      {/* Layer Info Panel (overlay) */}
      {/* Mobile portrait: slides from bottom */}
      {/* Mobile landscape: compact side panel */}
      {/* Desktop: side panel */}
      <LayerInfoPanel
        layer={activeLayer}
        narrative={panelNarrative}
        aiContent={aiContent}
        isLoadingNarrative={isLoadingNarrative}
        onGenerateImage={handleGenerateImage}
        onGenerateVideo={handleGenerateVideo}
        onViewDetails={handleViewDetails}
        isImageLoading={isImageLoading}
        isVideoLoading={isVideoLoading}
      />

      {/* Depth indicator overlay */}
      {/* Positioned to avoid overlap with panel in different orientations */}
      {activeLayer && (
        <div 
          className={`
            absolute bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white/80 text-sm
            ${isLandscapeMobile ? 'top-2 left-2' : 'top-4 left-4'}
          `}
        >
          <span className="text-white/50">Depth:</span>{' '}
          <span className="font-mono">{activeLayer.depthStart}m</span>
        </div>
      )}
    </div>
  );
}

/**
 * Checks if AI content has an image
 * Used for property testing - Property 6: AI content display
 */
export function hasAIImage(content: EraContent | null): boolean {
  return content?.image != null;
}

/**
 * Checks if AI content has a video
 * Used for property testing - Property 6: AI content display
 */
export function hasAIVideo(content: EraContent | null): boolean {
  return content?.video != null;
}

export default CrossSectionView;
