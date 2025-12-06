/**
 * VideoExtensionUI Component
 * Displays after video playback and allows user to extend the video
 * Uses Veo 3.1 video extension feature
 */

import { useState, useCallback } from 'react';
import type { GeologicalLayer } from 'deep-time-core/types';
import type { GeneratedVideo } from '../services/ai/types';
import { MAX_VIDEO_EXTENSIONS } from '../services/ai/types';
import { LoadingSpinner } from './LoadingSpinner';

export interface VideoExtensionUIProps {
    /** The current video that can be extended */
    video: GeneratedVideo;
    /** The geological era for context */
    era: GeologicalLayer;
    /** Location name for context */
    placeName: string;
    /** Callback when user requests extension */
    onExtend: (prompt: string) => void;
    /** Whether extension is in progress */
    isExtending: boolean;
    /** Error message if extension failed */
    error?: string | null;
}

/**
 * Suggested extension prompts based on era context
 */
function getSuggestedPrompts(era: GeologicalLayer): string[] {
    const eraName = era.era.name;
    return [
        `Continue the scene as the sun sets over the ${eraName} landscape`,
        `Zoom out slowly to reveal more of the prehistoric environment`,
        `Focus on a creature moving through the scene`,
        `Pan across the landscape showing the diverse flora`,
        `Transition to a dramatic sky with atmospheric effects`,
    ];
}

export function VideoExtensionUI({
    video,
    era,
    placeName,
    onExtend,
    isExtending,
    error,
}: VideoExtensionUIProps) {
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');

    const extensionCount = video.extensionCount ?? 0;
    const canExtend = extensionCount < MAX_VIDEO_EXTENSIONS;
    const remainingExtensions = MAX_VIDEO_EXTENSIONS - extensionCount;

    const suggestedPrompts = getSuggestedPrompts(era);

    const handleSuggestionClick = useCallback((prompt: string) => {
        onExtend(prompt);
    }, [onExtend]);

    const handleCustomSubmit = useCallback(() => {
        if (customPrompt.trim()) {
            onExtend(customPrompt.trim());
            setCustomPrompt('');
            setShowCustomInput(false);
        }
    }, [customPrompt, onExtend]);

    // Show loading state
    if (isExtending) {
        return (
            <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-6 border border-purple-500/30 text-center">
                <LoadingSpinner size="md" />
                <p className="text-white font-medium mt-3">Extending your video...</p>
                <p className="text-gray-400 text-sm mt-1">
                    Adding 7 more seconds of prehistoric wonder
                </p>
                <p className="text-gray-500 text-xs mt-2">This usually takes 20-30 seconds</p>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="bg-red-900/20 rounded-xl p-4 border border-red-500/30 text-center">
                <p className="text-red-300 text-sm">{error}</p>
                <button
                    onClick={() => setShowCustomInput(false)}
                    className="mt-2 text-gray-400 text-xs hover:text-white"
                >
                    Try again
                </button>
            </div>
        );
    }

    // Max extensions reached
    if (!canExtend) {
        return (
            <div className="bg-deep-700/50 rounded-xl p-4 border border-gray-600/30 text-center">
                <p className="text-gray-400 text-sm">
                    Maximum extensions reached ({MAX_VIDEO_EXTENSIONS} total)
                </p>
                <p className="text-gray-500 text-xs mt-1">
                    Your video is now ~{video.duration} seconds long!
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/20">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium flex items-center gap-2">
                    <span>✨</span> Continue the Story
                </h4>
                <span className="text-gray-400 text-xs">
                    {remainingExtensions} extension{remainingExtensions !== 1 ? 's' : ''} remaining
                </span>
            </div>

            {/* Suggestions */}
            {!showCustomInput && (
                <div className="space-y-2">
                    {suggestedPrompts.slice(0, 3).map((prompt, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestionClick(prompt)}
                            disabled={isExtending}
                            className="w-full text-left px-4 py-3 bg-deep-700/50 hover:bg-deep-600/50 rounded-lg text-gray-200 text-sm transition-colors disabled:opacity-50"
                        >
                            {prompt}
                        </button>
                    ))}

                    {/* Custom prompt button */}
                    <button
                        onClick={() => setShowCustomInput(true)}
                        className="w-full text-left px-4 py-3 bg-purple-800/30 hover:bg-purple-700/40 rounded-lg text-purple-300 text-sm transition-colors border border-purple-500/20"
                    >
                        ✏️ Write your own continuation...
                    </button>
                </div>
            )}

            {/* Custom prompt input */}
            {showCustomInput && (
                <div className="space-y-3">
                    <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder={`Describe what should happen next in this ${era.era.name} scene at ${placeName}...`}
                        className="w-full px-4 py-3 bg-deep-800/80 rounded-lg text-white text-sm placeholder-gray-500 border border-purple-500/30 focus:border-purple-400 focus:outline-none resize-none"
                        rows={3}
                        maxLength={500}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowCustomInput(false)}
                            className="flex-1 px-4 py-2 bg-deep-700/50 hover:bg-deep-600/50 rounded-lg text-gray-300 text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCustomSubmit}
                            disabled={!customPrompt.trim()}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Extend Video
                        </button>
                    </div>
                    <p className="text-gray-500 text-xs text-center">
                        {customPrompt.length}/500 characters
                    </p>
                </div>
            )}
        </div>
    );
}

export default VideoExtensionUI;
