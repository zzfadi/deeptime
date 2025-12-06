/**
 * EraDetail Page Component
 * Full detailed view of a geological era with AI-generated narrative, image, video, and AR option
 * Requirements: 2.2, 3.1, 4.1, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5, 12.1, 12.2, 12.3, 12.4, 12.5
 * 
 * Performance: ARView is lazy loaded to reduce bundle size (Three.js is large)
 * 
 * Key Features:
 * - Uses ContentOrchestrator for AI content generation
 * - Progressive loading: text → image → video
 * - Refresh button with cache invalidation
 * - Async video loading with polling
 */

import { useCallback, useState, useEffect, lazy, Suspense, useRef, useMemo } from 'react';
import type { GeoCoordinate, GeologicalLayer, Narrative } from 'deep-time-core/types';
import { formatYearsAgo, getEraBackground, getEraIcon, LoadingSpinner, VideoExtensionUI } from '../components';
import { useWebXRSupport } from '../hooks';
import { contentOrchestrator } from '../services/ai/contentOrchestrator';
import type { EraContent, GeneratedImage, GeneratedVideo, VideoOperation, EnhancedNarrative } from '../services/ai/types';
import { videoGenerator } from '../services/ai/videoGenerator';
import { useAppStore } from '../store/appStore';

// Lazy load ARView component - Three.js is a large dependency
const ARView = lazy(() => import('../components/ARView'));
const IOSARView = lazy(() => import('../components/IOSARView'));

// Import iOS detection
import { isIOS } from '../utils/iosARDetection';

export interface EraDetailProps {
  /** The geological layer/era to display */
  era: GeologicalLayer | null;
  /** The narrative for this era (fallback if AI content not available) */
  narrative: Narrative | null;
  /** Whether the narrative is loading */
  isLoading: boolean;
  /** User's current location */
  location?: GeoCoordinate | null;
  /** Callback to go back to home */
  onBack: () => void;
  /** Callback when AR button is clicked (optional, for external handling) */
  onARClick?: () => void;
}




// ============================================
// Sub-Components
// ============================================

/**
 * Back button component
 */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-2 -ml-2 text-gray-300 hover:text-white transition-colors touch-target"
      aria-label="Go back"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="text-sm">Back</span>
    </button>
  );
}


/**
 * Refresh button component
 * Requirement 6.1: Display a refresh button for regenerating content
 */
function RefreshButton({
  onClick,
  isRefreshing,
  disabled
}: {
  onClick: () => void;
  isRefreshing: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isRefreshing}
      className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white bg-deep-700/50 hover:bg-deep-600/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Refresh content"
      title="Generate new AI content"
    >
      <svg
        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span className="text-sm">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
    </button>
  );
}

/**
 * AR button component
 * Requirement 4.4: Offer AR view option
 */
function ARButton({ onClick, disabled, variant = 'default' }: {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'prominent';
}) {
  const baseClasses = "flex items-center gap-2 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-target";
  const variantClasses = variant === 'prominent'
    ? "px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 shadow-lg hover:shadow-xl transform hover:scale-105"
    : "px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses}`}
      aria-label="Enter AR experience"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      <span className="font-medium">Enter AR</span>
    </button>
  );
}


/**
 * Loading skeleton for EraDetail
 */
function EraDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-deep-900 text-white">
      <header className="px-4 py-3 safe-top">
        <BackButton onClick={onBack} />
      </header>

      <div className="p-4 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full skeleton" />
          <div className="flex-1">
            <div className="h-6 w-40 skeleton mb-2" />
            <div className="h-4 w-32 skeleton" />
          </div>
        </div>

        {/* Description skeleton */}
        <div className="space-y-3 mb-6">
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-5/6 skeleton" />
          <div className="h-4 w-4/6 skeleton" />
        </div>

        {/* Image skeleton */}
        <div className="h-48 w-full skeleton rounded-xl mb-6" />

        {/* Climate skeleton */}
        <div className="h-32 w-full skeleton rounded-xl mb-6" />

        {/* Flora/Fauna skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 skeleton rounded-xl" />
          <div className="h-40 skeleton rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Loading overlay for refresh
 * Requirement 6.4: Display old content with loading indicator overlay
 */
function RefreshOverlay() {
  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="text-white text-sm mt-2">Generating new content...</p>
      </div>
    </div>
  );
}


