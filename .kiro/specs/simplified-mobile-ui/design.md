# Design Document

## Overview

A complete UI redesign for DeepTime's main interface, transforming it from a cluttered multi-panel experience into a simple, immersive "dig through time" interaction. The design uses a **geological core sample** metaphor - users scroll through a vertical column of rock layers, tapping to reveal what lived in each era.

### Design Philosophy: "Sedimentary Storytelling"

**Tone**: Organic/Natural meets Editorial - like a beautifully designed museum exhibit or National Geographic feature. Earthy, tactile, with moments of wonder.

**The Unforgettable Element**: Layers feel like actual rock strata - textured, colored by mineral content, with fossils and life emerging when you tap. The transition from compact to expanded feels like cracking open a geode.

## Architecture

### Component Hierarchy

```
App
├── LocationHeader (simplified - just location name + search icon)
└── LayerExplorer (new main component)
    └── LayerCard[] (expandable layer items)
        ├── LayerCompact (collapsed state)
        └── LayerExpanded (expanded state)
            ├── NarrativeSection
            ├── AIMediaSection (progressive: image → video)
            └── ActionButtons (AR entry point)
```

### Removed Components

- `CrossSectionView` - replaced by `LayerExplorer`
- `LayerInfoPanel` - content moved inline to `LayerCard`
- `LayerStack` - replaced by simpler list
- `LayerStratum` - replaced by `LayerCard`
- `EraDetail` page - all content now inline

## Components and Interfaces

### LayerExplorer

The main container that renders the scrollable layer list.

```typescript
interface LayerExplorerProps {
  geologicalStack: GeologicalStack | null;
  location: GeoCoordinate | null;
  isLoading: boolean;
  onEnterAR: (layer: GeologicalLayer) => void;
}
```

### LayerCard

Individual expandable layer component with two states.

```typescript
interface LayerCardProps {
  layer: GeologicalLayer;
  isExpanded: boolean;
  onToggle: () => void;
  onEnterAR: () => void;
  location: GeoCoordinate | null;
}

interface LayerCardState {
  narrative: Narrative | null;
  isLoadingNarrative: boolean;
  image: GeneratedImage | null;
  isLoadingImage: boolean;
  video: GeneratedVideo | null;
  isLoadingVideo: boolean;
  error: string | null;
}
```

### Visual Design Specifications

#### Color Palette (CSS Variables)

```css
:root {
  /* Base earth tones */
  --stone-950: #0c0a09;
  --stone-900: #1c1917;
  --stone-800: #292524;
  --stone-700: #44403c;
  
  /* Era accent colors - derived from geological periods */
  --quaternary: #8B7355;    /* Brown - recent sediments */
  --neogene: #C4A35A;       /* Sandy gold */
  --paleogene: #7D8471;     /* Olive gray */
  --cretaceous: #5B8A72;    /* Sea green - chalk seas */
  --jurassic: #4A6741;      /* Forest green */
  --triassic: #8B4513;      /* Saddle brown - red beds */
  --permian: #CD853F;       /* Peru - desert */
  --carboniferous: #2F4F4F; /* Dark slate - coal */
  --devonian: #708090;      /* Slate gray - fish */
  --silurian: #5F9EA0;      /* Cadet blue - reefs */
  --ordovician: #4682B4;    /* Steel blue - seas */
  --cambrian: #6B8E23;      /* Olive drab - explosion */
  --precambrian: #483D8B;   /* Dark slate blue - ancient */
  
  /* UI accents */
  --amber-glow: #F59E0B;
  --fossil-cream: #FEF3C7;
}
```

#### Typography

- **Display**: "Playfair Display" - elegant serif for era names (museum feel)
- **Body**: "Source Sans 3" - clean, readable for descriptions
- **Mono**: "JetBrains Mono" - for depth/time data

#### Layer Card Design

**Collapsed State**:
- Height: 72px (touch-friendly)
- Left edge: 4px colored bar indicating era
- Era name in Playfair Display (18px)
- Time period in muted text (12px)
- Subtle texture overlay suggesting rock type
- Chevron indicator on right

**Expanded State**:
- Smooth height animation (300ms ease-out)
- Full narrative text
- Climate/flora/fauna as subtle tags
- "Generate Image" button (primary action)
- "Enter AR" button (secondary, disabled initially)
- Generated content appears inline with fade-in

#### Interaction Patterns

1. **Tap to expand**: Single tap toggles layer expansion
2. **Scroll**: Momentum scrolling through layers
3. **Haptic feedback**: Light tap on era boundaries while scrolling
4. **Progressive reveal**: Content fades in as it loads

## Data Models

