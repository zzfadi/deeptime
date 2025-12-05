/**
 * useIdleFade Hook
 * Tracks touch events and idle time to fade UI elements
 * Requirements: 6.4 - Fade UI to 50% after 5 seconds idle
 * Requirements: 6.5 - Restore UI to full opacity on touch
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/** Default idle timeout in milliseconds (5 seconds) */
export const DEFAULT_IDLE_TIMEOUT = 5000;

/** Opacity when idle */
export const IDLE_OPACITY = 0.5;

/** Opacity when active */
export const ACTIVE_OPACITY = 1;

export interface UseIdleFadeOptions {
  /** Timeout in milliseconds before fading (default: 5000ms) */
  idleTimeout?: number;
  /** Opacity when idle (default: 0.5) */
  idleOpacity?: number;
  /** Opacity when active (default: 1) */
  activeOpacity?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

export interface UseIdleFadeResult {
  /** Current opacity value (0-1) */
  opacity: number;
  /** Whether the UI is currently in idle state */
  isIdle: boolean;
  /** Manually reset the idle timer (e.g., on programmatic interaction) */
  resetIdleTimer: () => void;
}

/**
 * Hook to manage UI fade on idle
 * 
 * Requirements:
 * - 6.4: Fade UI elements to 50% opacity after 5 seconds idle
 * - 6.5: Restore UI elements to full opacity on touch
 * 
 * @param options - Configuration options
 * @returns Object with opacity, isIdle state, and resetIdleTimer function
 */
export function useIdleFade(options: UseIdleFadeOptions = {}): UseIdleFadeResult {
  const {
    idleTimeout = DEFAULT_IDLE_TIMEOUT,
    idleOpacity = IDLE_OPACITY,
    activeOpacity = ACTIVE_OPACITY,
    enabled = true,
  } = options;

  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Reset the idle timer
   * Called on any user interaction
   */
  const resetIdleTimer = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Restore active state
    setIsIdle(false);

    // Set new timeout if enabled
    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        setIsIdle(true);
      }, idleTimeout);
    }
  }, [idleTimeout, enabled]);

  /**
   * Handle user interaction events
   */
  const handleInteraction = useCallback(() => {
    resetIdleTimer();
  }, [resetIdleTimer]);

  /**
   * Set up event listeners for user interactions
   */
  useEffect(() => {
    if (!enabled) {
      setIsIdle(false);
      return;
    }

    // Events that indicate user activity
    const events: (keyof WindowEventMap)[] = [
      'touchstart',
      'touchmove',
      'touchend',
      'mousedown',
      'mousemove',
      'mouseup',
      'click',
      'scroll',
      'keydown',
    ];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    // Start initial idle timer
    resetIdleTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, handleInteraction, resetIdleTimer]);

  // Calculate current opacity
  const opacity = isIdle ? idleOpacity : activeOpacity;

  return {
    opacity,
    isIdle,
    resetIdleTimer,
  };
}

export default useIdleFade;
