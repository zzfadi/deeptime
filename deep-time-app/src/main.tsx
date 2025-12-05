import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize WebXR Polyfill for iOS Safari and other browsers without native WebXR support
// This enables AR features on iOS devices
import WebXRPolyfill from 'webxr-polyfill';

// Only initialize polyfill if WebXR is not natively supported
if (!('xr' in navigator)) {
  const polyfill = new WebXRPolyfill();
  console.log('WebXR Polyfill initialized:', polyfill);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
