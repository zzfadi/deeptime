/**
 * LoadingSpinner Component
 * Animated spinner for loading states
 * Requirements: N/A (UX)
 */

export interface LoadingSpinnerProps {
  /** Size of the spinner: 'sm' (16px), 'md' (24px), 'lg' (40px) */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label text displayed below the spinner */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
};

/**
 * LoadingSpinner Component
 * A simple animated spinner for indicating loading states
 */
export function LoadingSpinner({ 
  size = 'md', 
  label,
  className = '' 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} border-white/20 border-t-white rounded-full animate-spin`}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && (
        <span className="text-sm text-gray-400">{label}</span>
      )}
    </div>
  );
}

/**
 * FullPageSpinner Component
 * A centered spinner that fills its container
 */
export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[200px]">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

export default LoadingSpinner;
