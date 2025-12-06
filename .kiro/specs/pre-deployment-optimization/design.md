# Design Document

## Overview

This design addresses critical security vulnerabilities and cost optimization opportunities in the DeepTime AI service layer before public deployment. The system currently has an exposed API key, incorrect cost tracking constants, and suboptimal model/configuration choices that result in unnecessary API expenses. This design provides a systematic approach to:

1. Remove all hardcoded API keys from the repository
2. Fix cost tracking calculations for accurate reporting
3. Optimize AI model selection for cost-effectiveness
4. Reduce token limits to prevent waste
5. Adjust video generation defaults for cost savings
6. Consolidate duplicate service implementations
7. Clean up unused configuration
8. Optimize explicit caching thresholds

## Architecture

### Current Architecture

The DeepTime application uses a multi-layered AI service architecture:

```
┌─────────────────────────────────────────┐
│         React Components                │
│  (EraDetail, ApiKeyModal, etc.)         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Content Orchestrator               │
│  (Cache-first content retrieval)        │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼─────┐   ┌─────▼──────┐
│   Text     │   │   Image    │
│ Generator  │   │ Generator  │
└────────────┘   └────────────┘
       │                │
┌──────▼─────┐   ┌─────▼──────┐
│   Video    │   │   Cost     │
│ Generator  │   │  Tracking  │
└────────────┘   └────────────┘
```

### Security Model

**Current State:**
- API keys hardcoded in `.env` file
- Keys committed to repository (security risk)
- No runtime key validation

**Target State:**
- No API keys in repository
- Runtime key provision via ApiKeyModal
- Keys stored only in browser localStorage
- Validation before API calls

### Cost Tracking Model

**Current State:**
- Incorrect cached token pricing (0.075 instead of 0.03)
- Cost reports show 2.5× higher costs than actual
- Misleading cost analysis

**Target State:**
- Correct cached token pricing (0.03 per 1M tokens)
- Accurate cost reporting
- Proper distinction between cached/uncached costs

## Components and Interfaces

### 1. API Key Management

**ApiKeyModal Component** (existing)
- Already handles runtime key provision
- Stores keys in localStorage
- Provides `getActiveApiKey()` helper

**Changes Required:**
- Remove hardcoded keys from `.env`
- Update `.env.example` to show structure only
- Ensure all generators check for key before API calls

### 2. Cost Tracking Service

**Location:** `deep-time-app/src/services/ai/costTrackingService.ts`

**Interface:**
```typescript
interface CostTrackingService {
  logApiCost(
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number,
    mediaType?: 'text' | 'image' | 'video'
  ): Promise<void>;
  
  getDailyCost(date: string): Promise<DailyCostRecord>;
  getTotalCost(): Promise<number>;
}
```

**Changes Required:**
- Update `CACHED_COST_PER_1M` constant in `types.ts`
- Verify all cost calculations use correct constants
- Update `calculateTokenUsage()` in textGenerator

### 3. Model Configuration

**Location:** `deep-time-app/src/config/aiModels.ts`

**Current Configuration:**
```typescript
ERA_NARRATIVE: 'gemini-2.5-flash'  // $0.30/$2.50 per 1M
```

**Target Configuration:**
```typescript
ERA_NARRATIVE: 'gemini-2.5-flash-lite'  // $0.10/$0.40 per 1M
```

**Changes Required:**
- Update `MODEL_USE_CASES.ERA_NARRATIVE`
- Update model specs documentation
- Verify narrative quality with Flash-Lite

### 4. Text Generator Service

**Location:** `deep-time-app/src/services/ai/textGenerator.ts`

**Current Configuration:**
```typescript
maxOutputTokens: 8192  // Very high
```

**Target Configuration:**
```typescript
maxOutputTokens: 2048  // Sufficient for narrative JSON
```

**Changes Required:**
- Update default `maxOutputTokens` in generation options
- Verify narratives complete within 2048 tokens
- Update documentation

### 5. Video Generator Service

**Location:** `deep-time-app/src/services/ai/videoGenerator.ts`

**Current Configuration:**
```typescript
DEFAULT_VIDEO_DURATION = 6  // $0.90 per video
```

**Target Configuration:**
```typescript
DEFAULT_VIDEO_DURATION = 4  // $0.60 per video
```

**Changes Required:**
- Update `DEFAULT_VIDEO_DURATION` constant
- Update cost calculations
- Verify 4-second videos meet quality requirements

### 6. Narrative Service Consolidation

**Current State:**
- `textGenerator.ts` - REST API implementation (active)
- `narrative.ts` - Legacy SDK implementation (unused)