### LayerDisplayState

```typescript
interface LayerDisplayState {
  expandedLayerId: string | null;
  layerContent: Map<string, LayerContent>;
}

interface LayerContent {
  narrative: Narrative | null;
  image: GeneratedImage | null;
  video: GeneratedVideo | null;
  loadingState: {
    narrative: boolean;
    image: boolean;
    video: boolean;
  };
  error: string | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Prework Analysis

1.1 WHEN the app loads with location data THEN the System SHALL display geological layers as a vertical scrollable list
Thoughts: This is about rendering layers from data. We can test that given any geological stack, the rendered output contains all layers.
Testable: yes - property

1.2 WHEN displaying a layer THEN the System SHALL show only the era name, time period, and a color-coded indicator
Thoughts: This is about what information is displayed. We can verify rendered content contains required fields.
Testable: yes - property

1.3 WHEN no layer is selected THEN the System SHALL display all layers in a collapsed compact state
Thoughts: This is about initial state. We can verify that initially no layer is expanded.
Testable: yes - property

1.4 WHEN the user scrolls through layers THEN the System SHALL provide smooth momentum scrolling with haptic feedback
Thoughts: This is about scroll behavior and haptics - UI feel that's hard to test programmatically.
Testable: no

2.1 WHEN a user taps a layer THEN the System SHALL expand that layer inline
Thoughts: This is about state change on interaction. We can test that tapping changes expanded state.
Testable: yes - property

2.2 WHEN a layer expands THEN the System SHALL collapse any previously expanded layer
Thoughts: This is about mutual exclusion - only one expanded at a time. We can test this invariant.
Testable: yes - property

2.3 WHEN a layer is expanded THEN the System SHALL display the era name, time period, short description, and tags
Thoughts: This is about expanded content. We can verify expanded state shows required content.
Testable: yes - property

2.4 WHEN a layer is expanded THEN the System SHALL show buttons for "Generate Image" and "Enter AR"
Thoughts: This is about UI elements in expanded state. We can verify buttons are present.
Testable: yes - property

2.5 WHEN the user taps an expanded layer again THEN the System SHALL collapse it
Thoughts: This is toggle behavior. We can test that tapping expanded layer collapses it.
Testable: yes - property

3.1 WHEN a layer expands THEN the System SHALL display cached narrative text immediately if available
Thoughts: This is about cache-first behavior. We can test that cached content appears without loading state.
Testable: yes - property

3.2 WHEN a layer expands and no cached narrative exists THEN the System SHALL fetch with loading indicator
Thoughts: This is about loading state when cache miss. We can test loading state appears.
Testable: yes - property

3.3 WHEN the user taps "Generate Image" THEN the System SHALL generate and display an AI image
Thoughts: This is about image generation flow. We can test that action triggers generation.
Testable: yes - property

3.4 WHEN an image is generated THEN the System SHALL show a "Generate Video" button
Thoughts: This is about progressive disclosure. We can test video button appears after image.
Testable: yes - property

3.5 WHEN the user taps "Generate Video" THEN the System SHALL generate and display a video
Thoughts: This is about video generation flow. We can test action triggers generation.
Testable: yes - property

3.6 WHEN AI content generation fails THEN the System SHALL display an error message with retry
Thoughts: This is about error handling. We can test error state shows retry option.
Testable: yes - property

4.1 WHEN displayed on mobile THEN the System SHALL use full-width layers with adequate touch targets
Thoughts: This is about responsive layout. We can test minimum heights are met.
Testable: yes - property

4.2 WHEN displayed on mobile THEN the System SHALL position the location header at the top
Thoughts: This is about layout structure. We can verify header position.
Testable: yes - example

4.3 WHEN the device orientation changes THEN the System SHALL adapt the layout smoothly
Thoughts: This is about responsive behavior - hard to test layout adaptation programmatically.
Testable: no

4.4 WHEN content overflows THEN the System SHALL enable vertical scrolling
Thoughts: This is about overflow handling. We can test scroll is enabled when content exceeds viewport.
Testable: yes - property

5.1 WHEN a layer is expanded THEN the System SHALL display an "Enter AR" button
Thoughts: Same as 2.4 - AR button presence in expanded state.
Testable: yes - property (covered by 2.4)

5.2 WHEN AR is not supported THEN the System SHALL disable the AR button with tooltip
Thoughts: This is about conditional UI state. We can test button disabled state based on support.
Testable: yes - property

5.3 WHEN the user taps "Enter AR" THEN the System SHALL transition to AR view
Thoughts: This is about navigation. We can test that action triggers AR mode.
Testable: yes - property

5.4 WHEN exiting AR THEN the System SHALL return with same layer expanded
Thoughts: This is about state preservation. We can test expanded state persists through AR.
Testable: yes - property

6.1 THE System SHALL NOT navigate to a separate EraDetail page
Thoughts: This is about architecture - no separate page. We can verify no navigation occurs.
Testable: yes - property

6.2 THE System SHALL display all layer content inline within the expanded layer
Thoughts: This is about content location. We can verify content renders within layer component.
Testable: yes - property

6.3 THE System SHALL remove the LayerInfoPanel overlay component
Thoughts: This is about component removal - architectural, not runtime testable.
Testable: no

6.4 THE System SHALL remove the "View Full Details" button
Thoughts: This is about UI element removal. We can verify button doesn't exist.
Testable: yes - property

### Property Reflection

Consolidating redundant properties:
- 2.4 and 5.1 are the same (AR button in expanded state) - keep as one property
- 1.2 and 2.3 overlap on content display - combine into one property about layer content
- 3.3 and 3.5 follow same pattern - can be one property about media generation

### Correctness Properties

Property 1: All layers rendered
*For any* geological stack with N layers, the LayerExplorer component SHALL render exactly N LayerCard components
**Validates: Requirements 1.1**

Property 2: Layer content completeness
*For any* layer in collapsed state, the rendered output SHALL contain the era name and time period. *For any* layer in expanded state, the rendered output SHALL additionally contain the description and action buttons.
**Validates: Requirements 1.2, 2.3, 2.4**

Property 3: Single expansion invariant
*For any* sequence of layer tap interactions, at most one layer SHALL be in expanded state at any time
**Validates: Requirements 1.3, 2.2**

Property 4: Toggle behavior
*For any* layer, tapping it when collapsed SHALL expand it, and tapping it when expanded SHALL collapse it
**Validates: Requirements 2.1, 2.5**

Property 5: Cache-first narrative loading
*For any* layer expansion where cached narrative exists, the narrative SHALL display immediately without loading state. *For any* layer expansion where no cache exists, a loading indicator SHALL appear.
**Validates: Requirements 3.1, 3.2**

Property 6: Progressive media generation
*For any* layer, the "Generate Video" button SHALL only be visible after an image has been generated
**Validates: Requirements 3.4**

Property 7: Error recovery
*For any* AI generation failure, the error state SHALL include a retry action that can re-trigger generation
**Validates: Requirements 3.6**

Property 8: Touch target minimum
*For any* LayerCard in collapsed state, the height SHALL be at least 44 pixels
**Validates: Requirements 4.1**

Property 9: AR button state
*For any* device where AR is not supported, the AR button SHALL be disabled. *For any* device where AR is supported, the AR button SHALL be enabled.
**Validates: Requirements 5.2**

Property 10: No separate detail page
*For any* user interaction with layers, the system SHALL NOT navigate to a separate EraDetail route
**Validates: Requirements 6.1, 6.4**

## Error Handling

### Network Errors
- Display inline error message within the layer card
- Show "Retry" button that re-attempts the failed operation
- Preserve any successfully loaded content

### AI Generation Errors
- Show user-friendly error message (not technical details)
- Offer retry option
- Fall back to cached content if available

### Empty State
- When no geological data available, show friendly message with location search prompt
- When location permission denied, show explanation and manual search option

## Testing Strategy

### Unit Tests
- LayerCard renders correct content in collapsed/expanded states
- Toggle behavior works correctly
- Loading states display appropriately

### Property-Based Tests (fast-check)

**Property 1: All layers rendered**
- Generate random geological stacks
- Verify LayerExplorer renders correct number of LayerCards

**Property 2: Layer content completeness**
- Generate random layers with various data
- Verify required content present in each state

**Property 3: Single expansion invariant**
- Generate random sequences of tap events
- Verify at most one layer expanded after each event

**Property 4: Toggle behavior**
- Generate random layer and initial state
- Verify tap toggles state correctly

**Property 5: Cache-first narrative loading**
- Generate layers with/without cached narratives
- Verify loading state only appears on cache miss

**Property 6: Progressive media generation**
- Generate layers with various media states
- Verify video button only visible when image exists

**Property 7: Error recovery**
- Generate error scenarios
- Verify retry action is present and functional

**Property 8: Touch target minimum**
- Generate layers with various content
- Verify minimum height constraint met

**Property 9: AR button state**
- Generate AR support states
- Verify button enabled/disabled correctly

**Property 10: No separate detail page**
- Generate interaction sequences
- Verify no navigation to EraDetail route

### Testing Framework
- Vitest for test runner
- fast-check for property-based testing
- React Testing Library for component testing
