/**
 * iOS AR Detection Utilities
 * iOS Safari doesn't support WebXR for AR, but supports AR Quick Look
 * This utility helps detect iOS and provide appropriate AR fallbacks
 */

/**
 * Detect if the device is iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if the device is iOS Safari
 */
export function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const iOS = isIOS();
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS/.test(ua) && !/FxiOS/.test(ua);
  
  return iOS && webkit && notChrome;
}

/**
 * Check if AR Quick Look is supported (iOS 12+)
 */
export function supportsARQuickLook(): boolean {
  if (!isIOS()) return false;
  
  // Check for AR Quick Look support via anchor rel="ar"
  const a = document.createElement('a');
  return a.relList?.supports?.('ar') ?? false;
}

/**
 * Check if device has LiDAR (iPhone 12 Pro and later, iPad Pro 2020+)
 * This is a heuristic based on screen size and device capabilities
 */
export function hasLiDAR(): boolean {
  if (!isIOS()) return false;
  
  // LiDAR devices typically have higher pixel ratios and specific screen sizes
  const hasHighDPI = window.devicePixelRatio >= 3;
  const hasLargeScreen = window.screen.width >= 390; // iPhone 12 Pro and later
  
  return hasHighDPI && hasLargeScreen;
}

/**
 * Get recommended AR mode for the current device
 */
export function getRecommendedARMode(): 'webxr' | 'quicklook' | 'model-viewer' | 'none' {
  // Check for native WebXR support first
  if ('xr' in navigator && navigator.xr) {
    return 'webxr';
  }
  
  // iOS devices should use AR Quick Look or model-viewer
  if (isIOS()) {
    if (supportsARQuickLook()) {
      return 'quicklook';
    }
    return 'model-viewer';
  }
  
  // Android devices might support WebXR or model-viewer
  if (/Android/.test(navigator.userAgent)) {
    return 'model-viewer';
  }
  
  return 'none';
}

/**
 * Log device AR capabilities for debugging
 */
export function logARCapabilities(): void {
  console.log('AR Capabilities:', {
    isIOS: isIOS(),
    isIOSSafari: isIOSSafari(),
    supportsARQuickLook: supportsARQuickLook(),
    hasLiDAR: hasLiDAR(),
    hasWebXR: 'xr' in navigator,
    recommendedMode: getRecommendedARMode(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    devicePixelRatio: window.devicePixelRatio,
    screenSize: `${window.screen.width}x${window.screen.height}`,
  });
}
