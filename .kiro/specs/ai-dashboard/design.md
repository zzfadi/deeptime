# AI Dashboard Design Document

## Overview

The AI Dashboard provides a visually striking metrics interface for monitoring DeepTime's AI API usage. Built with React and Tailwind CSS, it integrates with the existing `costTrackingService` to display real-time usage data in a dark geological theme that matches the app's aesthetic.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Page Router                         │   │
│  │  home | era-detail | ar | dashboard             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  AIDashboard.tsx                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ MetricCard  │  │ MetricCard  │  │ MetricCard  │    │
│  │ API Calls   │  │ Cache Hits  │  │ Total Cost  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│  ┌─────────────────────────────────────────────────┐   │
│  │           CostBreakdown Component               │   │
│  │  Text Cost | Image Cost | Video Cost            │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │           CacheHitRate Component                │   │
│  │  Visual progress indicator with percentage      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              costTrackingService                        │
│  getDailyCost() → DailyCostRecord                      │
│  getTodayCacheHitRate() → number                       │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### AIDashboard Component

Main dashboard page component that fetches and displays usage metrics.

```typescript
interface AIDashboardProps {
  onBack: () => void;
}

interface DashboardMetrics {
  apiCalls: number;
  cacheHits: number;
  totalCost: number;
  textCost: number;
  imageCost: number;
  videoCost: number;
  cacheHitRate: number;
}
```

### MetricCard Component

Reusable card for displaying individual metrics with icon and label.

```typescript
interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  color?: 'amber' | 'emerald' | 'blue' | 'purple';
}
```

## Data Models

Uses existing `DailyCostRecord` from `costTrackingService`:

```typescript
interface DailyCostRecord {
  date: string;
  apiCalls: number;
  cacheHits: number;
  textCost: number;
  imageCost: number;
  videoCost: number;
  totalCost: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Metrics display accuracy
*For any* DailyCostRecord, the dashboard SHALL display values that exactly match the record's apiCalls, cacheHits, and totalCost fields.
**Validates: Requirements 1.1**

### Property 2: Cache hit rate calculation
*For any* combination of apiCalls and cacheHits where total > 0, the displayed cache hit rate SHALL equal cacheHits / (apiCalls + cacheHits) * 100.
**Validates: Requirements 1.2**

### Property 3: Cost breakdown accuracy
*For any* DailyCostRecord, the sum of displayed textCost, imageCost, and videoCost SHALL equal the totalCost (within floating point tolerance).
**Validates: Requirements 1.3**

## Error Handling

- **No data available**: Display zero values with "No usage today" message
- **Service unavailable**: Show cached last-known values with stale indicator
- **Loading state**: Display skeleton placeholders during data fetch

## Testing Strategy

### Property-Based Testing
- Use `fast-check` for generating random DailyCostRecord instances
- Test metric display accuracy across all valid input ranges
- Test cache hit rate calculation with edge cases (0 calls, 100% hits, etc.)

### Unit Testing
- Test MetricCard renders correct values
- Test navigation (back button functionality)
- Test loading and error states

## Visual Design

### Theme
- Dark geological theme matching DeepTime's aesthetic
- Deep slate backgrounds with amber/emerald accents
- Subtle grain texture overlay for depth
- Smooth fade-in animations on load

### Layout
- Header with back navigation and title
- 3-column metric cards grid (responsive to 1 column on mobile)
- Cost breakdown section with horizontal bar visualization
- Cache hit rate with circular progress indicator
