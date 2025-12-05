# Requirements Document

## Introduction

Enhanced AR Experience transforms the DeepTime PWA from a card-based geological explorer into an immersive camera-first AR experience. Users open the app and immediately see their camera view with animated prehistoric creatures, ancient landscapes, and geological visualizations overlaid on the real world. AI orchestrates the experience by dynamically narrating what the user sees and responding to their exploration.

This phase focuses on delivering the "wow factor" - live camera passthrough with animated 3D content, while staying within PWA/WebXR capabilities.

## Glossary

- **Camera_Passthrough**: Live camera feed displayed as the AR background, with 3D content overlaid
- **Animated_Creature**: A 3D model with skeletal animation (idle, walk, roar) appropriate to the geological era
- **AR_Scene**: The composite view of camera feed plus 3D objects anchored to detected surfaces
- **Ground_Plane**: A horizontal surface detected by WebXR for anchoring 3D content
- **Era_Transition**: Animated visual effect when switching between geological time periods
- **AI_Narrator**: Gemini-powered voice/text that describes what the user is seeing in real-time
- **Haptic_Pulse**: Vibration feedback triggered at era boundaries during time navigation

## Requirements

### Requirement 1: Camera-First AR Experience

**User Story:** As a user, I want to see my camera view with AR content overlaid when I open the app, so that I immediately experience the magic of seeing prehistoric life at my location.

#### Acceptance Criteria

1. WHEN the app launches and location is obtained THEN the DeepTime_App SHALL request camera permission and display live camera feed
2. WHEN camera permission is granted THEN the DeepTime_App SHALL initialize WebXR AR session with camera passthrough
3. WHEN WebXR detects a ground plane THEN the DeepTime_App SHALL anchor 3D content to that surface
4. IF WebXR is not supported THEN the DeepTime_App SHALL fall back to camera-only mode with 2D overlays
5. IF camera permission is denied THEN the DeepTime_App SHALL display the existing card-based interface

### Requirement 2: Animated 3D Creatures

**User Story:** As a user, I want to see animated prehistoric creatures walking around in AR, so that I can visualize what lived at my location millions of years ago.

#### Acceptance Criteria

1. WHEN an era is selected THEN the DeepTime_App SHALL load era-appropriate animated 3D creature models
2. WHEN creature models are loaded THEN the DeepTime_App SHALL play idle animations by default
3. WHEN the user taps a creature THEN the DeepTime_App SHALL trigger an interaction animation (roar, attention)
4. WHEN creatures are rendered THEN the DeepTime_App SHALL scale them accurately relative to real-world dimensions
5. WHEN multiple creatures are present THEN the DeepTime_App SHALL distribute them naturally across the detected ground plane

### Requirement 3: Era Transition Effects

**User Story:** As a user, I want to see dramatic visual transitions when I travel through time, so that I feel the passage of millions of years.

#### Acceptance Criteria

1. WHEN the time slider changes era THEN the DeepTime_App SHALL animate a transition effect lasting 1-2 seconds
2. WHEN transitioning to older eras THEN the DeepTime_App SHALL apply a "dissolve into the past" visual effect
3. WHEN transitioning to newer eras THEN the DeepTime_App SHALL apply a "emerge from the past" visual effect
4. WHEN era transition completes THEN the DeepTime_App SHALL smoothly fade in new era creatures and environment
5. WHEN transition is in progress THEN the DeepTime_App SHALL disable time slider interaction to prevent conflicts

### Requirement 4: AI-Powered Narration

**User Story:** As a user, I want AI to narrate what I'm seeing in AR, so that I learn about the prehistoric world while exploring.

#### Acceptance Criteria

1. WHEN a new era is displayed THEN the DeepTime_App SHALL generate a contextual narration using Gemini
2. WHEN the user taps a creature THEN the DeepTime_App SHALL generate a specific explanation about that creature
3. WHEN narration is generated THEN the DeepTime_App SHALL display text overlay synchronized with content
4. WHEN narration text is displayed THEN the DeepTime_App SHALL auto-dismiss after reading time or on user tap
5. IF Gemini API is unavailable THEN the DeepTime_App SHALL display pre-written fallback narrations

### Requirement 5: Haptic Time Navigation

**User Story:** As a user, I want to feel vibrations as I scroll through time, so that I sense the passage through different eras.

#### Acceptance Criteria

1. WHEN the time slider crosses an era boundary THEN the DeepTime_App SHALL trigger a haptic pulse
2. WHEN haptic feedback is triggered THEN the DeepTime_App SHALL vary intensity based on era significance
3. WHEN the user releases the time slider THEN the DeepTime_App SHALL trigger a confirmation haptic
4. IF device does not support haptics THEN the DeepTime_App SHALL skip haptic feedback silently
5. WHEN haptic feedback is enabled THEN the DeepTime_App SHALL respect system haptic settings

### Requirement 6: AR UI Overlay

**User Story:** As a user, I want minimal but informative UI overlaid on the AR view, so that I can navigate without breaking immersion.

#### Acceptance Criteria

1. WHEN AR view is active THEN the DeepTime_App SHALL display a compact time slider on the left edge
2. WHEN AR view is active THEN the DeepTime_App SHALL display current era name and date at the top
3. WHEN AR view is active THEN the DeepTime_App SHALL display an exit button to return to card view
4. WHEN the user is idle for 5 seconds THEN the DeepTime_App SHALL fade UI elements to 50% opacity
5. WHEN the user touches the screen THEN the DeepTime_App SHALL restore UI elements to full opacity

