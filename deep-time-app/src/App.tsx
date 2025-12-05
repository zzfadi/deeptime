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
import { FullPageSpinner, InstallBanner } from './components';
import { useWebXRSupport } from './hooks';
import { arFallbackDetector } from './ar/ARFallbackDetector';

// Lazy load EraDetail page for code splitting
// This reduces initial bundle size by loading EraDetail only when needed
const EraDetail = lazy(() => import('./pages/EraDetail'));

// Lazy load ARView for code splitting - Three.js is a large dependency
const ARView = lazy(() => import('./components/ARView'));

type Page = 'home' | 'era-detail' | 'ar';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [arChecked, setArChecked] = useState(false);
  const { setOfflineStatus, setViewMode, currentEra, narrative, isNarrativeLoading } = useAppStore();
  const webXRSupport = useWebXRSupport();

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

  // Navigation handlers
  const handleViewEraDetail = useCallback(() => {
    if (currentEra) {
      setCurrentPage('era-detail');
    }
  }, [currentEra]);

  const handleBackToHome = useCallback(() => {
    setCurrentPage('home');
    setViewMode('card');
  }, [setViewMode]);

  // Handle entering AR mode from card view
  // Requirements: 1.1 - AR as primary mode when supported
  const handleARClick = useCallback(() => {
    if (currentEra && webXRSupport.isARSupported) {
      setCurrentPage('ar');
      setViewMode('ar');
    }
  }, [currentEra, webXRSupport.isARSupported, setViewMode]);

  // Handle exiting AR mode
  const handleARExit = useCallback(() => {
    setCurrentPage('era-detail');
    setViewMode('card');
    arFallbackDetector.setCardViewFallback();
  }, [setViewMode]);

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
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-deep-900 flex items-center justify-center">
            <div className="text-center">
              <FullPageSpinner label="Loading AR experience..." />
            </div>
          </div>
        }>
          <ARView
            era={currentEra}
            narrative={narrative}
            onExit={handleARExit}
          />
        </Suspense>
      );

    case 'era-detail':
      return (
        <Suspense fallback={<FullPageSpinner />}>
          <EraDetail
            era={currentEra}
            narrative={narrative}
            isLoading={isNarrativeLoading}
            onBack={handleBackToHome}
            onARClick={handleARClick}
          />
        </Suspense>
      );
    
    case 'home':
    default:
      return (
        <>
          <Home onViewEraDetail={handleViewEraDetail} />
          <InstallBanner />
        </>
      );
  }
}

export default App;
