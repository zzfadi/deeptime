# DeepTime Tech Stack

## Monorepo Structure

- **Root (`/`)**: Core library with shared types and utilities
- **`/deep-time-app`**: React PWA application

## Frontend Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling (dark theme, custom colors) |
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

## Backend/Services

| Service | Purpose |
|---------|---------|
| Firebase Hosting | Static hosting |
| Firebase Firestore | Cross-device cache sync |
| Google Gemini 2.5 | AI narrative generation |
| USGS Macrostrat API | Geological data |
| Nominatim | Geocoding (OpenStreetMap) |
| IndexedDB (Dexie.js pattern) | Local caching |

## Common Commands

```bash
# Root - Core library
npm install          # Install root dependencies
npm run build        # Build core library (tsc)
npm test             # Run property-based tests (vitest)

# PWA App
cd deep-time-app
npm install          # Install app dependencies
npm run dev          # Start dev server (Vite)
npm run build        # Production build (tsc + vite)
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

## Key Dependencies

- `@google/generative-ai`: Gemini API client
- `firebase`: Firestore and hosting
- `three`: 3D graphics
- `zustand`: Lightweight state management
- `fast-check`: Property-based testing
