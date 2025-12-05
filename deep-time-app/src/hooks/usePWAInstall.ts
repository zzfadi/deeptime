/**
 * PWA Install Hook
 * Handles the PWA installation prompt and standalone mode detection
 * Requirements: 6.1, 6.2
 */

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallState {
  /** Whether the install prompt is available */
  canInstall: boolean;
  /** Whether the app is running in standalone mode (installed) */
  isStandalone: boolean;
  /** Whether the app is running on iOS */
  isIOS: boolean;
  /** Trigger the install prompt */
  promptInstall: () => Promise<boolean>;
}

/**
 * Hook to manage PWA installation
 * 
 * Requirements:
 * - 6.1: Prompt for home screen installation
 * - 6.2: Launch in standalone mode without browser chrome
 */
export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const standalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error - iOS Safari specific property
        window.navigator.standalone === true;
      setIsStandalone(standalone);
    };

    // Check if iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
    };

    checkStandalone();
    checkIOS();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    // Clear the deferred prompt
    setDeferredPrompt(null);

    return outcome === 'accepted';
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null,
    isStandalone,
    isIOS,
    promptInstall,
  };
}

export default usePWAInstall;
