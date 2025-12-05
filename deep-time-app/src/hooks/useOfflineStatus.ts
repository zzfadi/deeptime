/**
 * useOfflineStatus Hook
 * Listens for online/offline events and provides offline status
 * Requirements: 5.3, 6.3
 */

import { useState, useEffect, useCallback } from 'react';

export interface OfflineStatusResult {
  /** Whether the app is currently offline */
  isOffline: boolean;
  /** Whether the app was offline and just came back online */
  justCameOnline: boolean;
  /** Manually check and update online status */
  checkStatus: () => void;
}

/**
 * Hook to track online/offline status
 * Requirement 5.3: Display cached locations with offline indicator
 * Requirement 6.3: Display cached content via service worker when offline
 */
export function useOfflineStatus(): OfflineStatusResult {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justCameOnline, setJustCameOnline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOffline(false);
    setJustCameOnline(true);
    
    // Reset justCameOnline after a short delay
    setTimeout(() => {
      setJustCameOnline(false);
    }, 3000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setJustCameOnline(false);
  }, []);

  const checkStatus = useCallback(() => {
    const currentlyOffline = !navigator.onLine;
    if (currentlyOffline !== isOffline) {
      if (currentlyOffline) {
        handleOffline();
      } else {
        handleOnline();
      }
    }
  }, [isOffline, handleOnline, handleOffline]);

  useEffect(() => {
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also check periodically in case events are missed
    const intervalId = setInterval(checkStatus, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [handleOnline, handleOffline, checkStatus]);

  return {
    isOffline,
    justCameOnline,
    checkStatus,
  };
}

export default useOfflineStatus;
