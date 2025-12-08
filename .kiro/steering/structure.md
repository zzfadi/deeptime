# DeepTime Project Structure

## Root Directory (`/`)

Core library containing shared types and pure functions. No React dependencies.

```
src/
├── types/index.ts       # Core type definitions (GeoCoordinate, GeologicalLayer, Narrative, etc.)
├── geological/index.ts  # Layer parsing, validation, stack building
├── narrative/index.ts   # Era-based flora/fauna/climate data
├── anomaly/             # Magnetic anomaly detection
├── cache/               # Cache utilities
└── ...                  # Other domain modules

tests/
├── generators/          # fast-check arbitraries for property testing
│   └── index.ts         # Barrel export for all generators
└── [domain]/            # Property-based tests by domain
```

## PWA Application (`/deep-time-app`)

```
deep-time-app/
├── src/
│   ├── App.tsx              # Main app with page routing
│   ├── main.tsx             # Entry point, WebXR polyfill init
│   ├── index.css            # Tailwind imports
│   │
│   ├── components/          # React UI components
│   │   ├── index.ts         # Barrel exports (ARView excluded for code splitting)
│   │   └── ...
│   │
│   ├── pages/               # Page components
│   │   ├── Home.tsx         # Location selection, era cards
│   │   ├── EraDetail.tsx    # Era details with AI content
│   │   └── ErrorViews.tsx   # Error states
│   │
│   ├── ar/                  # AR module (Three.js, WebXR)
│   │   ├── index.ts         # Barrel exports
│   │   ├── ARSessionManager.ts
│   │   └── CreatureManager.ts
│   │
│   ├── services/            # External API integrations
│   │   ├── index.ts         # Barrel exports
│   │   ├── location.ts      # Geolocation + Nominatim geocoding
│   │   ├── geological.ts    # USGS API + IndexedDB cache
│   │   ├── firebase.ts      # Firestore integration
│   │   └── ai/              # AI content generation module
│   │       ├── index.ts         # Barrel exports for all AI services
│   │       ├── types.ts         # AI-specific type definitions
│   │       ├── contentOrchestrator.ts  # Main orchestrator (cache-first)
│   │       ├── textGenerator.ts        # Gemini text generation
│   │       ├── imageGenerator.ts       # Gemini image generation
│   │       ├── videoGenerator.ts       # Veo video generation
│   │       └── cacheManager.ts         # IndexedDB cache management
│   │
│   ├── store/               # Zustand state management
│   │   └── appStore.ts      # Central app state
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useWebXR.ts      # WebXR support detection
│   │   └── usePWAInstall.ts # PWA install prompt
│   │
│   └── data/                # Static data
│       └── creatures.json   # Creature manifest for AR
│
├── public/
│   ├── models/              # GLTF creature models (.glb)
│   ├── thumbnails/          # Creature thumbnail SVGs
│   └── manifest.json        # PWA manifest
│
└── vite.config.ts           # Vite + PWA config
```

## Import Patterns

```typescript
// Core types from root library
import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';

// Components use barrel exports
import { EraCard, TimeSlider } from './components';

// ARView is lazy-loaded (Three.js is large)
const ARView = lazy(() => import('./components/ARView'));

// AI services use barrel exports
import { contentOrchestrator, type EraContent } from './services/ai';
```

## Conventions

- **Barrel exports**: Each module has an `index.ts` that exports public API
- **Type exports**: Export types separately with `export type { ... }`
- **Error classes**: Custom error classes per service (e.g., `LocationError`, `AIError`)
- **Service singletons**: Services exported as singleton instances
- **JSDoc comments**: Document requirements with `@requirement` or `// Requirement X.X: ...`
