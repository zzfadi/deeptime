/**
 * WebXR Feature Detection Hook
 * Checks navigator.xr availability and shows/hides AR button based on support
 * Requirements: 4.5 - Gracefully fall back to 2D card-based visualization when WebXR not supported
 */

import { useState, useEffect, useCallback } from 'react';
import { isIOS, getRecommendedARMode, logARCapabilities } from '../utils/iosARDetection';

export interface WebXRSupport {
  /** Whether WebXR API is available in the browser */
  isAvailable: boolean;
  /** Whether immersive-ar mode is supported */
  isARSupported: boolean;
  /** Whether immersive-vr mode is supported */
  isVRSupported: boolean;
  /** Whether the check is still in progress */
  isChecking: boolean;
  /** Error message if check failed */
  error: string | null;
}

/**
 * Check if WebXR is available and what modes are supported
 * Requirement 4.5: Check navigator.xr availability
 */
export function useWebXRSupport(): WebXRSupport {
  const [support, setSupport] = useState<WebXRSupport>({
    isAvailable: false,
    isARSupported: false,
    isVRSupported: false,
    isChecking: true,
    error: null,
  });

  useEffect(() => {
    async function checkWebXRSupport() {
      // Log AR capabilities for debugging
      logARCapabilities();
      
      // Give polyfill time to initialize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Special handling for iOS - WebXR is not supported even with polyfill
      // iOS uses AR Quick Look or model-viewer instead
      if (isIOS()) {
        const recommendedMode = getRecommendedARMode();
        console.log('iOS detected, recommended AR mode:', recommendedMode);
        
        // For now, we'll enable AR on iOS and handle it differently in ARView
        // This allows the "Enter AR" button to show on iOS devices
        setSupport({
          isAvailable: true,
          isARSupported: true, // Enable AR button on iOS
          isVRSupported: false,
          isChecking: false,
          error: null,
        });
        return;
      }

      // Check if WebXR API exists (native or polyfilled)
      if (!('xr' in navigator) || !navigator.xr) {
        setSupport({
          isAvailable: false,
          isARSupported: false,
          isVRSupported: false,
          isChecking: false,
          error: 'WebXR API is not available in this browser',
        });
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const xr = navigator.xr as any;
        
        // Check AR support
        let arSupported = false;
        try {
          arSupported = await xr.isSessionSupported('immersive-ar');
          console.log('WebXR AR support check:', arSupported);
        } catch (err) {
          console.warn('WebXR AR support check failed:', err);
          arSupported = false;
        }

        // Check VR support
        let vrSupported = false;
        try {
          vrSupported = await xr.isSessionSupported('immersive-vr');
          console.log('WebXR VR support check:', vrSupported);
        } catch (err) {
          console.warn('WebXR VR support check failed:', err);
          vrSupported = false;
        }

        setSupport({
          isAvailable: true,
          isARSupported: arSupported,
          isVRSupported: vrSupported,
          isChecking: false,
          error: null,
        });
      } catch (err) {
        console.error('WebXR support check error:', err);
        setSupport({
          isAvailable: false,
          isARSupported: false,
          isVRSupported: false,
          isChecking: false,
          error: err instanceof Error ? err.message : 'Failed to check WebXR support',
        });
      }
    }

    checkWebXRSupport();
  }, []);

  return support;
}

/**
 * Hook to manage AR session state
 */
export function useARSession() {
  const [isActive, setIsActive] = useState(false);
  const webXRSupport = useWebXRSupport();

  const startAR = useCallback(() => {
    if (webXRSupport.isARSupported) {
      setIsActive(true);
    }
  }, [webXRSupport.isARSupported]);

  const endAR = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    ...webXRSupport,
    isActive,
    startAR,
    endAR,
  };
}

export default useWebXRSupport;
