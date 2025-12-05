/**
 * TimeSlider Component
 * Vertical slider for navigating through geological time periods
 * Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { hapticController, getHapticIntensityForEra } from '../services/haptics';

export interface EraBoundary {
  yearsAgo: number;
  eraName: string;
  layerId: string;
}

export interface TimeSliderProps {
  /** Current time position in years ago */
  value: number;
  /** Callback when slider value changes */
  onChange: (yearsAgo: number) => void;
  /** Era boundaries for markers and snapping */
  eraBoundaries: EraBoundary[];
  /** Minimum years ago (most recent) */
  minYearsAgo?: number;
  /** Maximum years ago (oldest) */
  maxYearsAgo?: number;
  /** Whether to snap to era boundaries on release */
  snapToEra?: boolean;
  /** Callback when an era marker is tapped */
  onEraSelect?: (boundary: EraBoundary) => void;
  /** Whether haptic feedback is enabled - Requirements: 5.1, 5.2, 5.3 */
  enableHaptics?: boolean;
  /** Callback when era boundary is crossed - Requirements: 5.1 */
  onEraBoundaryCrossed?: (previousEra: EraBoundary | null, newEra: EraBoundary) => void;
}

/**
 * Formats years ago into human-readable string
 */
export function formatYearsAgo(yearsAgo: number): string {
  if (yearsAgo >= 1_000_000_000) {
    return `${(yearsAgo / 1_000_000_000).toFixed(1)}B`;
  }
  if (yearsAgo >= 1_000_000) {
    return `${(yearsAgo / 1_000_000).toFixed(0)}M`;
  }
  if (yearsAgo >= 1_000) {
    return `${(yearsAgo / 1_000).toFixed(0)}K`;
  }
  return yearsAgo.toString();
}


/**
 * Maps a yearsAgo value to the corresponding era
 * Requirement 3.2: Update displayed era based on slider position
 * 
 * @param yearsAgo - The time position in years ago
 * @param eraBoundaries - Array of era boundaries sorted by yearsAgo
 * @returns The era boundary that contains this time position
 */
export function mapTimeToEra(
  yearsAgo: number,
  eraBoundaries: EraBoundary[]
): EraBoundary | null {
  if (eraBoundaries.length === 0) {
    return null;
  }

  // Sort boundaries by yearsAgo (ascending - most recent first)
  const sorted = [...eraBoundaries].sort((a, b) => a.yearsAgo - b.yearsAgo);

  // Find the era that contains this time position
  // An era "contains" a time if the time is >= the era's yearsAgo
  // and < the next era's yearsAgo (or if it's the last era)
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (yearsAgo >= sorted[i].yearsAgo) {
      return sorted[i];
    }
  }

  // If yearsAgo is less than all boundaries, return the most recent era
  return sorted[0];
}

/**
 * Finds the nearest era boundary to snap to
 */
function findNearestEraBoundary(
  yearsAgo: number,
  eraBoundaries: EraBoundary[]
): EraBoundary | null {
  if (eraBoundaries.length === 0) {
    return null;
  }

  let nearest = eraBoundaries[0];
  let minDistance = Math.abs(yearsAgo - nearest.yearsAgo);

  for (const boundary of eraBoundaries) {
    const distance = Math.abs(yearsAgo - boundary.yearsAgo);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = boundary;
    }
  }

  return nearest;
}

/**
 * Converts a yearsAgo value to a percentage position on the slider
 * Uses logarithmic scale for better distribution across geological time
 */
function yearsAgoToPercent(
  yearsAgo: number,
  minYearsAgo: number,
  maxYearsAgo: number
): number {
  // Use log scale for better distribution
  const logMin = Math.log10(Math.max(minYearsAgo, 1));
  const logMax = Math.log10(Math.max(maxYearsAgo, 1));
  const logValue = Math.log10(Math.max(yearsAgo, 1));
  
  return ((logValue - logMin) / (logMax - logMin)) * 100;
}

/**
 * Converts a percentage position to yearsAgo value
 */
function percentToYearsAgo(
  percent: number,
  minYearsAgo: number,
  maxYearsAgo: number
): number {
  const logMin = Math.log10(Math.max(minYearsAgo, 1));
  const logMax = Math.log10(Math.max(maxYearsAgo, 1));
  
  const logValue = logMin + (percent / 100) * (logMax - logMin);
  return Math.pow(10, logValue);
}


/**
 * TimeSlider Component
 * A vertical slider for navigating through geological time periods
 * 
 * Requirements:
 * - 3.1: Provide visual feedback showing current era
 * - 3.2: Update displayed era label and depth indicator
 * - 3.3: Scrolling downward progresses deeper into geological time
 * - 3.4: Tap era marker to snap to that era boundary
 * - 5.1: Trigger haptic pulse when crossing era boundary
 * - 5.2: Vary haptic intensity based on era significance
 * - 5.3: Trigger confirmation haptic on slider release
 */
