// Time Slider Controller implementation
// Requirements: 4.2, 4.3, 4.5

import type { GeologicalEra, EraBoundary, TimeRange } from '../types';

// ============================================
// Geological Era Definitions
// ============================================

/**
 * Standard geological era boundaries used for time navigation.
 * Ordered from most recent to oldest.
 */
export const GEOLOGICAL_ERA_BOUNDARIES: EraBoundary[] = [
  { yearsAgo: 0, eraName: 'Present', hapticIntensity: 0.3 },
  { yearsAgo: 100, eraName: 'Modern Era', hapticIntensity: 0.4 },
  { yearsAgo: 500, eraName: 'Early Modern', hapticIntensity: 0.5 },
  { yearsAgo: 10_000, eraName: 'Holocene', hapticIntensity: 0.6 },
  { yearsAgo: 2_600_000, eraName: 'Pleistocene', hapticIntensity: 0.7 },
  { yearsAgo: 5_300_000, eraName: 'Pliocene', hapticIntensity: 0.7 },
  { yearsAgo: 23_000_000, eraName: 'Miocene', hapticIntensity: 0.8 },
  { yearsAgo: 66_000_000, eraName: 'Paleogene', hapticIntensity: 0.8 },
  { yearsAgo: 145_000_000, eraName: 'Cretaceous', hapticIntensity: 0.9 },
  { yearsAgo: 201_000_000, eraName: 'Jurassic', hapticIntensity: 0.9 },
  { yearsAgo: 252_000_000, eraName: 'Triassic', hapticIntensity: 0.9 },
  { yearsAgo: 299_000_000, eraName: 'Permian', hapticIntensity: 1.0 },
  { yearsAgo: 359_000_000, eraName: 'Carboniferous', hapticIntensity: 1.0 },
  { yearsAgo: 419_000_000, eraName: 'Devonian', hapticIntensity: 1.0 },
  { yearsAgo: 444_000_000, eraName: 'Silurian', hapticIntensity: 1.0 },
  { yearsAgo: 485_000_000, eraName: 'Ordovician', hapticIntensity: 1.0 },
  { yearsAgo: 541_000_000, eraName: 'Cambrian', hapticIntensity: 1.0 },
  { yearsAgo: 4_600_000_000, eraName: 'Precambrian', hapticIntensity: 1.0 },
];

/**
 * Maps era names to their geological periods
 */
const ERA_TO_PERIOD: Record<string, string> = {
  'Present': 'Quaternary',
  'Modern Era': 'Quaternary',
  'Early Modern': 'Quaternary',
  'Holocene': 'Quaternary',
  'Pleistocene': 'Quaternary',
  'Pliocene': 'Neogene',
  'Miocene': 'Neogene',
  'Paleogene': 'Paleogene',
  'Cretaceous': 'Cretaceous',
  'Jurassic': 'Jurassic',
  'Triassic': 'Triassic',
  'Permian': 'Permian',
  'Carboniferous': 'Carboniferous',
  'Devonian': 'Devonian',
  'Silurian': 'Silurian',
  'Ordovician': 'Ordovician',
  'Cambrian': 'Cambrian',
  'Precambrian': 'Precambrian',
};


// ============================================
// Time Position to Era Mapping
// Requirements: 4.2
// ============================================

/**
 * Result of era lookup including depth indicator
 */
export interface EraLookupResult {
  era: GeologicalEra;
  depthIndicator: number;
  boundaryIndex: number;
}

/**
 * Gets the geological era for a given time position (years ago).
 * 
 * The function finds the era boundary that the time position falls within.
 * A time position belongs to an era if it is >= that era's yearsAgo value
 * and < the next era's yearsAgo value.
 * 
 * Per Requirement 4.2: WHEN the Time_Slider position changes THEN the 
 * DeepTime_App SHALL update the displayed era label and depth indicator.
 * 
 * @param yearsAgo - The time position in years before present (must be >= 0)
 * @param boundaries - Optional custom era boundaries (defaults to GEOLOGICAL_ERA_BOUNDARIES)
 * @returns EraLookupResult containing the era, depth indicator, and boundary index
 */
