/**
 * LayerInfoPanel Component
 * Overlay panel showing selected layer content with AI-generated narratives
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState, useEffect } from 'react';
import type { GeologicalLayer, Narrative } from 'deep-time-core/types';
import type { EraContent, GeneratedImage, GeneratedVideo } from '../services/ai/types';

export interface LayerInfoPanelProps {
  /** Currently selected geological layer */
  layer: GeologicalLayer | null;
  /** Narrative content for the layer */
  narrative: Narrative | null;
  /** AI-generated content (image/video) */
  aiContent: EraContent | null;
  /** Whether narrative is currently loading */
  isLoadingNarrative: boolean;
  /** Callback to generate AI image */
  onGenerateImage: () => void;
  /** Callback to generate AI video */
  onGenerateVideo: () => void;
  /** Callback to navigate to full era details */
  onViewDetails: () => void;
  /** Whether image generation is in progress */
  isImageLoading: boolean;
  /** Whether video generation is in progress */
  isVideoLoading: boolean;
}

/**
 * Formats years ago into human-readable string
 */
function formatYearsAgo(yearsAgo: number): string {
  if (yearsAgo >= 1_000_000_000) {
    return `${(yearsAgo / 1_000_000_000).toFixed(1)} billion years ago`;
  }
  if (yearsAgo >= 1_000_000) {
    return `${(yearsAgo / 1_000_000).toFixed(1)} million years ago`;
  }
  if (yearsAgo >= 1_000) {
    return `${(yearsAgo / 1_000).toFixed(1)} thousand years ago`;
  }
  return `${yearsAgo} years ago`;
}

/**
 * Renders the climate, flora, and fauna information
 * Requirement 3.2: Show climate, flora, fauna when available
 */