export function TimeSlider({
  value,
  onChange,
  eraBoundaries,
  minYearsAgo = 1000,
  maxYearsAgo,
  snapToEra = true,
  onEraSelect,
  enableHaptics = true,
  onEraBoundaryCrossed,
}: TimeSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Track the previous era for boundary crossing detection
  // Requirements: 5.1 - Detect era boundary crossings
  const previousEraRef = useRef<EraBoundary | null>(null);

  // Calculate max years ago from boundaries if not provided
  const effectiveMaxYearsAgo = maxYearsAgo ?? 
    Math.max(...eraBoundaries.map(b => b.yearsAgo), 1_000_000_000);

  // Get current era based on value
  const currentEra = mapTimeToEra(isDragging ? dragValue : value, eraBoundaries);

  // Update drag value when external value changes
  useEffect(() => {
    if (!isDragging) {
      setDragValue(value);
    }
  }, [value, isDragging]);

  // Initialize previous era reference when value changes externally
  // This ensures we track the correct starting era for boundary detection
  useEffect(() => {
    if (!isDragging) {
      previousEraRef.current = mapTimeToEra(value, eraBoundaries);
    }
  }, [value, eraBoundaries, isDragging]);

  /**
   * Handles pointer/touch movement on the track
   * Requirement 3.3: Scrolling downward progresses deeper into geological time
   * Requirement 5.1: Trigger haptic pulse when crossing era boundary
   * Requirement 5.2: Vary haptic intensity based on era significance
   */
  const handlePointerMove = useCallback((clientY: number) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    const newYearsAgo = percentToYearsAgo(percent, minYearsAgo, effectiveMaxYearsAgo);
    
    // Detect era boundary crossing for haptic feedback
    // Requirements: 5.1 - Trigger haptic pulse when crossing era boundary
    const newEra = mapTimeToEra(newYearsAgo, eraBoundaries);
    const previousEra = previousEraRef.current;
    
    if (newEra && previousEra && newEra.layerId !== previousEra.layerId) {
      // Era boundary crossed - trigger haptic feedback
      // Requirements: 5.2 - Vary intensity based on era significance
      if (enableHaptics && hapticController.isSupported()) {
        const intensity = getHapticIntensityForEra(newEra.eraName);
        hapticController.pulseEraBoundary(intensity);
      }
      
      // Notify callback if provided
      onEraBoundaryCrossed?.(previousEra, newEra);
    }
    
    // Update previous era reference
    previousEraRef.current = newEra;
    
    setDragValue(newYearsAgo);
  }, [minYearsAgo, effectiveMaxYearsAgo, eraBoundaries, enableHaptics, onEraBoundaryCrossed]);

  /**
   * Handles pointer/touch end - snaps to nearest era if enabled
   * Requirement 5.3: Trigger confirmation haptic on slider release
   */
  const handlePointerEnd = useCallback(() => {
    setIsDragging(false);

    // Trigger confirmation haptic on release
    // Requirements: 5.3 - Trigger confirmation haptic when slider is released
    if (enableHaptics && hapticController.isSupported()) {
      hapticController.pulseConfirm();
    }

    if (snapToEra && eraBoundaries.length > 0) {
      const nearest = findNearestEraBoundary(dragValue, eraBoundaries);
      if (nearest) {
        onChange(nearest.yearsAgo);
        return;
      }
    }

    onChange(dragValue);
  }, [dragValue, snapToEra, eraBoundaries, onChange, enableHaptics]);

  /**
   * Handles era marker tap
   * Requirement 3.4: Tap era marker to snap to that era boundary
   */
  const handleEraMarkerClick = useCallback((boundary: EraBoundary) => {
    onChange(boundary.yearsAgo);
    onEraSelect?.(boundary);
  }, [onChange, onEraSelect]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handlePointerMove(e.clientY);
  }, [handlePointerMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handlePointerMove(e.clientY);
    }
  }, [isDragging, handlePointerMove]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      handlePointerEnd();
    }
  }, [isDragging, handlePointerEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    handlePointerMove(e.touches[0].clientY);
  }, [handlePointerMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging) {
      handlePointerMove(e.touches[0].clientY);
    }
  }, [isDragging, handlePointerMove]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      handlePointerEnd();
    }
  }, [isDragging, handlePointerEnd]);

  // Add global mouse listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate thumb position
  const thumbPercent = yearsAgoToPercent(
    isDragging ? dragValue : value,
    minYearsAgo,
    effectiveMaxYearsAgo
  );

  return (
    <div className="flex h-full py-4">
      {/* Era labels on the left */}
      <div className="flex flex-col justify-between pr-2 text-right text-xs text-gray-400 w-20">
        <span>Present</span>
        <span>{formatYearsAgo(effectiveMaxYearsAgo)} ago</span>
      </div>

      {/* Slider track */}
      <div className="relative flex-1 flex flex-col items-center">
        <div
          ref={trackRef}
          className="relative w-3 h-full bg-deep-600 rounded-full cursor-pointer"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Era markers */}
          {eraBoundaries.map((boundary) => {
            const markerPercent = yearsAgoToPercent(
              boundary.yearsAgo,
              minYearsAgo,
              effectiveMaxYearsAgo
            );
            const isActive = currentEra?.layerId === boundary.layerId;

            return (
              <button
                key={boundary.layerId}
                className={`absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 transition-all touch-target ${
                  isActive
                    ? 'bg-blue-500 border-blue-400 scale-110'
                    : 'bg-deep-500 border-deep-400 hover:bg-deep-400'
                }`}
                style={{ top: `${markerPercent}%`, transform: 'translate(-50%, -50%)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEraMarkerClick(boundary);
                }}
                aria-label={`Go to ${boundary.eraName}`}
              />
            );
          })}

          {/* Thumb */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-7 h-7 bg-white rounded-full shadow-lg border-2 border-blue-500 transition-transform ${
              isDragging ? 'scale-125' : ''
            }`}
            style={{ top: `${thumbPercent}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>

      {/* Current era info on the right */}
      <div className="pl-3 w-28">
        {currentEra && (
          <div className={`transition-opacity ${isDragging ? 'opacity-100' : 'opacity-70'}`}>
            <div className="text-sm font-medium text-white truncate">
              {currentEra.eraName}
            </div>
            <div className="text-xs text-gray-400">
              {formatYearsAgo(isDragging ? dragValue : value)} ago
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TimeSlider;
