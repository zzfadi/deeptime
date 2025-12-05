/**
 * WebXR Feature Detection Hook
 * Checks navigator.xr availability and shows/hides AR button based on support
 * Requirements: 4.5 - Gracefully fall back to 2D card-based visualization when WebXR not supported
 */

import { useState, useEffect, useCallback } from 'react';

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
      // Check if WebXR API exists
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
        } catch {
          arSupported = false;
        }

        // Check VR support
        let vrSupported = false;
        try {
          vrSupported = await xr.isSessionSupported('immersive-vr');
        } catch {
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