**Target State:**
- Single implementation in `textGenerator.ts`
- Remove or deprecate `narrative.ts`
- Update all imports

### 7. Explicit Cache Service

**Location:** `deep-time-app/src/services/ai/explicitCacheService.ts`

**Current Configuration:**
```typescript
EXPLICIT_CACHE_MIN_TOKENS = 4096  // Rarely reached
```

**Target Configuration:**
```typescript
EXPLICIT_CACHE_MIN_TOKENS = 512  // More practical threshold
```

**Changes Required:**
- Update threshold constant
- Verify cache activation with geological prompts
- Monitor cache hit rates

## Data Models

### Cost Tracking Constants

**Location:** `deep-time-app/src/services/ai/types.ts`

```typescript
// Current (INCORRECT)
export const CACHED_COST_PER_1M = 0.075;  // 75% discount

// Target (CORRECT)
export const CACHED_COST_PER_1M = 0.03;   // 90% discount (10× cheaper)
```

### Model Pricing

```typescript
// Flash-Lite (Target for ERA_NARRATIVE)
{
  input: 0.10,   // per 1M tokens
  output: 0.40,  // per 1M tokens
}

// Flash (Current for ERA_NARRATIVE)
{
  input: 0.30,   // per 1M tokens
  output: 2.50,  // per 1M tokens
}
```

### Video Pricing

