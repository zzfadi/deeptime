// Mode Manager implementation
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5

import type {
  AppMode,
  ModeConfiguration,
  TimeRange,
  GeoCoordinate,
} from '../types';
import { GEOLOGICAL_ERA_BOUNDARIES } from '../timeslider';

// ============================================
// Mode Configuration Definitions
// Requirements: 9.1, 9.2, 9.3, 9.5
// ============================================

/**
 * Default time range used across all modes.
 * Can be overridden per mode if needed.
 */
const DEFAULT_TIME_RANGE: TimeRange = {
  minYearsAgo: 0,
  maxYearsAgo: 4_600_000_000,
  eraBoundaries: GEOLOGICAL_ERA_BOUNDARIES,
};

/**
 * Construction mode configuration.
 * 
 * Per Requirement 9.1: WHEN the user selects Construction mode THEN the 
 * DeepTime_App SHALL prioritize utility visualization and soil density data.
 * 
 * Per Requirement 9.5: Mode-specific UI elements and hidden controls.
 */
const CONSTRUCTION_MODE_CONFIG: ModeConfiguration = {
  mode: 'construction',
  priorityDataTypes: ['utility', 'soil_density', 'foundation', 'pipe', 'infrastructure'],
  visibleUIElements: [
    'ghost_layer_toggle',
    'depth_indicator',
    'utility_legend',
    'soil_density_overlay',
    'measurement_tools',
    'anomaly_markers',
  ],
  hiddenUIElements: [
    'creature_info',
    'narrative_panel',
    'flora_overlay',
    'fauna_overlay',
    'historical_timeline',
  ],
  defaultTimeRange: {
    ...DEFAULT_TIME_RANGE,
    maxYearsAgo: 10_000, // Construction focuses on recent history
  },
  visualizationPresets: [
    { name: 'utility_highlight', settings: { highlightPipes: true, highlightElectrical: true } },
    { name: 'soil_analysis', settings: { showDensity: true, showWaterContent: true } },
  ],
};


/**
 * Education mode configuration.
 * 
 * Per Requirement 9.2: WHEN the user selects Education mode THEN the 
 * DeepTime_App SHALL prioritize historical narratives and creature visualizations.
 * 
 * Per Requirement 9.5: Mode-specific UI elements and hidden controls.
 */
const EDUCATION_MODE_CONFIG: ModeConfiguration = {
  mode: 'education',
  priorityDataTypes: ['narrative', 'creatures', 'flora', 'fauna', 'historical_events'],
  visibleUIElements: [
    'time_slider',
    'narrative_panel',
    'creature_info',
    'era_label',
    'excavator_tool',
    'flora_overlay',
    'fauna_overlay',
    'historical_timeline',
  ],
  hiddenUIElements: [
    'utility_legend',
    'soil_density_overlay',
    'measurement_tools',
    'flood_risk_indicator',
    'water_table_depth',
  ],
  defaultTimeRange: DEFAULT_TIME_RANGE,
  visualizationPresets: [
    { name: 'immersive_history', settings: { showCreatures: true, showNarrative: true } },
    { name: 'fossil_focus', settings: { highlightFossils: true, showExcavator: true } },
  ],
};

/**
 * Environmental mode configuration.
 * 
 * Per Requirement 9.3: WHEN the user selects Environmental mode THEN the 
 * DeepTime_App SHALL prioritize water table and flood risk visualizations.
 * 
 * Per Requirement 9.5: Mode-specific UI elements and hidden controls.
 */
const ENVIRONMENTAL_MODE_CONFIG: ModeConfiguration = {
  mode: 'environmental',
  priorityDataTypes: ['water_table', 'flood_risk', 'soil_composition', 'contamination', 'drainage'],
  visibleUIElements: [
    'water_table_depth',
    'flood_risk_indicator',
    'soil_composition_panel',
    'environmental_alerts',
    'depth_indicator',
    'contamination_overlay',
  ],
  hiddenUIElements: [
    'creature_info',
    'narrative_panel',
    'utility_legend',
    'excavator_tool',
    'historical_timeline',
  ],
  defaultTimeRange: {
    ...DEFAULT_TIME_RANGE,
    maxYearsAgo: 100_000, // Environmental focuses on geologically recent data
  },
  visualizationPresets: [
    { name: 'flood_analysis', settings: { showFloodZones: true, showWaterTable: true } },
    { name: 'soil_health', settings: { showContamination: true, showDrainage: true } },
  ],
};

/**
 * Map of all mode configurations for quick lookup.
 */
const MODE_CONFIGURATIONS: Record<AppMode, ModeConfiguration> = {
  construction: CONSTRUCTION_MODE_CONFIG,
  education: EDUCATION_MODE_CONFIG,
  environmental: ENVIRONMENTAL_MODE_CONFIG,
};

/**
 * Gets the configuration for a specific app mode.
 * 
 * Per Requirements 9.1, 9.2, 9.3: Returns mode-specific priority data types.
 * Per Requirement 9.5: Returns mode-specific visible and hidden UI elements.
 * 
 * @param mode - The app mode to get configuration for
 * @returns ModeConfiguration for the specified mode
 */
export function getModeConfiguration(mode: AppMode): ModeConfiguration {
  return MODE_CONFIGURATIONS[mode];
}

/**
 * Gets all available mode configurations.
 * 
 * @returns Record of all mode configurations
 */
export function getAllModeConfigurations(): Record<AppMode, ModeConfiguration> {
  return { ...MODE_CONFIGURATIONS };
}

