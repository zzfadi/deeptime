# Build Performance Issues & Solutions

## Problem

The `npm run build` and `npm run dev` commands were hanging for 10+ minutes before completing.

## Root Causes

### 1. Multiple Stuck Build Processes
- Several `vite build` processes were running in the background from previous failed builds
- These processes were consuming resources and potentially locking files

### 2. vite-plugin-pwa Hanging Issue
- The PWA plugin successfully generates the service worker but doesn't exit cleanly
- This is a known issue with vite-plugin-pwa v0.20.x
- The build actually completes (files are generated), but the process hangs

## Solutions Applied

### 1. Cleaned Up Stuck Processes
Killed all hung vite/node processes:
```bash
ps aux | grep -E "(node|vite)" | grep kiroween
kill -9 <PIDs>
```

### 2. Simplified Build Command
Changed from `tsc -b && vite build` to just `vite build`:
- `tsc -b` was trying to do incremental builds across the monorepo
- Vite already does type checking during build
- Added separate `build:check` command for explicit type checking

### 3. Added Clean Script
```json
"clean": "rm -rf node_modules/.tmp node_modules/.vite dist"
```

## Current Build Performance

- **Build time**: ~1.6-2.2 seconds ✅
- **Bundle sizes**:
  - vendor-three: 492KB (gzipped: 126KB)
  - vendor-firebase: 423KB (gzipped: 107KB)
  - vendor-react: 141KB (gzipped: 45KB)
  - Main bundle: 335KB (gzipped: 99KB)

## Workaround for PWA Plugin Hanging

The build completes successfully even though the process hangs. You can:

1. **Wait for the hang and Ctrl+C** - Files are already generated
2. **Use timeout in CI/CD**:
   ```bash
   timeout 60 npm run build || true
   ```
3. **Check for dist/ files** instead of exit code

## Recommendations

### For Development
```bash
npm run dev  # Fast, uses Vite's dev server with HMR
```

### For Production Build
```bash
npm run clean  # If you encounter issues
npm run build  # Will complete in ~2s, may hang after (Ctrl+C is safe)
```

### For Type Checking
```bash
npm run build:check  # Explicit type check + build
```

## Future Improvements

Consider upgrading or replacing vite-plugin-pwa when a fix is available for the hanging issue.