```typescript
// Veo 3.1 Fast
const VIDEO_COST_PER_SECOND_FAST = 0.15;

// Current: 6 seconds = $0.90
// Target:  4 seconds = $0.60
// Savings: 33%
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, the following redundancies were identified:

- **Requirements 3.1 and 3.2**: Both test model configuration lookup for ERA_NARRATIVE. These can be combined into a single property.
- **Requirements 6.2 and 7.2**: Both are about code structure inspection rather than runtime behavior. These are implementation verification tasks, not runtime properties.

The remaining properties provide unique validation value and will be included below.

### Correctness Properties

Property 1: No API keys in environment files
*For any* environment file in the repository, scanning for API key patterns should return no matches
**Validates: Requirements 1.1**

Property 2: API key prompt on missing key
*For any* application start state where getActiveApiKey() returns empty or null, the ApiKeyModal should be displayed to the user
**Validates: Requirements 1.3**

Property 3: API key storage location
*For any* user-provided API key, after storage the key should exist in localStorage and not in any other storage mechanism
**Validates: Requirements 1.4**

Property 4: Cached token cost calculation
*For any* positive number of cached tokens, the calculated cost should equal (tokens / 1,000,000) × 0.03
**Validates: Requirements 2.1**

Property 5: Cost report structure
*For any* generated cost report, the report should contain distinct fields for cached token costs and uncached token costs
**Validates: Requirements 2.2**

Property 6: Narrative output validation
*For any* generated narrative, the output should be valid JSON containing all required fields (shortDescription, flora, fauna, climate)
**Validates: Requirements 3.3**

Property 7: Narrative service routing
*For any* narrative generation request, the request should be handled by textGenerator and not by the legacy narrative service
**Validates: Requirements 6.1**

Property 8: Model configuration usage
*For any* model identifier in MODEL_USE_CASES, that model should be referenced in at least one service implementation
**Validates: Requirements 7.1**

Property 9: Explicit cache threshold activation
*For any* geological context prompt with token count above EXPLICIT_CACHE_MIN_TOKENS, the shouldUseExplicitCache() function should return true
**Validates: Requirements 8.2**

### Example-Based Tests

The following criteria are best validated through specific example tests rather than properties:

Example 1: Repository structure validation
Verify that `.env.example` exists and `.env` (if present) contains no real API keys
**Validates: Requirements 1.2**

Example 2: Cached token pricing constant
Verify that `CACHED_COST_PER_1M` equals 0.03
**Validates: Requirements 2.3**

Example 3: ERA_NARRATIVE model configuration
Verify that `MODEL_USE_CASES.ERA_NARRATIVE` equals 'gemini-2.5-flash-lite'
**Validates: Requirements 3.1, 3.2**

Example 4: Max output tokens default
Verify that the default `maxOutputTokens` is 2048 or less
**Validates: Requirements 4.1**

Example 5: Default video duration
Verify that `DEFAULT_VIDEO_DURATION` equals 4
**Validates: Requirements 5.1**

Example 6: Video cost calculation
Verify that a 4-second video costs exactly $0.60 (4 × $0.15)
**Validates: Requirements 5.3**

Example 7: Duplicate service removal
Verify that the legacy `narrative.ts` file is either removed or marked as deprecated
**Validates: Requirements 6.2**

Example 8: Unused configuration cleanup
Verify that unused model configurations (QUIZ_GENERATION, PERSONALIZATION) are removed or marked deprecated
**Validates: Requirements 7.2**

Example 9: Explicit cache threshold
Verify that `EXPLICIT_CACHE_MIN_TOKENS` is 512 or less
**Validates: Requirements 8.1**

## Error Handling

### API Key Errors

**Error Type:** `invalid_key`

**Handling Strategy:**
1. Check for API key before any API call
2. Display ApiKeyModal if key is missing
3. Prevent API calls without valid key
4. Show user-friendly error message

**Implementation:**
```typescript
if (!isApiKeyConfigured(apiKey)) {
  console.warn('[Service] No API key configured');
  // Return fallback or show modal
  return getFallbackContent();
}
```

### Cost Calculation Errors

**Error Type:** `calculation_error`

**Handling Strategy:**
1. Validate token counts are non-negative
2. Use correct constants for all calculations
3. Log calculation errors for debugging
4. Default to zero cost on error (fail safe)

**Implementation:**
```typescript
try {
  const cost = calculateTokenUsage(input, output, cached);
  return cost;
} catch (error) {
  console.error('[CostTracking] Calculation error:', error);
  return { totalCost: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
}
```

### Model Configuration Errors

**Error Type:** `invalid_model`

**Handling Strategy:**
1. Validate model exists in configuration
2. Fall back to default model if invalid
3. Log configuration errors
4. Continue with fallback model

**Implementation:**
```typescript
const model = MODEL_USE_CASES[useCase] || MODEL_USE_CASES.ERA_NARRATIVE;
if (!model) {
  console.warn('[ModelConfig] Invalid use case, using default');
  return GEMINI_MODELS.FLASH_LITE;
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify:
- Constant values are correct (CACHED_COST_PER_1M, DEFAULT_VIDEO_DURATION, etc.)
- Model configuration returns expected values
- Cost calculations use correct formulas
- API key validation logic works correctly
- File structure matches requirements (.env.example exists, .env has no keys)

**Test Files:**
- `tests/config/constants.test.ts` - Verify all constant values
- `tests/config/models.test.ts` - Verify model configuration
- `tests/services/costCalculation.test.ts` - Verify cost formulas
- `tests/security/apiKeys.test.ts` - Verify no hardcoded keys

### Property-Based Testing

Property-based tests will use `fast-check` to verify:
- Cost calculations are correct for any token count
- API key storage works for any valid key string
- Narrative validation works for any generated output
- Cache threshold logic works for any token count

**Test Files:**
- `tests/optimization/costTracking.property.test.ts`
- `tests/optimization/apiKeySecurity.property.test.ts`
- `tests/optimization/modelConfig.property.test.ts`
- `tests/optimization/cacheThreshold.property.test.ts`

**Property Test Configuration:**
- Minimum 100 iterations per property
- Use appropriate generators for each domain (token counts, API keys, etc.)
- Tag each test with the property number from this design document

### Integration Testing

Integration tests will verify:
- Narrative generation works with Flash-Lite model
- Videos generate successfully at 4 seconds
- Cost tracking accurately reflects API usage
- Explicit caching activates at correct threshold

**Test Approach:**
- Use actual API calls with test API key
- Verify end-to-end flows work correctly
- Check that optimizations don't break functionality
- Measure actual cost savings

### Manual Testing

Manual verification required for:
- Video quality at 4 seconds vs 6 seconds
- Narrative quality with Flash-Lite vs Flash
- User experience with API key modal
- Cost savings in production usage

## Implementation Notes

### Migration Strategy

1. **Phase 1: Security (Critical)**
   - Remove hardcoded API keys
   - Clear .env file
   - Test API key modal flow

2. **Phase 2: Cost Tracking (High Priority)**
   - Fix CACHED_COST_PER_1M constant
   - Verify cost calculations
   - Update cost reports

3. **Phase 3: Model Optimization (High Priority)**
   - Switch to Flash-Lite for narratives
   - Reduce maxOutputTokens to 2048
   - Test narrative quality

4. **Phase 4: Video Optimization (Medium Priority)**
   - Change default duration to 4 seconds
   - Test video quality
   - Verify cost savings

5. **Phase 5: Code Cleanup (Medium Priority)**
   - Remove duplicate narrative service
   - Clean up unused model configs
   - Update explicit cache threshold

### Rollback Plan

If any optimization causes issues:

1. **Model Changes:** Revert MODEL_USE_CASES to previous values
2. **Token Limits:** Increase maxOutputTokens back to 8192
3. **Video Duration:** Revert to 6 seconds default
4. **Cache Threshold:** Revert to 4096 tokens

All changes are configuration-based and can be reverted quickly without code changes.

### Monitoring

After deployment, monitor:
- API error rates (should not increase)
- Cost per request (should decrease 40-60%)
- Cache hit rates (should improve with lower threshold)
- User complaints about quality (should be minimal)
- API key modal display rate (should be 100% for new users)

## Dependencies

### External Dependencies

- Google Gemini API (existing)
- Google Veo API (existing)
- Browser localStorage API (existing)
- IndexedDB (existing)

### Internal Dependencies

- ApiKeyModal component (existing)
- Cost Tracking Service (existing)
- Text Generator Service (existing)
- Video Generator Service (existing)
- Explicit Cache Service (existing)
- Model Configuration (existing)

### Configuration Files

- `deep-time-app/src/services/ai/types.ts` - Cost constants
- `deep-time-app/src/config/aiModels.ts` - Model selection
- `deep-time-app/.env.example` - Example configuration
- `deep-time-app/.env` - To be cleared

## Performance Considerations

### Cost Savings

Expected savings from optimizations:

| Optimization | Monthly Savings* | Implementation Effort |
|--------------|------------------|----------------------|
| Fix cached token pricing | Reporting only | Trivial |
| Use Flash-Lite for narratives | 70-85% on text | Low |
| Reduce video to 4 seconds | 33% on video | Low |
| Lower maxOutputTokens | Marginal | Trivial |
| **Combined Impact** | **40-60% overall** | **Low** |

*Assumes moderate usage: ~1000 narratives, 500 images, 100 videos/month

### API Rate Limits

No changes to rate limit handling required. All optimizations work within existing rate limits.

### Cache Performance

Lowering explicit cache threshold from 4096 to 512 tokens should:
- Increase cache hit rate for geological prompts
- Reduce API calls for repeated locations
- Improve response times for cached content

## Security Considerations

### API Key Protection

**Current Risk:** Exposed API key in repository
**Mitigation:** Remove all hardcoded keys, use runtime provision only

**Security Checklist:**
- [ ] Remove API key from `.env`
- [ ] Clear `.env` file completely
- [ ] Verify `.env` is in `.gitignore`
- [ ] Test that app prompts for key on first run
- [ ] Verify keys are stored only in localStorage
- [ ] Document key management in README

### Data Privacy

No changes to data privacy model. User data remains:
- Stored locally in IndexedDB
- Optionally synced to Firestore (user's own project)
- Never sent to third parties except Google AI APIs

## Deployment Checklist

### Pre-Deployment

- [ ] Revoke exposed API key at Google AI Studio
- [ ] Remove all hardcoded keys from codebase
- [ ] Update constants (CACHED_COST_PER_1M, DEFAULT_VIDEO_DURATION, etc.)
- [ ] Switch ERA_NARRATIVE to Flash-Lite
- [ ] Reduce maxOutputTokens to 2048
- [ ] Lower explicit cache threshold to 512
- [ ] Remove or deprecate legacy narrative service
- [ ] Clean up unused model configurations
- [ ] Run all unit tests
- [ ] Run all property-based tests
- [ ] Test API key modal flow
- [ ] Verify cost calculations are correct
- [ ] Test narrative generation with Flash-Lite
- [ ] Test video generation at 4 seconds

### Post-Deployment

- [ ] Monitor API error rates
- [ ] Monitor cost per request
- [ ] Monitor cache hit rates
- [ ] Monitor user feedback
- [ ] Verify cost savings match projections
- [ ] Update documentation with new defaults

## Future Enhancements

### Batch API Implementation

**Opportunity:** 50% cost reduction for bulk operations
**Use Case:** `preloadAdjacentEras()` in contentOrchestrator
**Effort:** Medium
**Priority:** Long-term

**Implementation:**
- Use Batch API for preloading multiple eras
- Queue requests and submit as batch
- Handle async batch completion
- Update cost tracking for batch pricing

### Per-Model Cost Breakdown

**Opportunity:** Better cost visibility
**Effort:** Low
**Priority:** Post-launch

**Implementation:**
- Track costs separately by model
- Show breakdown in cost reports
- Identify highest-cost operations
- Guide further optimizations

### Historical Cost Trends

**Opportunity:** Cost trend analysis
**Effort:** Medium
**Priority:** Post-launch

**Implementation:**
- Store daily costs over time
- Visualize cost trends
- Alert on unusual spikes
- Project future costs
