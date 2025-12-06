# DeepTime Project Structure

## Root Directory (`/`)

Core library containing shared types and pure functions. No React dependencies.

```
src/
├── types/index.ts       # Core type definitions (GeoCoordinate, GeologicalLayer, Narrative, etc.)
├── geological/index.ts  # Layer parsing, validation, stack building
├── narrative/index.ts   # Era-based flora/fauna/climate data, narrative generation
├── anomaly/             # Magnetic anomaly detection
├── cache/               # Cache utilities
└── ...                  # Other domain modules

tests/
├── generators/          # fast-check generators for property testing
└── anomaly/             # Property-based tests
```

## PWA Application (`/deep-time-app`)

React application with all UI, services, and AR functionality.

```
deep-time-app/
├── src/
│   ├── App.tsx              # Main app with page routing
│   ├── main.tsx             # Entry point, WebXR polyfill init
│   ├── index.css            # Tailwind imports
│   │
│   ├── components/          # React UI components
│   │   ├── index.ts         # Barrel exports (ARView excluded for code splitting)
│   │   ├── ARView.tsx       # WebXR AR experience (lazy loaded)
│   │   ├── AROverlay.tsx    # AR UI overlay
│   │   ├── ARTimeSlider.tsx # Time slider for AR mode
│   │   ├── EraCard.tsx      # Era display card
│   │   ├── TimeSlider.tsx   # Main time navigation slider
│   │   └── ...
│   │
│   ├── pages/               # Page components
│   │   ├── Home.tsx         # Location selection, era cards
│   │   ├── EraDetail.tsx    # Era details with narrative
│   │   └── ErrorViews.tsx   # Error states
│   │
│   ├── ar/                  # AR module
│   │   ├── index.ts         # Barrel exports
│   │   ├── ARSessionManager.ts
│   │   ├── CreatureManager.ts
│   │   ├── CreatureInteraction.ts
│   │   ├── EraTransitionController.ts
│   │   ├── TransitionShaders.ts
│   │   └── types.ts
│   │
│   ├── services/            # External API integrations
│   │   ├── index.ts         # Barrel exports
│   │   ├── location.ts      # Geolocation + Nominatim geocoding
│   │   ├── geological.ts    # USGS API + IndexedDB cache
│   │   ├── narrative.ts     # Gemini AI narrative generation
│   │   ├── firebase.ts      # Firestore integration
│   │   ├── cache.ts         # IndexedDB local cache
│   │   └── haptics.ts       # Vibration feedback
│   │
│   ├── store/               # Zustand state management
│   │   └── appStore.ts      # Central app state
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useWebXR.ts      # WebXR support detection
│   │   ├── usePWAInstall.ts # PWA install prompt
│   │   └── ...
│   │
│   ├── data/                # Static data
│   │   └── creatures.json   # Creature manifest for AR
│   │
│   └── config/              # Configuration
│       └── aiModels.ts      # Gemini model config
│
├── public/
│   ├── models/              # GLTF creature models (.glb)
│   ├── thumbnails/          # Creature thumbnail SVGs
│   └── manifest.json        # PWA manifest
│
└── vite.config.ts           # Vite + PWA config with code splitting
```

## Import Patterns

- Core types: `import type { GeoCoordinate } from 'deep-time-core/types'`
- Core functions: `import { parseGeologicalResponse } from 'deep-time-core/geological'`
- Components use barrel exports: `import { EraCard, TimeSlider } from './components'`
- ARView is lazy-loaded: `const ARView = lazy(() => import('./components/ARView'))`

## Code Splitting

Large dependencies are split into separate chunks:
- `vendor-react`: React, ReactDOM
- `vendor-firebase`: Firebase SDK
- `vendor-three`: Three.js
- `vendor-ai`: Gemini AI SDK