/**
 * Location context display
 * Shows the location-specific context for the narrative
 */
function LocationContextDisplay({ locationContext }: { locationContext?: EnhancedNarrative['locationContext'] }) {
  if (!locationContext) return null;

  return (
    <div className="bg-blue-900/20 rounded-xl p-4 mb-6 border border-blue-500/20">
      <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
        <span>📍</span> Location Context
      </h3>
      <p className="text-gray-300 text-sm">{locationContext.placeName}</p>
      {locationContext.geologicalFeatures.length > 0 && (
        <p className="text-gray-400 text-xs mt-1">
          Features: {locationContext.geologicalFeatures.join(', ')}
        </p>
      )}
    </div>
  );
}

/**
 * Generated image display with explicit generation button
 * User must click to generate - no auto-loading
 */
function GeneratedImageDisplay({
  image,
  isLoading,
  onGenerate,
  error,
}: {
  image: GeneratedImage | null;
  isLoading: boolean;
  onGenerate?: () => void;
  error?: string | null;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blobError, setBlobError] = useState<boolean>(false);

  useEffect(() => {
    if (image?.imageData) {
      // Validate the blob - check if it has valid size
      if (image.imageData.size > 0) {
        const url = URL.createObjectURL(image.imageData);
        setImageUrl(url);
        setBlobError(false);
        return () => URL.revokeObjectURL(url);
      } else {
        // Blob is empty/invalid (common after page reload from corrupted cache)
        console.warn('[ImageCard] Image blob is empty or invalid, size:', image.imageData.size);
        setBlobError(true);
        setImageUrl(null);
      }
    }
    return undefined;
  }, [image]);

  // Show error state with friendly message
  if (error) {
    return (
      <div className="bg-red-900/20 rounded-xl p-6 mb-6 text-center border border-red-500/30">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-red-300 text-sm mb-2">Oops! We couldn't create the image</p>
        <p className="text-gray-400 text-xs mb-4">{error}</p>
        <button
          onClick={onGenerate}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show message when cached blob is corrupted
  if (blobError && image) {
    return (
      <div className="bg-yellow-900/20 rounded-xl p-6 mb-6 text-center border border-yellow-500/30">
        <div className="text-4xl mb-3">🔄</div>
        <p className="text-yellow-300 text-sm mb-2">Cached image needs refresh</p>
        <p className="text-gray-400 text-xs mb-4">The saved image data was corrupted. Click to regenerate.</p>
        <button
          onClick={onGenerate}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm"
        >
          Regenerate Image
        </button>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-deep-700/50 rounded-xl p-8 mb-6 text-center">
        <LoadingSpinner size="md" />
        <p className="text-gray-300 text-sm mt-3">Creating a visualization of this era...</p>
        <p className="text-gray-500 text-xs mt-1">This usually takes 5-10 seconds</p>
      </div>
    );
  }

  // Show image if available
  if (imageUrl) {
    return (
      <div className="mb-6 rounded-xl overflow-hidden shadow-lg">
        <img
          src={imageUrl}
          alt="AI-generated era visualization"
          className="w-full h-auto object-cover"
          loading="lazy"
        />
        <div className="bg-deep-800/80 px-3 py-2 text-xs text-gray-400">
          AI-generated visualization • {image?.modelUsed}
        </div>
      </div>
    );
  }

  // Show generate button (default state)
  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-6 mb-6 text-center border border-blue-500/20">
      <div className="text-4xl mb-3">🎨</div>
      <h4 className="text-white font-medium mb-2">Visualize This Era</h4>
      <p className="text-gray-400 text-sm mb-4">
        Generate an AI image showing what this location looked like millions of years ago
      </p>
      <button
        onClick={onGenerate}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
      >
        ✨ Generate Image
      </button>
    </div>
  );
}


/**
 * Generated video display with explicit generation button
 * User must click to generate - no auto-loading
 */
function GeneratedVideoDisplay({
  video,
  videoOperation,
  isLoading,
  onGenerate,
  onPoll,
  onExtend,
  isExtending,
  extensionError,
  era,
  placeName,
  error,
}: {
  video: GeneratedVideo | null;
  videoOperation?: VideoOperation;
  isLoading: boolean;
  onGenerate?: () => void;
  onPoll?: () => void;
  onExtend?: (prompt: string) => void;
  isExtending?: boolean;
  extensionError?: string | null;
  era?: GeologicalLayer;
  placeName?: string;
  error?: string | null;
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hasEnded, setHasEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (video?.videoData) {
      const url = URL.createObjectURL(video.videoData);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [video]);

  // Poll for video completion if operation is in progress
  useEffect(() => {
    if (videoOperation && (videoOperation.status === 'pending' || videoOperation.status === 'processing')) {
      const interval = setInterval(() => {
        onPoll?.();
      }, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [videoOperation, onPoll]);

  // Show error state with friendly message
  if (error) {
    return (
      <div className="bg-red-900/20 rounded-xl p-6 mb-6 text-center border border-red-500/30">
        <div className="text-4xl mb-3">🎬</div>
        <p className="text-red-300 text-sm mb-2">Video generation didn't work this time</p>
        <p className="text-gray-400 text-xs mb-4">{error}</p>
        <button
          onClick={onGenerate}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show video operation progress
  if (videoOperation && (videoOperation.status === 'pending' || videoOperation.status === 'processing')) {
    return (
      <div className="bg-purple-900/20 rounded-xl p-8 mb-6 text-center border border-purple-500/20">
        <LoadingSpinner size="md" />
        <p className="text-gray-300 text-sm mt-3">
          Creating your video... {videoOperation.progress}%
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Video generation takes 20-30 seconds. Hang tight!
        </p>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-purple-900/20 rounded-xl p-8 mb-6 text-center border border-purple-500/20">
        <LoadingSpinner size="md" />
        <p className="text-gray-300 text-sm mt-3">Starting video generation...</p>
      </div>
    );
  }

  // Show video if available
  if (videoUrl && video) {
    return (
      <div className="mb-6 space-y-4">
        <div className="rounded-xl overflow-hidden shadow-lg">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            muted
            playsInline
            className="w-full h-auto"
            onEnded={() => setHasEnded(true)}
          />
          <div className="bg-deep-800/80 px-3 py-2 text-xs text-gray-400">
            AI-generated video • {video.duration}s • {video.modelUsed}
            {video.extensionCount ? ` • ${video.extensionCount} extension(s)` : ''}
          </div>
        </div>

        {/* Show extension UI after video ends or if user has seen the video */}
        {hasEnded && era && placeName && onExtend && (
          <VideoExtensionUI
            video={video}
            era={era}
            placeName={placeName}
            onExtend={onExtend}
            isExtending={isExtending ?? false}
            error={extensionError}
          />
        )}
      </div>
    );
  }

  // Show generate button (default state)
  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-6 mb-6 text-center border border-purple-500/20">
      <div className="text-4xl mb-3">🎬</div>
      <h4 className="text-white font-medium mb-2">Bring This Era to Life</h4>
      <p className="text-gray-400 text-sm mb-4">
        Generate a short AI video showing the prehistoric landscape in motion
      </p>
      <button
        onClick={onGenerate}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all font-medium shadow-lg hover:shadow-xl"
      >
        🎥 Generate Video
      </button>
      <p className="text-gray-500 text-xs mt-3">Takes about 20-30 seconds</p>
    </div>
  );
}


/**
 * Climate information card
 */
function ClimateCard({ climate }: { climate: Narrative['climate'] }) {
  if (!climate) return null;

  return (
    <div className="bg-deep-700/50 rounded-xl p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>🌡️</span> Climate Conditions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-deep-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Temperature</div>
          <div className="text-white font-medium">{climate.temperature}</div>
        </div>
        <div className="bg-deep-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Humidity</div>
          <div className="text-white font-medium">{climate.humidity}</div>
        </div>
        <div className="bg-deep-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Atmosphere</div>
          <div className="text-white font-medium">{climate.atmosphere}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Flora list component
 */
function FloraList({ flora }: { flora: string[] }) {
  if (!flora || flora.length === 0) return null;

  return (
    <div className="bg-green-900/20 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
        <span>🌿</span> Flora
      </h3>
      <ul className="space-y-2">
        {flora.map((plant, index) => (
          <li key={index} className="flex items-start gap-2 text-gray-200">
            <span className="text-green-500 mt-1">•</span>
            <span>{plant}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Fauna list component
 */
function FaunaList({ fauna }: { fauna: string[] }) {
  if (!fauna || fauna.length === 0) return null;

  return (
    <div className="bg-amber-900/20 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
        <span>🦎</span> Fauna
      </h3>
      <ul className="space-y-2">
        {fauna.map((creature, index) => (
          <li key={index} className="flex items-start gap-2 text-gray-200">
            <span className="text-amber-500 mt-1">•</span>
            <span>{creature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Error toast component
 * Requirement 6.5: Display error message on refresh failure
 */
function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-red-900/90 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
      <span className="text-sm">{message}</span>
      <button onClick={onDismiss} className="text-white/70 hover:text-white ml-4">
        ✕
      </button>
    </div>
  );
}


// ============================================
// Main Component
// ============================================

/**
 * EraDetail Page
 * Full detailed view of a geological era with AI-generated content
 * 
 * Requirements:
 * - 2.2: Display era-appropriate description with flora, fauna, and climate
 * - 3.1: Generate or retrieve cached image showing era's landscape
 * - 4.1: Generate or retrieve cached 4-6 second video
 * - 4.4: Offer AR view option when WebXR is supported
 * - 4.5: Gracefully fall back to 2D card-based visualization when WebXR not supported
 * - 6.1: Display refresh button for regenerating content
 * - 6.2: Invalidate cached content on refresh
 * - 6.3: Generate new content with varied prompts
 * - 6.4: Display old content with loading indicator overlay
 * - 6.5: Retain existing cached content and display error on refresh failure
 * - 12.1: Detect connection speed and data saver preferences
 * - 12.2: Load text content first on slow connections
 * - 12.3: Show placeholders for images and videos with "Load" buttons
 * - 12.4: Fetch and display specific media on tap
 * - 12.5: Display cached media immediately regardless of connection speed
 */
export function EraDetail({
  era,
  narrative: fallbackNarrative,
  location,
  onBack,
  onARClick,
}: EraDetailProps) {
  const webXRSupport = useWebXRSupport();
  const [isARActive, setIsARActive] = useState(false);

  // Use store for AI content persistence across era switches
  const {
    getEraAIContent,
    setEraAIContent,
  } = useAppStore();

  // Get cached content from store (persists across era switches)
  const eraId = era?.id ?? '';
  const storedContent = useMemo(() => getEraAIContent(eraId), [getEraAIContent, eraId]);

  // Use stored content directly for display (avoids stale state on era switch)
  // Local state is only used for updates during the current era's lifecycle
  const [localAiContent, setLocalAiContent] = useState<EraContent | null>(null);
  const [localVideoOperation, setLocalVideoOperation] = useState<VideoOperation | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Media generation state
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);

  // Track if content was loaded from cache
  const contentFromCacheRef = useRef(false);

  // Derive actual content: prefer stored content, fall back to local state
  // This ensures immediate display when switching to an era with cached content
  const aiContent = storedContent?.content ?? localAiContent;
  const videoOperation = storedContent?.videoOperation ?? localVideoOperation;

  // Sync local state when switching eras
  useEffect(() => {
    if (!eraId) return;

    const stored = getEraAIContent(eraId);
    if (stored) {
      // Content exists in store - sync local state
      setLocalAiContent(stored.content);
      setLocalVideoOperation(stored.videoOperation);
      contentFromCacheRef.current = stored.fromCache;
    } else {
      // Reset for new era that hasn't been loaded yet
      setLocalAiContent(null);
      setLocalVideoOperation(undefined);
      contentFromCacheRef.current = false;
    }
    // Clear errors when switching eras
    setError(null);
    setImageError(null);
    setVideoError(null);
  }, [eraId, getEraAIContent]);

  // NOTE: We do NOT auto-load AI content here anymore.
  // The text narrative is already available from the Home page (passed as fallbackNarrative).
  // Images and videos are only generated when the user explicitly clicks the generate buttons.
  // This provides a better UX and saves API costs.

  // Handle refresh button click
  // Requirement 6.2: Invalidate cached content for specific era
  // Requirement 6.3: Generate new content with varied prompts
  const handleRefresh = useCallback(async () => {
    if (!era || !location || isRefreshing) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const result = await contentOrchestrator.refreshContent(location, era);
      setLocalAiContent(result.content);
      setLocalVideoOperation(result.videoOperation);
      contentFromCacheRef.current = false;

      // Update store with refreshed content
      setEraAIContent(era.id, {
        content: result.content,
        videoOperation: result.videoOperation,
        fromCache: false,
        loadedAt: Date.now(),
      });
    } catch (err) {
      // Requirement 6.5: Retain existing cached content and display error
      console.error('[EraDetail] Refresh failed:', err);
      setError('Failed to refresh content. Keeping existing content.');
    } finally {
      setIsRefreshing(false);
    }
  }, [era, location, isRefreshing, setEraAIContent]);

  // Handle image generation request
  const handleGenerateImage = useCallback(async () => {
    if (!era || !location || isImageLoading) return;

    setIsImageLoading(true);
    setImageError(null);

    try {
      const result = await contentOrchestrator.getContent(location, era, {
        skipVideo: true,
        useFallbackOnError: false, // Don't use fallback - show error instead
      });

      if (!result.content.image) {
        throw new Error('No image was generated. The AI service may be temporarily unavailable.');
      }

      const updatedContent = aiContent ? { ...aiContent, image: result.content.image } : result.content;
      setLocalAiContent(updatedContent);

      // Update store with new image
      setEraAIContent(era.id, {
        content: updatedContent,
        videoOperation,
        fromCache: false,
        loadedAt: Date.now(),
      });
    } catch (err) {
      console.error('[EraDetail] Failed to generate image:', err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';

      // Provide friendly, educational error messages
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        setImageError('The AI is a bit busy right now. Please wait a moment and try again.');
      } else if (errorMessage.includes('API key') || errorMessage.includes('unauthorized')) {
        setImageError('There\'s an issue with the AI configuration. Please check your API key in settings.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setImageError('Couldn\'t connect to the AI service. Please check your internet connection.');
      } else {
        setImageError('The AI couldn\'t create an image this time. This can happen occasionally - please try again!');
      }
    } finally {
      setIsImageLoading(false);
    }
  }, [era, location, isImageLoading, aiContent, videoOperation, setEraAIContent]);


  // Handle video generation request
  const handleGenerateVideo = useCallback(async () => {
    if (!era || !location || isVideoLoading) return;

    setIsVideoLoading(true);
    setVideoError(null);

    try {
      // Check if we already have content with a narrative
      // If yes, generate video directly using the existing narrative
      if (aiContent?.narrative) {
        console.log('[EraDetail] Generating video with existing narrative...');

        // Check if video generator is configured
        if (!videoGenerator.isConfigured()) {
          throw new Error('Video generation is not configured. Please check your API key.');
        }

        // Generate video directly
        const videoOp = await videoGenerator.generateVideo(
          location,
          era,
          aiContent.narrative,
          aiContent.image || undefined
        );

        setLocalVideoOperation(videoOp);

        // Update store with video operation
        setEraAIContent(era.id, {
          content: aiContent,
          videoOperation: videoOp,
          fromCache: false,
          loadedAt: Date.now(),
        });

        return;
      }

      // If no existing content, use the full orchestrator flow
      const result = await contentOrchestrator.getContent(location, era, {
        skipImage: true,
        useFallbackOnError: false,
      });

      const updatedContent = aiContent ? { ...aiContent, video: result.content.video } : result.content;
      setLocalAiContent(updatedContent);
      setLocalVideoOperation(result.videoOperation);

      // Update store with new video
      setEraAIContent(era.id, {
        content: updatedContent,
        videoOperation: result.videoOperation,
        fromCache: false,
        loadedAt: Date.now(),
      });
    } catch (err) {
      console.error('[EraDetail] Failed to generate video:', err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';

      // Show the actual error message for debugging
      setVideoError(errorMessage);
    } finally {
      setIsVideoLoading(false);
    }
  }, [era, location, isVideoLoading, aiContent, setEraAIContent]);

  // Poll for video completion
  const handleVideoPoll = useCallback(async () => {
    if (!videoOperation || !era) return;

    try {
      const video = await videoGenerator.pollVideoStatus(videoOperation);
      if (video) {
        const updatedContent = aiContent ? { ...aiContent, video } : null;
        setLocalAiContent(updatedContent);
        setLocalVideoOperation(undefined);

        // Update store with completed video
        if (updatedContent) {
          setEraAIContent(era.id, {
            content: updatedContent,
            videoOperation: undefined,
            fromCache: contentFromCacheRef.current,
            loadedAt: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error('[EraDetail] Video poll failed:', err);
    }
  }, [videoOperation, era, aiContent, setEraAIContent]);

  // Handle video extension request
  const handleExtendVideo = useCallback(async (extensionPrompt: string) => {
    if (!era || !aiContent?.video || isExtending) return;

    setIsExtending(true);
    setExtensionError(null);

    try {
      const placeName = (aiContent.narrative as EnhancedNarrative)?.locationContext?.placeName || 'Unknown Location';

      const operation = await videoGenerator.extendVideo({
        sourceVideo: aiContent.video,
        extensionPrompt,
        eraName: era.era.name,
        placeName,
      });

      // Wait for extension to complete
      const extendedVideo = await videoGenerator.waitForVideo(operation);

      // Update the video with extension count
      const updatedVideo = {
        ...extendedVideo,
        extensionCount: (aiContent.video.extensionCount ?? 0) + 1,
        extendedFromVideoId: aiContent.video.id,
      };

      const updatedContent = { ...aiContent, video: updatedVideo };
      setLocalAiContent(updatedContent);

      // Update store
      setEraAIContent(era.id, {
        content: updatedContent,
        videoOperation: undefined,
        fromCache: false,
        loadedAt: Date.now(),
      });

      console.log(`[EraDetail] Video extended successfully. New duration: ${updatedVideo.duration}s`);
    } catch (err) {
      console.error('[EraDetail] Video extension failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';

      if (errorMessage.includes('Maximum')) {
        setExtensionError('You\'ve reached the maximum number of extensions for this video.');
      } else if (errorMessage.includes('rate limit')) {
        setExtensionError('Extension service is busy. Please try again in a moment.');
      } else {
        setExtensionError('Extension failed. Please try again!');
      }
    } finally {
      setIsExtending(false);
    }
  }, [era, aiContent, isExtending, setEraAIContent]);

  // Handle AR button click
  const handleARClick = useCallback(() => {
    if (!webXRSupport.isARSupported) return;

    if (onARClick) {
      onARClick();
    } else {
      setIsARActive(true);
    }
  }, [webXRSupport.isARSupported, onARClick]);

  const handleARExit = useCallback(() => {
    setIsARActive(false);
  }, []);

  // Dismiss error toast
  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // Only show skeleton if we don't have era data
  // Text content (narrative) is already available from Home page
  if (!era) {
    return <EraDetailSkeleton onBack={onBack} />;
  }

  // Show AR view when active
  if (isARActive && era) {
    const ARComponent = isIOS() ? IOSARView : ARView;
    const narrativeToUse = aiContent?.narrative || fallbackNarrative;

    return (
      <Suspense fallback={
        <div className="min-h-screen bg-deep-900 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-gray-400 mt-4">Loading AR experience...</p>
          </div>
        </div>
      }>
        <ARComponent
          era={era}
          narrative={narrativeToUse}
          onExit={handleARExit}
        />
      </Suspense>
    );
  }

  // Use the narrative from Home page (fallbackNarrative) - it's already generated
  const narrative = fallbackNarrative;
  const background = getEraBackground(era.era.name);
  const icon = getEraIcon(era.era.name);
  const showARButton = webXRSupport.isARSupported && !webXRSupport.isChecking;


  return (
    <div className={`min-h-screen ${background} text-white`}>
      {/* Header */}
      <header className="px-4 py-3 safe-top bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <BackButton onClick={onBack} />
          <div className="flex items-center gap-2">
            {/* Refresh button - Requirement 6.1 */}
            <RefreshButton
              onClick={handleRefresh}
              isRefreshing={isRefreshing}
              disabled={!location}
            />
            {showARButton && (
              <ARButton onClick={handleARClick} />
            )}
          </div>
        </div>
      </header>

      {/* Main content with optional refresh overlay */}
      <main className="p-4 pb-8 relative">
        {/* Refresh overlay - Requirement 6.4 */}
        {isRefreshing && <RefreshOverlay />}

        {/* Era header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-4xl">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{era.era.name}</h1>
            <p className="text-gray-300">
              {formatYearsAgo(era.era.yearsAgo)} years ago • {era.era.period}
            </p>
          </div>
        </div>

        {/* Layer info */}
        <div className="flex items-center gap-4 mb-6 text-sm text-gray-400">
          <span>Depth: {era.depthStart}m - {era.depthEnd}m</span>
          <span>•</span>
          <span className="capitalize">{era.material}</span>
          {era.fossilIndex !== 'none' && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span>🦴</span>
                <span className="capitalize">{era.fossilIndex} fossils</span>
              </span>
            </>
          )}
        </div>

        {/* Location context (if available from AI content) */}
        {aiContent?.narrative && 'locationContext' in aiContent.narrative && (
          <LocationContextDisplay
            locationContext={(aiContent.narrative as EnhancedNarrative).locationContext}
          />
        )}

        {/* Narrative */}
        {narrative ? (
          <>
            {/* Full description */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">About This Era</h2>
              <p className="text-gray-200 leading-relaxed text-lg">
                {narrative.shortDescription}
              </p>
            </div>

            {/* Generated Image - User clicks to generate */}
            <GeneratedImageDisplay
              image={aiContent?.image || null}
              isLoading={isImageLoading}
              onGenerate={handleGenerateImage}
              error={imageError}
            />

            {/* Generated Video - User clicks to generate */}
            <GeneratedVideoDisplay
              video={aiContent?.video || null}
              videoOperation={videoOperation}
              isLoading={isVideoLoading}
              onGenerate={handleGenerateVideo}
              onPoll={handleVideoPoll}
              onExtend={handleExtendVideo}
              isExtending={isExtending}
              extensionError={extensionError}
              era={era}
              placeName={(aiContent?.narrative as EnhancedNarrative)?.locationContext?.placeName || 'Unknown Location'}
              error={videoError}
            />

            {/* Climate information */}
            <ClimateCard climate={narrative.climate} />

            {/* Flora and Fauna */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <FloraList flora={narrative.flora} />
              <FaunaList fauna={narrative.fauna} />
            </div>


            {/* AR prompt for supported devices */}
            {showARButton && (
              <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-6 text-center border border-blue-500/20">
                <div className="text-3xl mb-2">🦖</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Step Into the Past
                </h3>
                <p className="text-gray-300 mb-4">
                  Experience this era in augmented reality. See prehistoric creatures come to life around you.
                </p>
                <ARButton onClick={handleARClick} variant="prominent" />
              </div>
            )}

            {/* Fallback for non-AR devices */}
            {!showARButton && !webXRSupport.isChecking && (
              <div className="bg-deep-700/50 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">
                  AR view is not available on this device.
                  Enjoy the detailed information above to imagine what this era looked like.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">
              No detailed narrative available for this era.
            </p>
          </div>
        )}
      </main>

      {/* Error toast - Requirement 6.5 */}
      {error && <ErrorToast message={error} onDismiss={handleDismissError} />}
    </div>
  );
}

export default EraDetail;