/**
 * Validates that a mode configuration has no overlap between visible and hidden UI elements.
 * 
 * Per Requirement 9.5: visibleUIElements and hiddenUIElements SHALL have no overlap.
 * 
 * @param config - The mode configuration to validate
 * @returns true if valid (no overlap), false otherwise
 */
export function validateModeConfiguration(config: ModeConfiguration): boolean {
  const visibleSet = new Set(config.visibleUIElements);
  for (const hidden of config.hiddenUIElements) {
    if (visibleSet.has(hidden)) {
      return false;
    }
  }
  return true;
}


// ============================================
// Mode Manager State
// Requirements: 9.4
// ============================================

/**
 * State that should be preserved across mode switches.
 * 
 * Per Requirement 9.4: WHEN switching modes THEN the DeepTime_App 
 * SHALL preserve the current location and time position.
 */
export interface PreservedState {
  location: GeoCoordinate | null;
  timePosition: number;
}

/**
 * Callback type for mode change events
 */
export type ModeChangeCallback = (
  newMode: AppMode,
  config: ModeConfiguration,
  preservedState: PreservedState
) => void;

/**
 * Configuration options for ModeManager
 */
export interface ModeManagerOptions {
  initialMode?: AppMode;
  initialLocation?: GeoCoordinate;
  initialTimePosition?: number;
}

// ============================================
// Mode Manager Class
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
// ============================================

/**
 * Manager for application mode switching with state preservation.
 * 
 * Handles switching between Construction, Education, and Environmental modes
 * while preserving the user's current location and time position.
 * 
 * Requirements:
 * - 9.1: Construction mode prioritizes utility and soil density
 * - 9.2: Education mode prioritizes narratives and creatures
 * - 9.3: Environmental mode prioritizes water table and flood risk
 * - 9.4: Mode switching preserves location and time position
 * - 9.5: Each mode has specific visible/hidden UI elements
 */
export class ModeManager {
  private currentMode: AppMode;
  private preservedState: PreservedState;
  private modeChangeCallbacks: ModeChangeCallback[] = [];

  constructor(options: ModeManagerOptions = {}) {
    this.currentMode = options.initialMode ?? 'education';
    this.preservedState = {
      location: options.initialLocation ?? null,
      timePosition: options.initialTimePosition ?? 0,
    };
  }

  /**
   * Sets the active mode while preserving location and time position.
   * 
   * Per Requirement 9.4: WHEN switching modes THEN the DeepTime_App 
   * SHALL preserve the current location and time position.
   * 
   * @param mode - The new mode to switch to
   */
  setMode(mode: AppMode): void {
    // Mode is already active, no change needed
    if (mode === this.currentMode) {
      return;
    }

    // Update the current mode
    this.currentMode = mode;

    // Get the configuration for the new mode
    const config = getModeConfiguration(mode);

    // Notify all registered callbacks
    // State is preserved - location and timePosition remain unchanged
    for (const callback of this.modeChangeCallbacks) {
      callback(mode, config, { ...this.preservedState });
    }
  }

  /**
   * Gets the current active mode.
   * 
   * @returns The current AppMode
   */
  getMode(): AppMode {
    return this.currentMode;
  }

  /**
   * Gets the configuration for the current mode.
   * 
   * @returns ModeConfiguration for the current mode
   */
  getModeConfig(): ModeConfiguration {
    return getModeConfiguration(this.currentMode);
  }

  /**
   * Updates the preserved location.
   * This location will be maintained across mode switches.
   * 
   * @param location - The new location to preserve
   */
  setLocation(location: GeoCoordinate): void {
    this.preservedState.location = location;
  }

  /**
   * Gets the preserved location.
   * 
   * @returns The preserved GeoCoordinate or null if not set
   */
  getLocation(): GeoCoordinate | null {
    return this.preservedState.location;
  }

  /**
   * Updates the preserved time position.
   * This time position will be maintained across mode switches.
   * 
   * @param timePosition - The new time position (years ago) to preserve
   */
  setTimePosition(timePosition: number): void {
    this.preservedState.timePosition = Math.max(0, timePosition);
  }

  /**
   * Gets the preserved time position.
   * 
   * @returns The preserved time position in years ago
   */
  getTimePosition(): number {
    return this.preservedState.timePosition;
  }

  /**
   * Gets the complete preserved state.
   * 
   * @returns Copy of the preserved state
   */
  getPreservedState(): PreservedState {
    return { ...this.preservedState };
  }

  /**
   * Registers a callback for mode change events.
   * 
   * @param callback - Function to call when mode changes
   * @returns Unsubscribe function to remove the callback
   */
  onModeChange(callback: ModeChangeCallback): () => void {
    this.modeChangeCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.modeChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.modeChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Gets all available modes.
   * 
   * @returns Array of all AppMode values
   */
  getAvailableModes(): AppMode[] {
    return ['construction', 'education', 'environmental'];
  }

  /**
   * Checks if a UI element should be visible in the current mode.
   * 
   * @param elementId - The UI element identifier
   * @returns true if the element should be visible
   */
  isUIElementVisible(elementId: string): boolean {
    const config = this.getModeConfig();
    return config.visibleUIElements.includes(elementId);
  }

  /**
   * Checks if a UI element should be hidden in the current mode.
   * 
   * @param elementId - The UI element identifier
   * @returns true if the element should be hidden
   */
  isUIElementHidden(elementId: string): boolean {
    const config = this.getModeConfig();
    return config.hiddenUIElements.includes(elementId);
  }
}
