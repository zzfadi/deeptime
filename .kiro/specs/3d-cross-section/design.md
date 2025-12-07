# Design Document: 3D Cross-Section View

## Overview

This feature replaces the current Home page layout (TimeSlider + EraCard + GeologicalStackView) with an immersive 3D cross-section visualization. The cross-section shows Earth's geological layers as a realistic vertical slice, allowing users to scroll through deep time and view AI-generated content directly within the interface.

The design prioritizes:
- **Visual impact**: A striking 3D earth cross-section that immediately communicates geological depth
- **Intuitive interaction**: Natural scroll/drag to navigate, tap to select layers
- **Integrated content**: AI narratives, images, and videos displayed inline without page navigation
- **Mobile performance**: Lightweight rendering using CSS 3D transforms (not WebGL) for broad compatibility

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Home Page                          │
├─────────────────────────────────────────────────────────┤
│  LocationHeader (existing)                              │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │           CrossSectionView (new)                  │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  3D Layer Stack (CSS 3D transforms)         │  │  │
│  │  │  - Scrollable container                     │  │  │
│  │  │  - Layer components with depth perspective  │  │  │
│  │  │  - Active layer highlight                   │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  LayerInfoPanel (overlay)                   │  │  │
│  │  │  - Era name, time, description              │  │  │
│  │  │  - Climate/flora/fauna                      │  │  │
│  │  │  - AI image/video buttons                   │  │  │
│  │  │  - "View Details" link                      │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### CrossSectionView Component

The main container component that orchestrates the 3D visualization and info panel.

```typescript
interface CrossSectionViewProps {
  geologicalStack: GeologicalStack | null;
  narrativeCache: Map<string, Narrative>;
  onLayerSelect: (layer: GeologicalLayer) => void;
  onViewDetails: (layer: GeologicalLayer) => void;
  isLoading: boolean;
}
```

### LayerStack Component

Renders the 3D stack of geological layers using CSS 3D transforms.

```typescript
interface LayerStackProps {
  layers: GeologicalLayer[];
  activeLayerId: string | null;
  scrollPosition: number; // 0-1 normalized
  onLayerClick: (layer: GeologicalLayer) => void;
}
```

### LayerStratum Component

Individual layer rendering with era-specific styling.

```typescript
interface LayerStratumProps {
  layer: GeologicalLayer;
  index: number;
  totalLayers: number;
  isActive: boolean;
  depth: number; // Visual depth offset
  onClick: () => void;
}
```

### LayerInfoPanel Component

Overlay panel showing selected layer content.

```typescript
interface LayerInfoPanelProps {
  layer: GeologicalLayer | null;
  narrative: Narrative | null;
  aiContent: EraContent | null;
  isLoadingNarrative: boolean;
  onGenerateImage: () => void;
  onGenerateVideo: () => void;
  onViewDetails: () => void;
  isImageLoading: boolean;
  isVideoLoading: boolean;
}
```

### Helper Functions

```typescript
// Map era name to layer color gradient
function getLayerColors(eraName: string, material: string): {
  primary: string;
  secondary: string;
  accent: string;
};

// Calculate 3D transform for layer based on scroll position
function calculateLayerTransform(
  layerIndex: number,
  totalLayers: number,
  scrollPosition: number
): { translateY: number; translateZ: number; rotateX: number };

// Map scroll position to active layer
function getActiveLayerFromScroll(
  scrollPosition: number,
  layers: GeologicalLayer[]
): GeologicalLayer | null;
```

## Data Models

Uses existing data models from the codebase:

- `GeologicalStack` - Collection of geological layers for a location
- `GeologicalLayer` - Individual layer with era, depth, material info
- `Narrative` - AI-generated narrative content
- `EraContent` - AI-generated image/video content

### New State

```typescript
interface CrossSectionState {
  scrollPosition: number;      // 0-1 normalized scroll position
  activeLayerId: string | null; // Currently selected layer
  isPanelExpanded: boolean;    // Info panel visibility
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Layer count preservation

*For any* geological stack with N layers, the rendered cross-section should contain exactly N layer elements.

**Validates: Requirements 1.1**

### Property 2: Distinct layer coloring

*For any* two geological layers with different era names or material types, the color mapping function should return different primary colors.

**Validates: Requirements 1.2**

### Property 3: Layer selection state consistency

*For any* geological stack and any layer within it, clicking that layer should result in that layer's ID being set as the active layer ID.

**Validates: Requirements 2.2**

### Property 4: Depth indicator accuracy

*For any* selected layer, the depth indicator value should equal the layer's depthStart value.

**Validates: Requirements 2.3**

### Property 5: Panel content completeness

*For any* selected layer with an associated narrative, the rendered panel should contain the era name, time period (yearsAgo), and shortDescription from the narrative.

**Validates: Requirements 3.1, 3.2**

### Property 6: AI content display

*For any* layer with generated AI content (image or video), the panel should include that content when the layer is selected.

**Validates: Requirements 3.4**

## Visual Design Direction

**Aesthetic**: Geological/Natural with depth and texture - think museum exhibit meets modern data visualization

**Key Visual Elements**:
- **Earth tones palette**: Deep browns, terracotta, slate grays, with era-specific accent colors (Jurassic greens, Carboniferous blacks, Precambrian reds)
- **Texture overlays**: Subtle noise/grain to simulate rock texture, layered transparencies for depth
- **Typography**: Display font for era names (something with character - geological/scientific feel), clean sans-serif for data
- **3D Depth**: Perspective transforms creating a "looking down into the earth" effect
- **Glow effects**: Active layer has subtle inner glow, depth indicators use soft light
- **Transitions**: Smooth parallax-style movement when scrolling through layers

**Layout**:
- Cross-section fills most of viewport height
- Info panel slides up from bottom (mobile) or appears as side panel (desktop)
- Layers have slight overlap/shadow to create stacking illusion
- Depth scale on the side showing meters/millions of years

## Error Handling

| Scenario | Handling |
|----------|----------|
| No geological data | Show placeholder with "Explore a location to see geological layers" message |
| Layer click fails | Log error, maintain current selection |
| Narrative loading fails | Show fallback text, display retry option |
| AI generation fails | Show error in panel with retry button |
| Performance degradation | Reduce visual effects, disable 3D transforms on low-end devices |

## Testing Strategy

### Property-Based Testing

Use **fast-check** for property-based tests as specified in the project's tech stack.

Each property test should:
- Generate random geological stacks with varying layer counts (1-20 layers)
- Generate random era names and material types
- Verify the property holds across 100+ iterations
- Tag tests with the format: `**Feature: 3d-cross-section, Property {number}: {property_text}**`

### Unit Tests

- Test `getLayerColors` returns valid CSS color values
- Test `calculateLayerTransform` returns valid transform values within bounds
- Test `getActiveLayerFromScroll` correctly maps scroll positions to layers
- Test edge cases: empty stack, single layer, maximum layers

### Integration Tests

- Verify CrossSectionView renders with mock geological data
- Verify layer click triggers selection callback
- Verify panel displays correct content for selected layer
