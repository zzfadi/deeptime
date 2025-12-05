/**
 * Haptic Controller Service
 * Manages vibration feedback for time navigation
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import type { HapticIntensity, IHapticController } from '../ar/types';

/**
 * Vibration duration mappings for different intensities
 * Requirements: 5.2 - Vary intensity based on era significance
 */
export const HAPTIC_DURATIONS: Record<HapticIntensity, number> = {
  light: 10,    // 10ms for minor boundaries
  medium: 25,   // 25ms for sub-era boundaries
  strong: 50,   // 50ms for major era boundaries
};

/**
 * Confirmation haptic pattern (short double pulse)
 * Requirements: 5.3 - Trigger confirmation haptic on slider release
 */
export const CONFIRM_PATTERN: number[] = [15, 50, 15];

/**
 * Major geological eras that warrant strong haptic feedback
 * Requirements: 5.2 - Major era boundaries use 'strong' intensity
 */
export const MAJOR_ERA_NAMES = [
  'Precambrian',
  'Paleozoic',
  'Mesozoic',
  'Cenozoic',
  'Hadean',
  'Archean',
  'Proterozoic',
  'Phanerozoic',
];

/**
 * Determines the haptic intensity for an era boundary
 * Requirements: 5.2 - Major era boundaries use 'strong', sub-era use 'medium' or 'light'
 * 
 * @param eraName - The name of the era boundary being crossed
 * @returns The appropriate haptic intensity
 */
export function getHapticIntensityForEra(eraName: string): HapticIntensity {
  // Check if this is a major era boundary
  const isMajorEra = MAJOR_ERA_NAMES.some(
    major => eraName.toLowerCase().includes(major.toLowerCase())
  );
  
  if (isMajorEra) {
    return 'strong';
  }
  
  // Sub-era boundaries get medium intensity
  // Very minor boundaries (like specific periods) get light
  const isSubEra = eraName.includes('Early') || 
                   eraName.includes('Middle') || 
                   eraName.includes('Late') ||
                   eraName.includes('Upper') ||
                   eraName.includes('Lower');
  
  return isSubEra ? 'light' : 'medium';
}

/**
 * HapticController implementation
 * Wraps the Vibration API with intensity levels
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export class HapticController implements IHapticController {
  private _isSupported: boolean;

  constructor() {
    // Check if Vibration API is supported
    // Requirements: 5.4 - Handle unsupported devices gracefully
    this._isSupported = typeof navigator !== 'undefined' && 
                        'vibrate' in navigator &&
                        typeof navigator.vibrate === 'function';
  }

  /**
   * Check if haptics are supported on this device
   * Requirements: 5.4 - Skip haptic feedback silently if unsupported
   */
  isSupported(): boolean {
    return this._isSupported;
  }

  /**
   * Trigger haptic pulse for era boundary crossing
   * Requirements: 5.1 - Trigger haptic pulse when crossing era boundary
   * Requirements: 5.2 - Vary intensity based on era significance
   * 
   * @param intensity - The intensity level of the haptic pulse
   */
  pulseEraBoundary(intensity: HapticIntensity): void {
    if (!this._isSupported) {
      // Requirements: 5.4 - Skip silently if unsupported
      return;
    }

    const duration = HAPTIC_DURATIONS[intensity];
    
    try {
      navigator.vibrate(duration);
    } catch {
      // Silently fail if vibration fails
      // This can happen if the page is not visible or other restrictions
    }
  }

  /**
   * Trigger confirmation haptic when slider is released
   * Requirements: 5.3 - Trigger confirmation haptic on slider release
   */
  pulseConfirm(): void {
    if (!this._isSupported) {
      // Requirements: 5.4 - Skip silently if unsupported
      return;
    }

    try {
      navigator.vibrate(CONFIRM_PATTERN);
    } catch {
      // Silently fail if vibration fails
    }
  }
}

/**
 * Singleton instance of the HapticController
 */
export const hapticController = new HapticController();

export default hapticController;
