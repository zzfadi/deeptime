/**
 * Cross-Section State Management Hook
 * Manages scroll position, layer selection, depth indicator, and haptic feedback
 * Requirements: 2.2, 2.3, 2.4
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GeologicalLayer, GeologicalStack } from 'deep-time-core/types';
import { hapticController, getHapticIntensityForEra } from '../services/haptics';

export interface CrossSectionState {
  /** Normalized scroll position (0-1) */
  scrollPosition: number;
  /** Currently active/selected layer */
  activeLayer: GeologicalLayer | null;
  /** Active layer ID for quick comparison */
  activeLayerId: string | null;
  /** Depth indicator value (meters) */
  depthIndicator: number;
  /** Whether the panel is expanded */
  isPanelExpanded: boolean;
}

export interface CrossSectionActions {
  /** Update scroll position and derive active layer */
  setScrollPosition: (position: number) => void;
  /** Directly select a layer (e.g., on click) */
  selectLayer: (layer: GeologicalLayer) => void;
  /** Toggle panel expansion */
  togglePanel: () => void;
  /** Set panel expansion state */
  setPanelExpanded: (expanded: boolean) => void;
  /** Reset state */
  reset: () => void;
}

export interface UseCrossSectionStateReturn extends CrossSectionState, CrossSectionActions {}

/**
 * Maps scroll position (0-1) to the active layer
 * Requirement 2.2: Select layer based on scroll position
 * 
 * @param scrollPosition - Normalized scroll position (0-1)
 * @param layers - Array of geological layers
 * @returns The active layer or null if no layers
 */
export function getActiveLayerFromScroll(
  scrollPosition: number,
  layers: GeologicalLayer[]
): GeologicalLayer | null {
  if (layers.length === 0) return null;
  
  // Clamp scroll position to valid range
  const clampedPosition = Math.max(0, Math.min(1, scrollPosition));
  
  // Map scroll position to layer index
  const layerIndex = Math.floor(clampedPosition * layers.length);
  
  // Ensure we don't go out of bounds
  const safeIndex = Math.min(layerIndex, layers.length - 1);
  
  return layers[safeIndex];
}

/**
 * Calculates depth indicator value from active layer
 * Requirement 2.3: Display depth indicator showing current position
 * 
 * @param layer - The active geological layer
 * @returns Depth in meters (depthStart of the layer)
 */
export function getDepthIndicator(layer: GeologicalLayer | null): number {
  if (!layer) return 0;
  return layer.depthStart;
}

/**
 * Custom hook for managing cross-section view state
 * Handles scroll position, layer selection, depth indicator, and haptic feedback
 * 
 * @param geologicalStack - The geological stack data
 * @param enableHaptics - Whether to enable haptic feedback (default: true)
 * @returns State and actions for cross-section management
 */
export function useCrossSectionState(
  geologicalStack: GeologicalStack | null,
  enableHaptics: boolean = true
): UseCrossSectionStateReturn {
  const [scrollPosition, setScrollPositionState] = useState(0);
  const [activeLayer, setActiveLayer] = useState<GeologicalLayer | null>(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  
  // Track previous layer for haptic feedback at era boundaries
  const previousLayerRef = useRef<GeologicalLayer | null>(null);
  
  const layers = geologicalStack?.layers ?? [];
  
  // Derive active layer ID and depth indicator
  const activeLayerId = activeLayer?.id ?? null;
  const depthIndicator = getDepthIndicator(activeLayer);
  
  /**
   * Update scroll position and derive active layer
   * Requirement 2.2: Select layer based on scroll position
   * Requirement 2.4: Provide haptic feedback at era boundaries
   */
  const setScrollPosition = useCallback((position: number) => {
    const clampedPosition = Math.max(0, Math.min(1, position));
    setScrollPositionState(clampedPosition);
    
    const newActiveLayer = getActiveLayerFromScroll(clampedPosition, layers);
    
    // Check if we crossed an era boundary for haptic feedback
    // Requirement 2.4: Haptic feedback at era boundaries
    if (
      enableHaptics &&
      newActiveLayer &&
      previousLayerRef.current &&
      newActiveLayer.id !== previousLayerRef.current.id
    ) {
      const intensity = getHapticIntensityForEra(newActiveLayer.era.name);
      hapticController.pulseEraBoundary(intensity);
    }
    
    previousLayerRef.current = newActiveLayer;
    setActiveLayer(newActiveLayer);
  }, [layers, enableHaptics]);
  
  /**
   * Directly select a layer (e.g., on click)
   * Requirement 2.2: Select layer on tap/click
   */
  const selectLayer = useCallback((layer: GeologicalLayer) => {
    // Calculate scroll position for this layer
    const layerIndex = layers.findIndex(l => l.id === layer.id);
    if (layerIndex >= 0) {
      const newScrollPosition = layers.length > 1 
        ? layerIndex / (layers.length - 1)
        : 0;
      setScrollPositionState(newScrollPosition);
    }
    
    // Trigger haptic feedback for selection
    // Requirement 2.4: Haptic feedback on selection
    if (enableHaptics && layer.id !== activeLayerId) {
      const intensity = getHapticIntensityForEra(layer.era.name);
      hapticController.pulseEraBoundary(intensity);
    }
    
    previousLayerRef.current = layer;
    setActiveLayer(layer);
    setIsPanelExpanded(true); // Expand panel when layer is selected
  }, [layers, activeLayerId, enableHaptics]);
  
  /**
   * Toggle panel expansion
   */
  const togglePanel = useCallback(() => {
    setIsPanelExpanded(prev => !prev);
  }, []);
  
  /**
   * Set panel expansion state
   */
  const setPanelExpanded = useCallback((expanded: boolean) => {
    setIsPanelExpanded(expanded);
  }, []);
  
  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setScrollPositionState(0);
    setActiveLayer(null);
    setIsPanelExpanded(true);
    previousLayerRef.current = null;
  }, []);
  
  // Initialize active layer when geological stack changes
  useEffect(() => {
    if (layers.length > 0 && !activeLayer) {
      const initialLayer = getActiveLayerFromScroll(0, layers);
      setActiveLayer(initialLayer);
      previousLayerRef.current = initialLayer;
    } else if (layers.length === 0) {
      setActiveLayer(null);
      previousLayerRef.current = null;
    }
  }, [layers, activeLayer]);
  
  return {
    // State
    scrollPosition,
    activeLayer,
    activeLayerId,
    depthIndicator,
    isPanelExpanded,
    // Actions
    setScrollPosition,
    selectLayer,
    togglePanel,
    setPanelExpanded,
    reset,
  };
}

export default useCrossSectionState;
