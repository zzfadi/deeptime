/**
 * Type declarations for model-viewer web component
 */

declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string;
      alt?: string;
      ar?: boolean;
      'ar-modes'?: string;
      'camera-controls'?: boolean;
      'touch-action'?: string;
      'auto-rotate'?: boolean;
      style?: React.CSSProperties;
    };
  }
}
