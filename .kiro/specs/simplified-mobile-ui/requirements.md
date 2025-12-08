# Requirements Document

## Introduction

This feature redesigns the DeepTime PWA's main interface to be simple, intuitive, and mobile-first. The current UI is overcomplicated with redundant panels and poor mobile experience. The new design focuses on a clean layer exploration experience where users can tap layers to see details, with AI content loading progressively (text first, then image on demand, then video on demand). The AR experience will be added later as a separate feature.

## Glossary

- **Layer**: A geological stratum representing a specific time period in Earth's history
- **Era**: The geological time period associated with a layer (e.g., Jurassic, Cretaceous)
- **Progressive Loading**: Loading content in stages - basic info first, then richer content on user interaction
- **Layer Stack**: Visual representation of geological layers stacked vertically
- **Inline Expansion**: Expanding content within the same view rather than navigating to a new page

## Requirements

### Requirement 1: Simplified Layer Display

**User Story:** As a mobile user, I want to see geological layers in a clean, scrollable list, so that I can easily explore what's beneath my feet without visual clutter.

#### Acceptance Criteria

1. WHEN the app loads with location data THEN the System SHALL display geological layers as a vertical scrollable list filling the screen
2. WHEN displaying a layer THEN the System SHALL show only the era name, time period, and a color-coded indicator
3. WHEN no layer is selected THEN the System SHALL display all layers in a collapsed compact state
4. WHEN the user scrolls through layers THEN the System SHALL provide smooth momentum scrolling with haptic feedback at era boundaries

### Requirement 2: Tap-to-Expand Layer Details

**User Story:** As a user, I want to tap a layer to see more details inline, so that I can explore without navigating away from the main view.

#### Acceptance Criteria

1. WHEN a user taps a layer THEN the System SHALL expand that layer inline to show the narrative description
2. WHEN a layer expands THEN the System SHALL collapse any previously expanded layer
3. WHEN a layer is expanded THEN the System SHALL display the era name, time period, short description, and climate/flora/fauna tags
4. WHEN a layer is expanded THEN the System SHALL show buttons for "Generate Image" and "Enter AR" (AR disabled for now)
5. WHEN the user taps an expanded layer again THEN the System SHALL collapse it back to the compact state

### Requirement 3: Progressive AI Content Loading

**User Story:** As a user, I want AI content to load progressively as I interact, so that I get quick initial information and can choose to see richer content.

#### Acceptance Criteria

1. WHEN a layer expands THEN the System SHALL display cached narrative text immediately if available
2. WHEN a layer expands and no cached narrative exists THEN the System SHALL fetch and display the narrative with a loading indicator
3. WHEN the user taps "Generate Image" THEN the System SHALL generate and display an AI image inline below the description
4. WHEN an image is generated THEN the System SHALL show a "Generate Video" button
5. WHEN the user taps "Generate Video" THEN the System SHALL generate and display a video inline below the image
6. WHEN AI content generation fails THEN the System SHALL display an error message with a retry button

### Requirement 4: Mobile-First Layout

**User Story:** As a mobile user, I want the interface to be optimized for touch and small screens, so that I can use the app comfortably on my phone.

#### Acceptance Criteria

1. WHEN displayed on mobile THEN the System SHALL use full-width layers with adequate touch targets (minimum 44px height)
2. WHEN displayed on mobile THEN the System SHALL position the location header at the top with minimal height
3. WHEN the device orientation changes THEN the System SHALL adapt the layout smoothly without content loss
4. WHEN content overflows THEN the System SHALL enable vertical scrolling within the expanded layer section

### Requirement 5: AR Entry Point

**User Story:** As a user, I want a clear way to enter AR mode when I'm ready, so that I can see prehistoric creatures in my environment.

#### Acceptance Criteria

1. WHEN a layer is expanded THEN the System SHALL display an "Enter AR" button
2. WHEN AR is not supported on the device THEN the System SHALL disable the AR button with a tooltip explaining why
3. WHEN the user taps "Enter AR" THEN the System SHALL transition to the AR view for that era
4. WHEN exiting AR THEN the System SHALL return to the layer view with the same layer expanded

### Requirement 6: Remove Redundant Navigation

**User Story:** As a user, I want all layer information accessible in one place, so that I don't have to navigate between multiple screens.

#### Acceptance Criteria

1. THE System SHALL NOT navigate to a separate EraDetail page when viewing layer information
2. THE System SHALL display all layer content (narrative, image, video) inline within the expanded layer
3. THE System SHALL remove the LayerInfoPanel overlay component
4. THE System SHALL remove the "View Full Details" button and associated navigation