function EnvironmentInfo({ narrative }: { narrative: Narrative }) {
  return (
    <div className="space-y-3 text-sm">
      {/* Climate */}
      {narrative.climate && (
        <div>
          <h4 className="text-white/60 text-xs uppercase tracking-wide mb-1">Climate</h4>
          <p className="text-white/80">
            {narrative.climate.temperature} • {narrative.climate.humidity}
          </p>
        </div>
      )}
      
      {/* Flora */}
      {narrative.flora && narrative.flora.length > 0 && (
        <div>
          <h4 className="text-white/60 text-xs uppercase tracking-wide mb-1">Flora</h4>
          <div className="flex flex-wrap gap-1">
            {narrative.flora.slice(0, 4).map((plant, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-green-900/40 text-green-300 rounded-full text-xs"
              >
                {plant}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Fauna */}
      {narrative.fauna && narrative.fauna.length > 0 && (
        <div>
          <h4 className="text-white/60 text-xs uppercase tracking-wide mb-1">Fauna</h4>
          <div className="flex flex-wrap gap-1">
            {narrative.fauna.slice(0, 4).map((animal, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-amber-900/40 text-amber-300 rounded-full text-xs"
              >
                {animal}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders AI-generated image content
 * Requirement 3.4: Display image inline within the panel
 */
function AIImageDisplay({ image }: { image: GeneratedImage }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (image.imageData) {
      const url = URL.createObjectURL(image.imageData);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [image.imageData]);

  if (!imageUrl) return null;

  return (
    <div className="mt-3 rounded-lg overflow-hidden">
      <img
        src={imageUrl}
        alt="AI-generated era visualization"
        className="w-full h-32 object-cover"
      />
    </div>
  );
}

/**
 * Renders AI-generated video content
 * Requirement 3.4: Display video inline within the panel
 */
function AIVideoDisplay({ video }: { video: GeneratedVideo }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset error state when video changes
    setError(false);
    
    if (video.videoData && video.videoData.size > 0) {
      const url = URL.createObjectURL(video.videoData);
      setVideoUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setVideoUrl(null);
    }
  }, [video.videoData]);

  if (error) {
    return (
      <div className="mt-3 rounded-lg overflow-hidden bg-red-900/20 p-3 text-center">
        <p className="text-red-300 text-sm">Failed to load video</p>
      </div>
    );
  }

  if (!videoUrl) return null;

  return (
    <div className="mt-3 rounded-lg overflow-hidden bg-black/30">
      <video
        key={videoUrl} // Force new element when URL changes
        src={videoUrl}
        className="w-full h-32 object-cover"
        controls
        autoPlay
        loop
        muted
        playsInline
        onError={() => setError(true)}
      />
    </div>
  );
}

/**
 * LayerInfoPanel Component
 * Displays selected layer information with AI content generation options
 */
export function LayerInfoPanel({
  layer,
  narrative,
  aiContent,
  isLoadingNarrative,
  onGenerateImage,
  onGenerateVideo,
  onViewDetails,
  isImageLoading,
  isVideoLoading,
}: LayerInfoPanelProps) {
  // Don't render if no layer is selected
  if (!layer) return null;

  const hasImage = aiContent?.image != null;
  const hasVideo = aiContent?.video != null;

  return (
    <>
      {/* Mobile: Slide-up panel from bottom */}
      <div
        className="
          fixed bottom-0 left-0 right-0 z-50
          md:hidden
          bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900/90
          backdrop-blur-lg
          rounded-t-2xl
          shadow-2xl shadow-black/50
          transform transition-transform duration-300 ease-out
          max-h-[70vh] overflow-y-auto
        "
        role="region"
        aria-label="Layer information panel"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="px-4 pb-6">
          {/* Era name and time period - Requirement 3.1 */}
          <div className="mb-3">
            <h2 className="text-xl font-bold text-white">{layer.era.name}</h2>
            <p className="text-white/60 text-sm">
              {formatYearsAgo(layer.era.yearsAgo)} • {layer.era.period}
            </p>
            <p className="text-white/40 text-xs mt-1">
              Depth: {layer.depthStart}m - {layer.depthEnd}m • {layer.material}
            </p>
          </div>

          {/* Narrative description - Requirement 3.1 */}
          {isLoadingNarrative ? (
            <div className="flex items-center gap-2 text-white/50 text-sm py-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
              Loading narrative...
            </div>
          ) : narrative ? (
            <div className="mb-4">
              <p className="text-white/90 text-sm leading-relaxed">
                {narrative.shortDescription}
              </p>
              
              {/* Climate, flora, fauna - Requirement 3.2 */}
              <div className="mt-3">
                <EnvironmentInfo narrative={narrative} />
              </div>
            </div>
          ) : (
            <p className="text-white/50 text-sm py-2">
              No narrative available for this layer.
            </p>
          )}

          {/* AI Content Display - Requirement 3.4 */}
          {hasImage && aiContent?.image && (
            <AIImageDisplay image={aiContent.image} />
          )}
          {hasVideo && aiContent?.video && (
            <AIVideoDisplay video={aiContent.video} />
          )}

          {/* AI Generation buttons - Requirement 3.3 */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={onGenerateImage}
              disabled={isImageLoading || hasImage}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isImageLoading || hasImage
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                }
              `}
              aria-busy={isImageLoading}
            >
              {isImageLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : hasImage ? (
                '✓ Image Ready'
              ) : (
                '🖼️ Generate Image'
              )}
            </button>

            <button
              onClick={onGenerateVideo}
              disabled={isVideoLoading || hasVideo}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isVideoLoading || hasVideo
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
                }
              `}
              aria-busy={isVideoLoading}
            >
              {isVideoLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : hasVideo ? (
                '✓ Video Ready'
              ) : (
                '🎬 Generate Video'
              )}
            </button>
          </div>

          {/* View Details button - Requirement 3.5 */}
          <button
            onClick={onViewDetails}
            className="
              w-full mt-3 py-2.5 px-4 rounded-lg
              bg-white/10 hover:bg-white/20
              text-white font-medium text-sm
              transition-all duration-200
              active:scale-[0.98]
            "
          >
            View Full Details →
          </button>
        </div>
      </div>

      {/* Desktop: Side panel */}
      <div
        className="
          hidden md:block
          fixed right-4 top-1/2 -translate-y-1/2 z-50
          w-80
          bg-slate-900/95 backdrop-blur-lg
          rounded-xl
          shadow-2xl shadow-black/50
          border border-white/10
          max-h-[80vh] overflow-y-auto
        "
        role="region"
        aria-label="Layer information panel"
      >
        <div className="p-5">
          {/* Era name and time period - Requirement 3.1 */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">{layer.era.name}</h2>
            <p className="text-white/60 text-sm mt-1">
              {formatYearsAgo(layer.era.yearsAgo)}
            </p>
            <p className="text-white/50 text-xs mt-0.5">
              {layer.era.period} Period
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
              <span className="px-2 py-0.5 bg-white/10 rounded">
                {layer.depthStart}m - {layer.depthEnd}m
              </span>
              <span className="px-2 py-0.5 bg-white/10 rounded capitalize">
                {layer.material}
              </span>
            </div>
          </div>

          {/* Narrative description - Requirement 3.1 */}
          {isLoadingNarrative ? (
            <div className="flex items-center gap-2 text-white/50 text-sm py-3">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
              Loading narrative...
            </div>
          ) : narrative ? (
            <div className="mb-4">
              <p className="text-white/90 text-sm leading-relaxed">
                {narrative.shortDescription}
              </p>
              
              {/* Climate, flora, fauna - Requirement 3.2 */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <EnvironmentInfo narrative={narrative} />
              </div>
            </div>
          ) : (
            <p className="text-white/50 text-sm py-3">
              No narrative available for this layer.
            </p>
          )}

          {/* AI Content Display - Requirement 3.4 */}
          {hasImage && aiContent?.image && (
            <AIImageDisplay image={aiContent.image} />
          )}
          {hasVideo && aiContent?.video && (
            <AIVideoDisplay video={aiContent.video} />
          )}

          {/* AI Generation buttons - Requirement 3.3 */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={onGenerateImage}
              disabled={isImageLoading || hasImage}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isImageLoading || hasImage
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                }
              `}
              aria-busy={isImageLoading}
            >
              {isImageLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ...
                </span>
              ) : hasImage ? (
                '✓ Image'
              ) : (
                '🖼️ Image'
              )}
            </button>

            <button
              onClick={onGenerateVideo}
              disabled={isVideoLoading || hasVideo}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isVideoLoading || hasVideo
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
                }
              `}
              aria-busy={isVideoLoading}
            >
              {isVideoLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ...
                </span>
              ) : hasVideo ? (
                '✓ Video'
              ) : (
                '🎬 Video'
              )}
            </button>
          </div>

          {/* View Details button - Requirement 3.5 */}
          <button
            onClick={onViewDetails}
            className="
              w-full mt-3 py-2.5 px-4 rounded-lg
              bg-white/10 hover:bg-white/20
              text-white font-medium text-sm
              transition-all duration-200
              active:scale-[0.98]
              flex items-center justify-center gap-2
            "
          >
            View Full Details
            <span className="text-white/60">→</span>
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Extracts panel content for testing purposes
 * Returns the text content that should be displayed in the panel
 * Requirement 3.1, 3.2: Panel should contain era name, time period, and narrative
 */
export function extractPanelContent(
  layer: GeologicalLayer,
  narrative: Narrative | null
): {
  eraName: string;
  yearsAgo: number;
  formattedTime: string;
  period: string;
  shortDescription: string | null;
  hasClimate: boolean;
  hasFlora: boolean;
  hasFauna: boolean;
} {
  return {
    eraName: layer.era.name,
    yearsAgo: layer.era.yearsAgo,
    formattedTime: formatYearsAgo(layer.era.yearsAgo),
    period: layer.era.period,
    shortDescription: narrative?.shortDescription ?? null,
    hasClimate: narrative?.climate != null,
    hasFlora: (narrative?.flora?.length ?? 0) > 0,
    hasFauna: (narrative?.fauna?.length ?? 0) > 0,
  };
}

export default LayerInfoPanel;
