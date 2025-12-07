/**
 * LayerStack Component
 * Renders the 3D stack of geological layers using CSS 3D transforms
 * Requirements: 1.1, 2.1, 2.2 - Display and interact with geological layers
 */

import { useRef, useCallback, useMemo, useEffect } from 'react';
import type { GeologicalLayer } from 'deep-time-core/types';
import { LayerStratum } from './LayerStratum';

export interface LayerStackProps {
  layers: GeologicalLayer[];
  activeLayerId: string | null;
  scrollPosition: number; // 0-1 normalized
  onLayerClick: (layer: GeologicalLayer) => void;
  onScrollChange?: (position: number) => void;
}

/**
 * Maps scroll position (0-1) to the active layer
 * Requirement 2.2: Select layer based on scroll position
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
 * Calculate depth offset for parallax effect
 */
function calculateParallaxOffset(
  layerIndex: number,
  totalLayers: number,
  scrollPosition: number
): number {
  // Base spacing between layers
  const baseSpacing = 80;
  
  // Calculate the scroll offset - layers move up as user scrolls
  const scrollOffset = scrollPosition * totalLayers * baseSpacing * 0.8;
  
  // Each layer has a base position plus parallax effect
  const basePosition = layerIndex * baseSpacing;
  
  // Parallax factor - deeper layers move slower
  const parallaxFactor = 1 - (layerIndex / totalLayers) * 0.3;
  
  return basePosition - (scrollOffset * parallaxFactor);
}

/**
 * LayerStack Component
 * Renders all geological layers in a 3D perspective view
 */
export function LayerStack({
  layers,
  activeLayerId,
  scrollPosition,
  onLayerClick,
  onScrollChange,
}: LayerStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastY = useRef(0);

  // Handle touch/mouse drag for scrolling
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    lastY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !onScrollChange) return;
    
    const deltaY = lastY.current - e.clientY;
    lastY.current = e.clientY;
    
    // Convert pixel movement to scroll position change
    // Negative delta = scrolling down = increasing position
    const sensitivity = 0.002;
    const newPosition = Math.max(0, Math.min(1, scrollPosition + deltaY * sensitivity));
    
    onScrollChange(newPosition);
  }, [scrollPosition, onScrollChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Handle wheel scroll - use native event listener to properly prevent default
  // React's synthetic events use passive listeners by default for wheel events
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onScrollChange) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const sensitivity = 0.001;
      const newPosition = Math.max(0, Math.min(1, scrollPosition + e.deltaY * sensitivity));
      
      onScrollChange(newPosition);
    };

    // Add non-passive listener to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [scrollPosition, onScrollChange]);

  // Memoize layer depth calculations
  const layerDepths = useMemo(() => {
    return layers.map((_, index) => 
      calculateParallaxOffset(index, layers.length, scrollPosition)
    );
  }, [layers.length, scrollPosition]);

  if (layers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/50">
        <p>No geological layers available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      style={{
        perspective: '1000px',
        perspectiveOrigin: '50% 30%',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="listbox"
      aria-label="Geological layers"
      aria-activedescendant={activeLayerId || undefined}
    >
      {/* 3D container for layers */}
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(15deg)',
        }}
      >
        {/* Render layers from bottom to top for proper z-ordering */}
        {[...layers].reverse().map((layer, reversedIndex) => {
          const originalIndex = layers.length - 1 - reversedIndex;
          const isActive = layer.id === activeLayerId;
          const depth = layerDepths[originalIndex];

          return (
            <div
              key={layer.id}
              id={layer.id}
              role="option"
              aria-selected={isActive}
              className="absolute left-4 right-4"
              style={{
                top: '50%',
                transform: `translateY(${depth}px)`,
                zIndex: originalIndex,
              }}
            >
              <LayerStratum
                layer={layer}
                index={originalIndex}
                totalLayers={layers.length}
                isActive={isActive}
                depth={0}
                onClick={() => onLayerClick(layer)}
              />
            </div>
          );
        })}
      </div>

      {/* Depth scale indicator */}
      <div className="absolute left-2 top-1/4 bottom-1/4 w-1 bg-white/10 rounded-full">
        <div
          className="absolute left-0 right-0 h-4 bg-white/50 rounded-full transition-all duration-200"
          style={{
            top: `${scrollPosition * 100}%`,
            transform: 'translateY(-50%)',
          }}
        />
      </div>

      {/* Scroll hint */}
      {scrollPosition < 0.1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-sm animate-bounce">
          ↓ Scroll to explore deeper
        </div>
      )}
    </div>
  );
}

export default LayerStack;
