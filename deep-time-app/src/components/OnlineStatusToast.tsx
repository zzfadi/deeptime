/**
 * OnlineStatusToast Component
 * Shows a toast notification when the app comes back online
 * Requirements: 5.3, 6.3
 */

import { useEffect, useState } from 'react';

export interface OnlineStatusToastProps {
  /** Whether the app just came back online */
  justCameOnline: boolean;
  /** Whether the app is currently offline */
  isOffline: boolean;
}

/**
 * Toast notification for online/offline status changes
 * Requirement 5.3: Display cached locations with offline indicator
 * Requirement 6.3: Display cached content via service worker when offline
 */
export function OnlineStatusToast({ justCameOnline, isOffline }: OnlineStatusToastProps) {
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  // Show "back online" toast
  useEffect(() => {
    if (justCameOnline) {
      setShowOnlineToast(true);
      const timer = setTimeout(() => {
        setShowOnlineToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [justCameOnline]);

  // Show "offline" toast when going offline
  useEffect(() => {
    if (isOffline) {
      setShowOfflineToast(true);
      const timer = setTimeout(() => {
        setShowOfflineToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineToast(false);
    }
  }, [isOffline]);

  if (!showOnlineToast && !showOfflineToast) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50 px-4 animate-slide-up">
      {showOnlineToast && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Back online</span>
        </div>
      )}
      
      {showOfflineToast && !showOnlineToast && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg shadow-lg">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
          </svg>
          <span className="font-medium">You're offline - using cached data</span>
        </div>
      )}
    </div>
  );
}

export default OnlineStatusToast;
