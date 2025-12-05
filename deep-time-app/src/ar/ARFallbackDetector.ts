/**
 * AR Fallback Detector
 * Checks WebXR support and camera permissions to determine fallback mode
 * Requirements: 1.4, 1.5
 */

import type { ARAvailability, IARFallbackDetector } from './types';

/**
 * Reasons why AR might not be available
 */
export const AR_UNAVAILABLE_REASONS = {
  NO_WEBXR: 'WebXR API is not available in this browser',
  NO_AR_SUPPORT: 'Immersive AR mode is not supported on this device',
  CAMERA_DENIED: 'Camera permission was denied',
  INSECURE_CONTEXT: 'AR requires a secure context (HTTPS)',
  UNKNOWN: 'AR is not available for an unknown reason',
} as const;

/**
 * ARFallbackDetector implementation
 * Determines the best viewing mode based on device capabilities
 * 
 * Requirements:
 * - 1.4: Fall back to camera-only mode with 2D overlays when WebXR not supported
 * - 1.5: Display card-based interface when camera permission is denied
 */
export class ARFallbackDetector implements IARFallbackDetector {
  private cachedAvailability: ARAvailability | null = null;
  private shouldFallbackToCards = false;

  /**
   * Check AR availability and determine fallback mode
   * Requirements: 1.4, 1.5
   */
  async checkAvailability(): Promise<ARAvailability> {
    // Return cached result if available
    if (this.cachedAvailability) {
      return this.cachedAvailability;
    }

    const result: ARAvailability = {
      isARAvailable: false,
      isCameraAvailable: false,
      unavailableReason: null,
      fallbackMode: 'card-view',
    };

    // Check for secure context (required for WebXR and camera)
    if (!window.isSecureContext) {
      result.unavailableReason = AR_UNAVAILABLE_REASONS.INSECURE_CONTEXT;
      this.cachedAvailability = result;
      return result;
    }

    // Check WebXR availability
    if (!('xr' in navigator) || !navigator.xr) {
      result.unavailableReason = AR_UNAVAILABLE_REASONS.NO_WEBXR;
      
      // Check if camera is still available for camera-only mode
      result.isCameraAvailable = await this.checkCameraAvailability();
      result.fallbackMode = result.isCameraAvailable ? 'camera-only' : 'card-view';
      
      this.cachedAvailability = result;
      return result;
    }

    // Check immersive-ar support
    try {
      const xr = navigator.xr as XRSystem;
      const arSupported = await xr.isSessionSupported('immersive-ar');

      if (!arSupported) {
        result.unavailableReason = AR_UNAVAILABLE_REASONS.NO_AR_SUPPORT;
        
        // Check camera for fallback
        result.isCameraAvailable = await this.checkCameraAvailability();
        result.fallbackMode = result.isCameraAvailable ? 'camera-only' : 'card-view';
        
        this.cachedAvailability = result;
        return result;
      }

      // Full AR is available
      result.isARAvailable = true;
      result.isCameraAvailable = true;
      result.fallbackMode = 'none';
      
      this.cachedAvailability = result;
      return result;
    } catch (error) {
      result.unavailableReason = AR_UNAVAILABLE_REASONS.UNKNOWN;
      result.isCameraAvailable = await this.checkCameraAvailability();
      result.fallbackMode = result.isCameraAvailable ? 'camera-only' : 'card-view';
      
      this.cachedAvailability = result;
      return result;
    }
  }

  /**
   * Check if camera is available (for camera-only fallback)
   */
  private async checkCameraAvailability(): Promise<boolean> {
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    // Check permission status if available
    try {
      const permissionStatus = await navigator.permissions.query({ 
        name: 'camera' as PermissionName 
      });
      
      // If explicitly denied, camera is not available
      if (permissionStatus.state === 'denied') {
        return false;
      }

      return true;
    } catch {
      // Permissions API not supported, assume camera might be available
      return true;
    }
  }

  /**
   * Request camera permission
   * Requirements: 1.4, 1.5
   * 
   * @returns True if permission granted, false otherwise
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Stop the stream immediately - we just needed to request permission
      stream.getTracks().forEach(track => track.stop());
      
      // Update cached availability
      if (this.cachedAvailability) {
        this.cachedAvailability.isCameraAvailable = true;
        
        // If AR was unavailable due to camera, update fallback mode
        if (this.cachedAvailability.unavailableReason === AR_UNAVAILABLE_REASONS.CAMERA_DENIED) {
          this.cachedAvailability.unavailableReason = null;
          this.cachedAvailability.fallbackMode = 'camera-only';
        }
      }
      
      this.shouldFallbackToCards = false;
      return true;
    } catch (error) {
      // Permission denied or error
      if (this.cachedAvailability) {
        this.cachedAvailability.isCameraAvailable = false;
        this.cachedAvailability.unavailableReason = AR_UNAVAILABLE_REASONS.CAMERA_DENIED;
        this.cachedAvailability.fallbackMode = 'card-view';
      }
      
      this.shouldFallbackToCards = true;
      return false;
    }
  }

  /**
   * Check if should use card-based view
   * Requirements: 1.5
   * 
   * @returns True if card-based view should be used
   */
  shouldUseCardView(): boolean {
    if (this.shouldFallbackToCards) {
      return true;
    }

    if (this.cachedAvailability) {
      return this.cachedAvailability.fallbackMode === 'card-view';
    }

    // Default to card view if we haven't checked yet
    return true;
  }

  /**
   * Force fallback to card view
   * Called when user explicitly denies camera or exits AR
   */
  setCardViewFallback(): void {
    this.shouldFallbackToCards = true;
    
    if (this.cachedAvailability) {
      this.cachedAvailability.fallbackMode = 'card-view';
    }
  }

  /**
   * Reset fallback state
   * Allows re-checking availability
   */
  reset(): void {
    this.cachedAvailability = null;
    this.shouldFallbackToCards = false;
  }

  /**
   * Get the recommended view mode based on current state
   * 
   * @returns 'ar' | 'camera-only' | 'card-view'
   */
  getRecommendedViewMode(): 'ar' | 'camera-only' | 'card-view' {
    if (this.shouldFallbackToCards) {
      return 'card-view';
    }

    if (!this.cachedAvailability) {
      return 'card-view';
    }

    if (this.cachedAvailability.isARAvailable) {
      return 'ar';
    }

    if (this.cachedAvailability.isCameraAvailable) {
      return 'camera-only';
    }

    return 'card-view';
  }
}

/**
 * Singleton instance for app-wide use
 */
export const arFallbackDetector = new ARFallbackDetector();
