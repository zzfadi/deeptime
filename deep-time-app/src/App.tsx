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
import { FullPageSpinner, InstallBanner, ApiKeyModal, hasApiKey } from './components';
import { useWebXRSupport, useCacheInitialization } from './hooks';
import { arFallbackDetector } from './ar/ARFallbackDetector';

// Lazy load EraDetail page for code splitting
// This reduces initial bundle size by loading EraDetail only when needed
const EraDetail = lazy(() => import('./pages/EraDetail'));

// Lazy load ARView for code splitting - Three.js is a large dependency
const ARView = lazy(() => import('./components/ARView'));
const IOSARView = lazy(() => import('./components/IOSARView'));

// Lazy load AIDashboard for code splitting
// Requirement 2.2: Navigate to dashboard view when button clicked
const AIDashboard = lazy(() => import('./components/AIDashboard'));

// Import iOS detection
import { isIOS } from './utils/iosARDetection';

type Page = 'home' | 'era-detail' | 'ar' | 'dashboard';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [arChecked, setArChecked] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(hasApiKey());
  const { setOfflineStatus, setViewMode, currentEra, narrative, isNarrativeLoading, location } = useAppStore();
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

  // Show API key prompt on first load if no key configured
  useEffect(() => {
    if (!hasApiKey()) {
      // Delay showing modal to let the app load first
      const timer = setTimeout(() => setShowApiKeyModal(true), 1500);
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

  // Navigation handlers
  const handleViewEraDetail = useCallback(() => {
    // Only navigate if we have an era and narrative is not loading
    if (currentEra && !isNarrativeLoading) {
      setCurrentPage('era-detail');
    }
  }, [currentEra, isNarrativeLoading]);

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

  // Handle navigating to dashboard
  // Requirement 2.2: Navigate to dashboard view when button clicked
  const handleDashboardClick = useCallback(() => {
    setCurrentPage('dashboard');
  }, []);

  // Handle navigating back from dashboard
  // Requirement 2.3: Back button to return to main app
  const handleDashboardBack = useCallback(() => {
    setCurrentPage('home');
  }, []);

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

    case 'era-detail':
      // If no era is selected, go back to home
      if (!currentEra) {
        setCurrentPage('home');
        return <FullPageSpinner />;
      }
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-deep-900 flex items-center justify-center">
            <FullPageSpinner label="Loading era details..." />
          </div>
        }>
          <EraDetail
            era={currentEra}
            narrative={narrative}
            isLoading={isNarrativeLoading}
            location={location}
            onBack={handleBackToHome}
            onARClick={handleARClick}
          />
        </Suspense>
      );
    
    case 'dashboard':
      // AI Dashboard view
      // Requirement 2.2: Navigate to dashboard view when button clicked
      return (
        <Suspense fallback={
          <div className="min-h-screen bg-deep-900 flex items-center justify-center">
            <FullPageSpinner label="Loading dashboard..." />
          </div>
        }>
          <AIDashboard onBack={handleDashboardBack} />
        </Suspense>
      );

    case 'home':
    default:
      return (
        <>
          <Home onViewEraDetail={handleViewEraDetail} />
          <InstallBanner />
          
          {/* Dashboard button - Requirement 2.1: Display dashboard access button */}
          <button
            onClick={handleDashboardClick}
            className="fixed bottom-4 right-20 z-40 w-12 h-12 bg-slate-800/90 hover:bg-slate-700 rounded-full flex items-center justify-center shadow-lg border border-slate-700 transition-colors"
            title="AI Dashboard"
          >
            <span className="text-xl">📊</span>
          </button>
          
          {/* Settings button - always visible */}
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="fixed bottom-4 right-4 z-40 w-12 h-12 bg-slate-800/90 hover:bg-slate-700 rounded-full flex items-center justify-center shadow-lg border border-slate-700 transition-colors"
            title="Settings"
          >
            <span className="text-xl">{apiKeyConfigured ? '⚙️' : '🔑'}</span>
          </button>
          
          {/* API Key Modal */}
          <ApiKeyModal
            isOpen={showApiKeyModal}
            onClose={() => setShowApiKeyModal(false)}
            onSave={(key) => setApiKeyConfigured(!!key)}
          />
        </>
      );
  }
}

export default App;
