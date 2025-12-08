/**
 * UI Components Index
 * Exports all UI components for the DeepTime PWA
 * 
 * Note: ARView is NOT exported here to enable code splitting.
 * Import it directly with React.lazy() where needed.
 */

export { LocationHeader } from './LocationHeader';
export type { LocationHeaderProps } from './LocationHeader';

export { TimeSlider, formatYearsAgo, mapTimeToEra, getEraColor } from './TimeSlider';
export type { TimeSliderProps, EraBoundary, TransitionState } from './TimeSlider';

export { EraCard, getEraBackground, getEraIcon } from './EraCard';
export type { EraCardProps } from './EraCard';

export { LoadingSpinner, FullPageSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';

// ARView is lazy-loaded in EraDetail.tsx for code splitting (Three.js is large)
// Only export the type for type checking
export type { ARViewProps } from './ARView';

export { OnlineStatusToast } from './OnlineStatusToast';
export type { OnlineStatusToastProps } from './OnlineStatusToast';

export { InstallBanner } from './InstallBanner';
export type { InstallBannerProps } from './InstallBanner';

export { NarrationToast } from './NarrationToast';
export type { NarrationToastProps } from './NarrationToast';

// AR UI Overlay components - Requirements: 6.1, 6.2, 6.3
export { ARTimeSlider } from './ARTimeSlider';
export type { ARTimeSliderProps, AREraBoundary } from './ARTimeSlider';

export { AROverlay } from './AROverlay';
export type { AROverlayProps } from './AROverlay';

// API Key Modal for runtime Gemini key configuration
export {
  ApiKeyModal,
  getStoredApiKey,
  storeApiKey,
  clearApiKey,
  hasApiKey,
  getActiveApiKey
} from './ApiKeyModal';
export type { default as ApiKeyModalProps } from './ApiKeyModal';

export { VideoExtensionUI } from './VideoExtensionUI';
export type { VideoExtensionUIProps } from './VideoExtensionUI';

// AI Dashboard for usage metrics - Requirements: 1.1, 1.2, 1.3
export { AIDashboard, calculateCacheHitRate, transformToDashboardMetrics } from './AIDashboard';
export type { AIDashboardProps } from './AIDashboard';

// Unified Control Panel (Dashboard + Settings) - Mobile-first design
export { ControlPanel } from './ControlPanel';
export type { ControlPanelProps } from './ControlPanel';

export { FloatingControlButton } from './FloatingControlButton';
export type { FloatingControlButtonProps } from './FloatingControlButton';

// AI-generated Fossil Glyph icons for eras
export { FossilGlyph } from './FossilGlyph';
export type { FossilGlyphProps } from './FossilGlyph';



// LayerCard - Simplified mobile UI - Requirements: 1.2, 2.1, 2.3, 2.4, 4.1
export { LayerCard, getEraColor as getLayerEraColor } from './LayerCard';
export type { LayerCardProps, LayerCardState } from './LayerCard';

// LayerExplorer - Main container for layer exploration - Requirements: 1.1, 1.3, 2.2
export { LayerExplorer } from './LayerExplorer';
export type { LayerExplorerProps, LayerExplorerState } from './LayerExplorer';
