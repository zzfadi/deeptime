/**
 * Type declarations for webxr-polyfill
 * The package doesn't include TypeScript definitions
 */

declare module 'webxr-polyfill' {
  export default class WebXRPolyfill {
    constructor(options?: {
      allowCardboardOnDesktop?: boolean;
      cardboardConfig?: unknown;
      global?: Window;
      webvr?: boolean;
      xrCompatible?: boolean;
    });
  }
}
