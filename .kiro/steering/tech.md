# DeepTime Tech Stack

## Monorepo Structure

| Directory | Purpose |
|-----------|---------|
| `/` (root) | Core library with shared types and pure functions |
| `/deep-time-app` | React PWA application |
| `/tests` | Property-based tests for core library |

## Frontend Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety (strict mode enabled) |
| Tailwind CSS | Styling (dark theme) |
| Zustand | State management |
| Vite | Build tool and dev server |
| vite-plugin-pwa | PWA/service worker generation |

## 3D/AR Stack

| Technology | Purpose |
|------------|---------|
| Three.js | 3D rendering and WebXR |
| WebXR API | AR sessions on supported devices |
| webxr-polyfill | iOS Safari compatibility |
| model-viewer | iOS AR Quick Look fallback |
| GLTF/GLB | 3D model format |

## AI/Backend Services

| Service | Purpose |
|---------|---------|
| Google Gemini 2.5 Flash | Text and image generation |
| Veo 3.1 Fast | Video generation (4-8 second clips) |
| Firebase Hosting | Static hosting |
| Firebase Firestore | Cross-device cache sync |
| USGS Macrostrat API | Geological data |
| Nominatim | Geocoding (OpenStreetMap) |
| IndexedDB | Local caching (30-day TTL) |

## Testing

| Tool | Purpose |
|------|---------|
| Vitest | Test runner |
| fast-check | Property-based testing |

## Common Commands

```bash
# Root - Core library
npm install          # Install root dependencies
npm run build        # Build core library (tsc)
npm test             # Run property-based tests (vitest run)
npm run test:watch   # Watch mode for tests

# PWA App
cd deep-time-app
npm install          # Install app dependencies
npm run dev          # Start dev server (Vite)
npm run build        # Production build (vite build)
npm run preview      # Preview production build
npm run lint         # ESLint

# Firebase Deployment
firebase deploy --only hosting
```

## Environment Variables

Create `deep-time-app/.env` from `.env.example`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GEMINI_API_KEY=...
```

## Code Splitting

Large dependencies are split into separate chunks in Vite config:
- `vendor-react`: React, ReactDOM
- `vendor-firebase`: Firebase SDK
- `vendor-three`: Three.js
- `vendor-ai`: Gemini AI SDK