export function getEraForTimePosition(
  yearsAgo: number,
  boundaries: EraBoundary[] = GEOLOGICAL_ERA_BOUNDARIES
): EraLookupResult {
  // Clamp negative values to 0
  const clampedYearsAgo = Math.max(0, yearsAgo);

  // Find the era boundary that contains this time position
  // We iterate from oldest to newest to find the first boundary where yearsAgo >= boundary.yearsAgo
  let boundaryIndex = 0;
  
  for (let i = boundaries.length - 1; i >= 0; i--) {
    if (clampedYearsAgo >= boundaries[i].yearsAgo) {
      boundaryIndex = i;
      break;
    }
  }

  const boundary = boundaries[boundaryIndex];
  
  // Calculate depth indicator as a normalized value (0-1) within the geological time scale
  // 0 = present, 1 = oldest era
  const maxYearsAgo = boundaries[boundaries.length - 1].yearsAgo;
  const depthIndicator = maxYearsAgo > 0 ? clampedYearsAgo / maxYearsAgo : 0;

  // Build the GeologicalEra object
  const era: GeologicalEra = {
    name: boundary.eraName,
    yearsAgo: clampedYearsAgo,
    period: ERA_TO_PERIOD[boundary.eraName] ?? 'Unknown',
  };

  return {
    era,
    depthIndicator,
    boundaryIndex,
  };
}

/**
 * Gets the depth indicator for a time position.
 * This is a convenience function that extracts just the depth indicator.
 * 
 * @param yearsAgo - The time position in years before present
 * @param boundaries - Optional custom era boundaries
 * @returns Normalized depth indicator (0-1)
 */
export function getDepthIndicator(
  yearsAgo: number,
  boundaries: EraBoundary[] = GEOLOGICAL_ERA_BOUNDARIES
): number {
  return getEraForTimePosition(yearsAgo, boundaries).depthIndicator;
}


// ============================================
// Era Boundary Snapping
// Requirements: 4.5
// ============================================

/**
 * Result of snapping to an era boundary
 */
export interface SnapResult {
  boundary: EraBoundary;
  snappedYearsAgo: number;
  distance: number;
  boundaryIndex: number;
}

/**
 * Snaps a time position to the nearest era boundary.
 * 
 * Per Requirement 4.5: WHEN the user releases the Time_Slider THEN the 
 * DeepTime_App SHALL snap to the nearest significant era boundary.
 * 
 * "Nearest" is defined as minimum absolute difference in yearsAgo.
 * 
 * @param yearsAgo - The current time position in years before present
 * @param boundaries - Optional custom era boundaries (defaults to GEOLOGICAL_ERA_BOUNDARIES)
 * @returns SnapResult containing the nearest boundary and snap distance
 */
