/**
 * Pages Index
 * Exports all page components for the DeepTime PWA
 * 
 * Note: EraDetail is NOT exported here to enable code splitting.
 * Import it directly with React.lazy() in App.tsx
 */

export { Home } from './Home';
export type { HomeProps } from './Home';

// EraDetail is lazy-loaded in App.tsx for code splitting
// Only export the type for type checking
export type { EraDetailProps } from './EraDetail';

export { GPSDeniedView, APIErrorView, OfflineView } from './ErrorViews';
