/**
 * ARTimeSlider Component
 * Compact vertical slider for AR view, positioned on left edge
 * Requirements: 6.1 - Display a compact time slider on the left edge
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { hapticController, getHapticIntensityForEra } from '../services/haptics';

export interface AREraBoundary {
  yearsAgo: number;
  eraName: string;
  layerId: string;
}

export interface ARTimeSliderProps {
  /** Current time position in years ago */
  value: number;
  /** Callback when slider value changes */
  onChange: (yearsAgo: number) => void;
  /** Era boundaries for markers */
  eraBoundaries: AREraBoundary[];
  /** Minimum years ago (most recent) */
  minYearsAgo?: number;
  /** Maximum years ago (oldest) */
  maxYearsAgo?: number;
  /** Whether to snap to era boundaries on release */
  snapToEra?: boolean;
  /** Whether haptic feedback is enabled */
  enableHaptics?: boolean;
  /** Whether the slider is disabled (e.g., during transitions) */
  disabled?: boolean;
  /** Opacity for idle fade effect (0-1) */
  opacity?: number;
}

/**
 * Formats years ago into compact human-readable string
 */
function formatYearsAgoCompact(yearsAgo: number): string {
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
 */
function mapTimeToEra(
  yearsAgo: number,
  eraBoundaries: AREraBoundary[]
): AREraBoundary | null {
  if (eraBoundaries.length === 0) return null;

  const sorted = [...eraBoundaries].sort((a, b) => a.yearsAgo - b.yearsAgo);

  for (let i = sorted.length - 1; i >= 0; i--) {
    if (yearsAgo >= sorted[i].yearsAgo) {
      return sorted[i];
    }
  }

  return sorted[0];
}

/**
 * Finds the nearest era boundary to snap to
 */
function findNearestEraBoundary(
  yearsAgo: number,
  eraBoundaries: AREraBoundary[]
): AREraBoundary | null {
  if (eraBoundaries.length === 0) return null;

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
 * Converts yearsAgo to percentage (logarithmic scale)
 */
function yearsAgoToPercent(
  yearsAgo: number,
  minYearsAgo: number,
  maxYearsAgo: number
): number {
  const logMin = Math.log10(Math.max(minYearsAgo, 1));
  const logMax = Math.log10(Math.max(maxYearsAgo, 1));
  const logValue = Math.log10(Math.max(yearsAgo, 1));
  
  return ((logValue - logMin) / (logMax - logMin)) * 100;
}

/**
 * Converts percentage to yearsAgo (logarithmic scale)
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
 * ARTimeSlider Component
 * A compact vertical slider for AR view positioned on the left edge
 * 
 * Requirements:
 * - 6.1: Display a compact time slider on the left edge
 */
export function ARTimeSlider({
  value,
  onChange,
  eraBoundaries,
  minYearsAgo = 1000,
  maxYearsAgo,
  snapToEra = true,
  enableHaptics = true,
  disabled = false,
  opacity = 1,
}: ARTimeSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const trackRef = useRef<HTMLDivElement>(null);
  const previousEraRef = useRef<AREraBoundary | null>(null);

  const effectiveMaxYearsAgo = maxYearsAgo ?? 
    Math.max(...eraBoundaries.map(b => b.yearsAgo), 1_000_000_000);

  const currentEra = mapTimeToEra(isDragging ? dragValue : value, eraBoundaries);

  useEffect(() => {
    if (!isDragging) {
      setDragValue(value);
    }
  }, [value, isDragging]);

  useEffect(() => {
    if (!isDragging) {
      previousEraRef.current = mapTimeToEra(value, eraBoundaries);
    }
  }, [value, eraBoundaries, isDragging]);

  const handlePointerMove = useCallback((clientY: number) => {
    if (!trackRef.current || disabled) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    const newYearsAgo = percentToYearsAgo(percent, minYearsAgo, effectiveMaxYearsAgo);
    
    const newEra = mapTimeToEra(newYearsAgo, eraBoundaries);
    const previousEra = previousEraRef.current;
    
    if (newEra && previousEra && newEra.layerId !== previousEra.layerId) {
      if (enableHaptics && hapticController.isSupported()) {
        const intensity = getHapticIntensityForEra(newEra.eraName);
        hapticController.pulseEraBoundary(intensity);
      }
    }
    
    previousEraRef.current = newEra;
    setDragValue(newYearsAgo);
  }, [minYearsAgo, effectiveMaxYearsAgo, eraBoundaries, enableHaptics, disabled]);

  const handlePointerEnd = useCallback(() => {
    if (disabled) return;
    
    setIsDragging(false);

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
  }, [dragValue, snapToEra, eraBoundaries, onChange, enableHaptics, disabled]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handlePointerMove(e.touches[0].clientY);
  }, [handlePointerMove, disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging && !disabled) {
      handlePointerMove(e.touches[0].clientY);
    }
  }, [isDragging, handlePointerMove, disabled]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging && !disabled) {
      handlePointerEnd();
    }
  }, [isDragging, handlePointerEnd, disabled]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    handlePointerMove(e.clientY);
  }, [handlePointerMove, disabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && !disabled) {
      handlePointerMove(e.clientY);
    }
  }, [isDragging, handlePointerMove, disabled]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && !disabled) {
      handlePointerEnd();
    }
  }, [isDragging, handlePointerEnd, disabled]);

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

  const thumbPercent = yearsAgoToPercent(
    isDragging ? dragValue : value,
    minYearsAgo,
    effectiveMaxYearsAgo
  );

  return (
    <div 
      className="fixed left-2 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center safe-left transition-opacity duration-300"
      style={{ opacity, height: '60vh' }}
    >
      {/* Current era label - compact */}
      <div className={`mb-2 text-center transition-opacity ${isDragging ? 'opacity-100' : 'opacity-80'}`}>
        <div className="text-xs font-medium text-white drop-shadow-lg truncate max-w-16">
          {currentEra?.eraName.split(' ')[0] || 'Present'}
        </div>
        <div className="text-[10px] text-white/70 drop-shadow">
          {formatYearsAgoCompact(isDragging ? dragValue : value)}
        </div>
      </div>

      {/* Slider track - compact vertical */}
      <div
        ref={trackRef}
        className={`relative w-2 flex-1 bg-white/20 rounded-full backdrop-blur-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Era markers - small dots */}
        {eraBoundaries.map((boundary) => {
          const markerPercent = yearsAgoToPercent(
            boundary.yearsAgo,
            minYearsAgo,
            effectiveMaxYearsAgo
          );
          const isActive = currentEra?.layerId === boundary.layerId;

          return (
            <div
              key={boundary.layerId}
              className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all ${
                isActive
                  ? 'bg-blue-400 scale-110'
                  : 'bg-white/40'
              }`}
              style={{ top: `${markerPercent}%`, transform: 'translate(-50%, -50%)' }}
            />
          );
        })}

        {/* Thumb - compact */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-blue-400 transition-transform ${
            isDragging ? 'scale-125' : ''
          } ${disabled ? 'bg-gray-400' : ''}`}
          style={{ top: `${thumbPercent}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Time labels - minimal */}
      <div className="mt-2 text-[10px] text-white/60 drop-shadow">
        {formatYearsAgoCompact(effectiveMaxYearsAgo)}
      </div>
    </div>
  );
}

export default ARTimeSlider;
