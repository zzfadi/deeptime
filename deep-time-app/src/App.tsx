/**
 * DeepTime PWA Main App Component
 * Manages page navigation and global state initialization
 * 
 * Performance: Uses React.lazy for code splitting of non-critical pages
 * Requirements: 1.1, 1.4, 1.5 - AR as primary mode when supported, card view as fallback
 */

import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useAppStore } from './store/appStore';
import { Home } from './pages';
import { FullPageSpinner, hasApiKey, ControlPanel, FloatingControlButton } from './components';
import { useWebXRSupport, useCacheInitialization } from './hooks';
import { arFallbackDetector } from './ar/ARFallbackDetector';

// Lazy load ARView for code splitting - Three.js is a large dependency
const ARView = lazy(() => import('./components/ARView'));
const IOSARView = lazy(() => import('./components/IOSARView'));

// AIDashboard is now integrated into ControlPanel component

// Import iOS detection
import { isIOS } from './utils/iosARDetection';

// Requirement 6.1: No separate EraDetail page - all content inline in LayerExplorer
type Page = 'home' | 'ar';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [arChecked, setArChecked] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const { setOfflineStatus, setViewMode, currentEra, narrative } = useAppStore();
  const webXRSupport = useWebXRSupport();
  
  // Initialize cache on app startup
  // Requirement 10.2: Load cached content from IndexedDB on app init
  // Property 36: Cache load on startup
  const { isInitialized: cacheInitialized, cacheStats } = useCacheInitialization({
    maxEntries: 100,
    recentDays: 30,
    onComplete: (result) => {
      console.log(`[App] Cache initialized: ${result.entriesLoaded} entries loaded`);
    },
    onError: (error) => {
      console.warn(`[App] Cache initialization warning: ${error}`);
    },
  });
  
  // Log cache stats when available
  useEffect(() => {
    if (cacheStats && cacheInitialized) {
      console.log(`[App] Cache stats: ${cacheStats.totalEntries} entries, ${(cacheStats.totalSize / 1024).toFixed(1)}KB, ${(cacheStats.hitRate * 100).toFixed(1)}% hit rate`);
    }
  }, [cacheStats, cacheInitialized]);

  // Show control panel prompt on first load if no key configured
  useEffect(() => {
    if (!hasApiKey()) {
      // Delay showing panel to let the app load first
      const timer = setTimeout(() => setShowControlPanel(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Register service worker and set up offline detection
  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // Service worker registration failed - app still works
        });
      });
    }

    // Set up offline detection
    const handleOnline = () => setOfflineStatus(false);
    const handleOffline = () => setOfflineStatus(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial offline status
    setOfflineStatus(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineStatus]);

  // Check AR availability on mount and set primary mode
  // Requirements: 1.1, 1.4, 1.5 - AR as primary when supported, fallback to card view
  useEffect(() => {
    async function checkARAvailability() {
      if (arChecked) return;
      
      const availability = await arFallbackDetector.checkAvailability();
      setArChecked(true);
      
      // Set view mode based on AR availability
      if (availability.isARAvailable) {
        setViewMode('ar');
      } else {
        setViewMode('card');
      }
    }
    
    // Only check after WebXR support check is complete
    if (!webXRSupport.isChecking) {
      checkARAvailability();
    }
  }, [webXRSupport.isChecking, arChecked, setViewMode]);

  // Handle entering AR mode from LayerExplorer
  // Requirement 5.3: Transition to AR view for selected era
  // Requirement 6.1: Navigate directly to AR from LayerExplorer (no EraDetail page)
  const handleEnterAR = useCallback((layer: import('deep-time-core/types').GeologicalLayer) => {
    if (layer && webXRSupport.isARSupported) {
      // Store the selected era in app state
      useAppStore.getState().selectEra(layer);
      setCurrentPage('ar');
      setViewMode('ar');
    }
  }, [webXRSupport.isARSupported, setViewMode]);

  // Handle exiting AR mode
  // Requirement 5.4: Return to layer view with same layer expanded
  const handleARExit = useCallback(() => {
    setCurrentPage('home');
    setViewMode('card');
    arFallbackDetector.setCardViewFallback();
  }, [setViewMode]);

  // Dashboard is now integrated into the ControlPanel component
  // No separate navigation needed - it's a slide-up panel on home

  // Render current page with Suspense for lazy-loaded components
  switch (currentPage) {
    case 'ar':
      // AR view - primary mode when supported
      // Requirements: 1.1, 1.4 - AR as primary mode, fallback when not supported
      if (!currentEra) {
        // No era selected, go back to home
        setCurrentPage('home');
        return <FullPageSpinner />;
      }
      
      // Use iOS-specific AR view on iOS devices (WebXR not supported)
      const ARComponent = isIOS() ? IOSARView : ARView;
      
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-deep-900 flex items-center justify-center">
            <div className="text-center">
              <FullPageSpinner label="Loading AR experience..." />
            </div>
          </div>
        }>
          <ARComponent
            era={currentEra}
            narrative={narrative}
            onExit={handleARExit}
          />
        </Suspense>
      );

    case 'home':
    default:
      // Requirement 6.1: All layer content displayed inline in LayerExplorer
      // No separate EraDetail page navigation
      return (
        <>
          <Home onEnterAR={handleEnterAR} />
          
          {/* Unified Control Button - combines dashboard + settings */}
          <FloatingControlButton 
            onClick={() => setShowControlPanel(true)}
            isPanelOpen={showControlPanel}
          />
          
          {/* Unified Control Panel - Requirements 2.1, 2.2: Dashboard + Settings */}
          <ControlPanel
            isOpen={showControlPanel}
            onClose={() => setShowControlPanel(false)}
          />
        </>
      );
  }
}

export default App;
