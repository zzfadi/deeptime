/**
 * LayerExplorer Component
 * Main container that renders a scrollable list of LayerCard components
 * Requirements: 1.1, 1.3, 2.2, 4.3, 4.4
 * 
 * Design: Vertical scrollable list with momentum scrolling
 * Single expansion - only one layer can be expanded at a time
 * Responsive layout adapts to portrait/landscape orientation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GeologicalStack, GeologicalLayer, GeoCoordinate } from 'deep-time-core/types';
import { LayerCard, COLLAPSED_LAYER_HEIGHT } from './LayerCard';
import { hapticController } from '../services/haptics';

// ============================================
// Types
// ============================================

export interface LayerExplorerProps {
  /** The geological stack containing layers to display */
  geologicalStack: GeologicalStack | null;
  /** Current location for AI content generation */
  location: GeoCoordinate | null;
  /** Whether geological data is loading */
  isLoading: boolean;
  /** Callback when AR button is tapped for a layer */
  onEnterAR: (layer: GeologicalLayer) => void;
  /** Whether AR is supported on this device */
  isARSupported?: boolean;
  /** Whether AR support check is still in progress */
  isARChecking?: boolean;
  /** Initial expanded layer ID (for state preservation when returning from AR) */
  initialExpandedLayerId?: string | null;
}

export interface LayerExplorerState {
  /** ID of the currently expanded layer, or null if none */
  expandedLayerId: string | null;
}

// ============================================
// LayerExplorer Component
// ============================================

/**
 * LayerExplorer - Main container for geological layer exploration
 * 
 * Features:
 * - Vertical scrollable list with momentum scrolling
 * - Single expansion invariant (only one layer expanded at a time)
 * - Haptic feedback at era boundaries while scrolling
 * - Empty state handling
 * - Loading state handling
 * - Responsive layout for portrait/landscape orientation
 * 
 * Requirement 1.1: Display geological layers as a vertical scrollable list
 * Requirement 1.3: All layers in collapsed compact state when no layer selected
 * Requirement 2.2: Collapse any previously expanded layer when new one expands
 * Requirement 4.3: Adapt layout smoothly for orientation changes
 * Requirement 4.4: Enable vertical scrolling within expanded layer section
 */
export function LayerExplorer({
  geologicalStack,
  location,
  isLoading,
  onEnterAR,
  isARSupported = false,
  isARChecking = false,
  initialExpandedLayerId = null,
}: LayerExplorerProps) {
  // State: track which layer is expanded (single expansion invariant)
  // Requirement 1.3: Initially no layer is expanded (unless returning from AR)
  // Requirement 5.4: Preserve expanded layer state when returning from AR
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(initialExpandedLayerId);
  
  // Sync expanded layer when initialExpandedLayerId changes (e.g., returning from AR)
  // Requirement 5.4: Return to layer view with same layer expanded
  useEffect(() => {
    if (initialExpandedLayerId !== null) {
      setExpandedLayerId(initialExpandedLayerId);
    }
  }, [initialExpandedLayerId]);
  
  // State: track orientation for responsive layout
  // Requirement 4.3: Handle portrait/landscape orientation
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  
  // Ref for scroll container to track scroll position
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Track last era for haptic feedback at boundaries
  const lastEraRef = useRef<string | null>(null);
  
  // Handle orientation changes
  // Requirement 4.3: Adapt layout smoothly for orientation changes
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    // Also listen for orientation change event (more reliable on mobile)
    const handleOrientationChange = () => {
      // Small delay to let the browser update dimensions
      setTimeout(handleResize, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  /**
   * Handle layer toggle
   * Requirement 2.2: When a layer expands, collapse any previously expanded layer
   */
  const handleLayerToggle = useCallback((layerId: string) => {
    setExpandedLayerId(prevId => {
      // If tapping the same layer, collapse it
      // If tapping a different layer, expand it (and collapse previous)
      return prevId === layerId ? null : layerId;
    });
  }, []);

  /**
   * Handle AR entry for a specific layer
   */
  const handleEnterAR = useCallback((layer: GeologicalLayer) => {
    onEnterAR(layer);
  }, [onEnterAR]);

  /**
   * Handle scroll for haptic feedback at era boundaries
   * Requirement 1.4: Haptic feedback at era boundaries while scrolling
   */
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !geologicalStack?.layers.length) return;

    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    
    // Calculate which layer is currently in the center of the viewport
    // Use the exported constant for consistency
    const centerOffset = scrollTop + containerHeight / 2;
    const layerIndex = Math.floor(centerOffset / COLLAPSED_LAYER_HEIGHT);
    
    if (layerIndex >= 0 && layerIndex < geologicalStack.layers.length) {
      const currentEra = geologicalStack.layers[layerIndex].era.name;
      
      // Trigger haptic when crossing era boundary
      if (lastEraRef.current && lastEraRef.current !== currentEra) {
        hapticController.pulseEraBoundary('light');
      }
      
      lastEraRef.current = currentEra;
    }
  }, [geologicalStack]);

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // ============================================
  // Render States
  // ============================================

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="animate-pulse space-y-4 w-full max-w-md">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-[72px] bg-stone-800/50 rounded-lg"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
        <p className="mt-6 text-stone-400 text-sm">Loading geological layers...</p>
      </div>
    );
  }

  // Empty state - no geological data
  if (!geologicalStack || geologicalStack.layers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <svg
          className="w-16 h-16 text-stone-600 mb-4"
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
        <h3 className="text-lg font-semibold text-stone-300 mb-2">
          No Geological Data
        </h3>
        <p className="text-stone-500 text-sm max-w-xs">
          Search for a location to explore the geological layers beneath your feet.
        </p>
      </div>
    );
  }

  // ============================================
  // Main Render - Layer List
  // ============================================

  return (
    <div
      ref={scrollContainerRef}
      className={`
        flex-1 overflow-y-auto overscroll-contain
        ${isLandscape ? 'landscape-mode' : 'portrait-mode'}
      `}
      style={{
        // Enable momentum scrolling on iOS
        WebkitOverflowScrolling: 'touch',
      }}
      data-testid="layer-explorer"
      data-orientation={isLandscape ? 'landscape' : 'portrait'}
    >
      {/* Layer list */}
      {/* Requirement 1.1: Display geological layers as a vertical scrollable list */}
      {/* Requirement 4.3: Responsive layout for orientation changes */}
      <div 
        className={`
          divide-y divide-stone-800/30
          ${isLandscape ? 'max-w-3xl mx-auto' : 'w-full'}
        `}
      >
        {geologicalStack.layers.map((layer) => (
          <LayerCard
            key={layer.id}
            layer={layer}
            isExpanded={expandedLayerId === layer.id}
            onToggle={() => handleLayerToggle(layer.id)}
            onEnterAR={() => handleEnterAR(layer)}
            location={location}
            isARSupported={isARSupported}
            isARChecking={isARChecking}
          />
        ))}
      </div>

      {/* Bottom padding for safe area - larger in landscape for keyboard */}
      <div className={isLandscape ? 'h-12' : 'h-20'} />
    </div>
  );
}

export default LayerExplorer;
