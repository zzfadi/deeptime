/**
 * PWA Install Banner Component
 * Shows a banner prompting users to install the app
 * Requirements: 6.1, 6.2
 */

import { useState, useCallback } from 'react';
import { usePWAInstall } from '../hooks';

export interface InstallBannerProps {
  /** Optional callback when install is accepted */
  onInstalled?: () => void;
  /** Optional callback when banner is dismissed */
  onDismissed?: () => void;
}

/**
 * Install Banner Component
 * 
 * Requirements:
 * - 6.1: Prompt for home screen installation
 * - 6.2: Launch in standalone mode without browser chrome
 */
export function InstallBanner({ onInstalled, onDismissed }: InstallBannerProps) {
  const { canInstall, isStandalone, isIOS, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = useCallback(async () => {
    setIsInstalling(true);
    const accepted = await promptInstall();
    setIsInstalling(false);
    
    if (accepted) {
      onInstalled?.();
    }
  }, [promptInstall, onInstalled]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismissed?.();
  }, [onDismissed]);

  // Don't show if already installed, dismissed, or can't install
  if (isStandalone || isDismissed) {
    return null;
  }

  // Show iOS-specific instructions
  if (isIOS && !canInstall) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-deep-800 border-t border-deep-600 p-4 safe-bottom z-50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-deep-700 flex items-center justify-center">
            <span className="text-xl">📱</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">Install DeepTime</p>
            <p className="text-gray-400 text-xs mt-1">
              Tap <span className="inline-flex items-center">
                <svg className="w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L12 14M12 14L8 10M12 14L16 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 14V20H20V14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span> then "Add to Home Screen"
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-white"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Show install prompt for Android/Chrome
  if (canInstall) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-deep-800 border-t border-deep-600 p-4 safe-bottom z-50">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
            <span className="text-xl">🌍</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">Install DeepTime</p>
            <p className="text-gray-400 text-xs">Add to home screen for the best experience</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-gray-400 hover:text-white text-sm"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {isInstalling ? 'Installing...' : 'Install'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default InstallBanner;