export function snapToEraBoundary(
  yearsAgo: number,
  boundaries: EraBoundary[] = GEOLOGICAL_ERA_BOUNDARIES
): SnapResult {
  // Clamp negative values to 0
  const clampedYearsAgo = Math.max(0, yearsAgo);

  // Handle empty boundaries edge case
  if (boundaries.length === 0) {
    const defaultBoundary: EraBoundary = {
      yearsAgo: 0,
      eraName: 'Present',
      hapticIntensity: 0,
    };
    return {
      boundary: defaultBoundary,
      snappedYearsAgo: 0,
      distance: clampedYearsAgo,
      boundaryIndex: 0,
    };
  }

  // Find the boundary with minimum distance
  let nearestIndex = 0;
  let minDistance = Math.abs(clampedYearsAgo - boundaries[0].yearsAgo);

  for (let i = 1; i < boundaries.length; i++) {
    const distance = Math.abs(clampedYearsAgo - boundaries[i].yearsAgo);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  const nearestBoundary = boundaries[nearestIndex];

  return {
    boundary: nearestBoundary,
    snappedYearsAgo: nearestBoundary.yearsAgo,
    distance: minDistance,
    boundaryIndex: nearestIndex,
  };
}


// ============================================
// Time Slider Controller Class
// Requirements: 4.2, 4.3, 4.5
// ============================================

/**
 * Callback type for time change events
 */
export type TimeChangeCallback = (yearsAgo: number, era: GeologicalEra) => void;

/**
 * Callback type for haptic feedback events
 */
export type HapticCallback = (intensity: number) => void;

/**
 * Configuration options for TimeSliderController
 */
export interface TimeSliderControllerOptions {
  initialTimePosition?: number;
  boundaries?: EraBoundary[];
  onHapticFeedback?: HapticCallback;
}

/**
 * Controller for the Time Slider UI component.
 * 
 * Manages temporal navigation through geological time periods,
 * providing era mapping, boundary snapping, and callback registration.
 * 
 * Requirements:
 * - 4.2: Update displayed era label and depth indicator on position change
 * - 4.3: Scrolling downward progresses deeper into geological time
 * - 4.5: Snap to nearest era boundary on release
 */
export class TimeSliderController {
  private currentTimePosition: number;
  private boundaries: EraBoundary[];
  private timeChangeCallbacks: TimeChangeCallback[] = [];
  private hapticCallback?: HapticCallback;
  private lastEraBoundaryIndex: number = 0;

  constructor(options: TimeSliderControllerOptions = {}) {
    this.currentTimePosition = options.initialTimePosition ?? 0;
    this.boundaries = options.boundaries ?? GEOLOGICAL_ERA_BOUNDARIES;
    this.hapticCallback = options.onHapticFeedback;
    
    // Initialize last boundary index
    const result = getEraForTimePosition(this.currentTimePosition, this.boundaries);
    this.lastEraBoundaryIndex = result.boundaryIndex;
  }

  /**
   * Sets the current time position (years ago).
   * 
   * Per Requirement 4.2: Updates the displayed era label and depth indicator.
   * Per Requirement 4.3: Increasing values progress deeper into geological time.
   * 
   * @param yearsAgo - The new time position in years before present
   */
  setTimePosition(yearsAgo: number): void {
    // Clamp to valid range
    const clampedYearsAgo = Math.max(0, yearsAgo);
    
    // Get era information for the new position
    const result = getEraForTimePosition(clampedYearsAgo, this.boundaries);
    
    // Check if we crossed an era boundary
    if (result.boundaryIndex !== this.lastEraBoundaryIndex) {
      this.triggerEraBoundaryHaptic(result.boundaryIndex);
      this.lastEraBoundaryIndex = result.boundaryIndex;
    }
    
    // Update position
    this.currentTimePosition = clampedYearsAgo;
    
    // Notify all registered callbacks
    for (const callback of this.timeChangeCallbacks) {
      callback(clampedYearsAgo, result.era);
    }
  }

  /**
   * Gets the current time position.
   * 
   * @returns Current time position in years before present
   */
  getTimePosition(): number {
    return this.currentTimePosition;
  }

  /**
   * Gets the current era for the time position.
   * 
   * @returns The geological era at the current time position
   */
  getCurrentEra(): GeologicalEra {
    return getEraForTimePosition(this.currentTimePosition, this.boundaries).era;
  }

  /**
   * Gets the current depth indicator.
   * 
   * @returns Normalized depth indicator (0-1)
   */
  getDepthIndicator(): number {
    return getEraForTimePosition(this.currentTimePosition, this.boundaries).depthIndicator;
  }

  /**
   * Registers a callback for time change events.
   * 
   * @param callback - Function to call when time position changes
   * @returns Unsubscribe function to remove the callback
   */
  onTimeChange(callback: TimeChangeCallback): () => void {
    this.timeChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.timeChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.timeChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Triggers haptic feedback for an era boundary crossing.
   * 
   * Per Requirement 4.4: WHEN the Time_Slider reaches a new geological era 
   * boundary THEN the DeepTime_App SHALL trigger a distinct haptic pulse.
   * 
   * @param boundaryIndex - Index of the boundary that was crossed
   */
  triggerEraBoundaryHaptic(boundaryIndex?: number): void {
    if (!this.hapticCallback) return;
    
    const index = boundaryIndex ?? this.lastEraBoundaryIndex;
    const boundary = this.boundaries[index];
    
    if (boundary) {
      this.hapticCallback(boundary.hapticIntensity);
    }
  }

  /**
   * Snaps to the nearest era boundary.
   * 
   * Per Requirement 4.5: WHEN the user releases the Time_Slider THEN the 
   * DeepTime_App SHALL snap to the nearest significant era boundary.
   * 
   * @returns The era that was snapped to
   */
  snapToEraBoundary(): GeologicalEra {
    const snapResult = snapToEraBoundary(this.currentTimePosition, this.boundaries);
    
    // Update position to snapped value
    this.setTimePosition(snapResult.snappedYearsAgo);
    
    // Return the era at the snapped position
    return getEraForTimePosition(snapResult.snappedYearsAgo, this.boundaries).era;
  }

  /**
   * Gets the configured era boundaries.
   * 
   * @returns Array of era boundaries
   */
  getBoundaries(): EraBoundary[] {
    return [...this.boundaries];
  }

  /**
   * Gets the time range supported by this controller.
   * 
   * @returns TimeRange object with min/max years and boundaries
   */
  getTimeRange(): TimeRange {
    const sortedBoundaries = [...this.boundaries].sort((a, b) => a.yearsAgo - b.yearsAgo);
    
    return {
      minYearsAgo: sortedBoundaries[0]?.yearsAgo ?? 0,
      maxYearsAgo: sortedBoundaries[sortedBoundaries.length - 1]?.yearsAgo ?? 0,
      eraBoundaries: this.boundaries,
    };
  }
}
