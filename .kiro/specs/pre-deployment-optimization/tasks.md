# Implementation Plan

- [ ] 1. Fix critical security issue - Remove exposed API keys
  - Remove hardcoded API key from `.env` file
  - Clear `.env` file and add comment directing users to provide their own keys
  - Verify `.env` is in `.gitignore`
  - Test that application prompts for API key on startup when none is configured
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 1.1 Write property test for API key security
  - **Property 1: No API keys in environment files**
  - **Validates: Requirements 1.1**

- [ ]* 1.2 Write property test for API key prompt behavior
  - **Property 2: API key prompt on missing key**
  - **Validates: Requirements 1.3**

- [ ]* 1.3 Write property test for API key storage location
  - **Property 3: API key storage location**
  - **Validates: Requirements 1.4**

- [ ]* 1.4 Write example test for repository structure
  - **Example 1: Repository structure validation**
  - **Validates: Requirements 1.2**

- [ ] 2. Fix cost tracking calculations
  - Update `CACHED_COST_PER_1M` constant in `deep-time-app/src/services/ai/types.ts` from 0.075 to 0.03
  - Verify `calculateTokenUsage()` in `textGenerator.ts` uses the correct constant
  - Update cost calculation documentation
  - _Requirements: 2.1, 2.3_

- [ ]* 2.1 Write property test for cached token cost calculation
  - **Property 4: Cached token cost calculation**
  - **Validates: Requirements 2.1**

- [ ]* 2.2 Write property test for cost report structure
  - **Property 5: Cost report structure**
  - **Validates: Requirements 2.2**

- [ ]* 2.3 Write example test for cached token pricing constant
  - **Example 2: Cached token pricing constant**
  - **Validates: Requirements 2.3**

- [x] 3. Optimize model selection for cost savings
  - Update `MODEL_USE_CASES.ERA_NARRATIVE` in `deep-time-app/src/config/aiModels.ts` to use 'gemini-2.5-flash-lite'
  - Update model specifications documentation in the same file
  - Verify narrative generation still produces valid JSON with required fields
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.1 Write example test for ERA_NARRATIVE model configuration
  - **Example 3: ERA_NARRATIVE model configuration**
  - **Validates: Requirements 3.1, 3.2**

- [x] 3.2 Write property test for narrative output validation
  - **Property 6: Narrative output validation**
  - **Validates: Requirements 3.3**

- [x] 4. Reduce token limits to prevent waste
  - Update default `maxOutputTokens` in `deep-time-app/src/services/ai/textGenerator.ts` from 8192 to 2048
  - Update the `TextGenerationOptions` interface documentation
  - Verify narratives complete successfully within the 2048 token limit
  - _Requirements: 4.1_

- [x] 4.1 Write example test for max output tokens default
  - **Example 4: Max output tokens default**
  - **Validates: Requirements 4.1**

- [x] 5. Optimize video generation defaults
  - Update `DEFAULT_VIDEO_DURATION` in `deep-time-app/src/services/ai/types.ts` from 6 to 4
  - Update cost calculation documentation
  - Verify 4-second videos meet quality requirements
  - _Requirements: 5.1, 5.3_

- [x] 5.1 Write example test for default video duration
  - **Example 5: Default video duration**
  - **Validates: Requirements 5.1**

- [ ]* 5.2 Write example test for video cost calculation
  - **Example 6: Video cost calculation**
  - **Validates: Requirements 5.3**

- [x] 6. Consolidate duplicate narrative services
  - Verify all narrative generation requests use `textGenerator.ts`
  - Mark `deep-time-app/src/services/narrative.ts` as deprecated or remove it
  - Update any imports that reference the legacy service
  - Ensure all existing functionality remains operational
  - _Requirements: 6.1, 6.2_

- [x] 6.1 Write property test for narrative service routing
  - **Property 7: Narrative service routing**
  - **Validates: Requirements 6.1**

- [x] 6.2 Write example test for duplicate service removal
  - **Example 7: Duplicate service removal**
  - **Validates: Requirements 6.2**

- [x] 7. Clean up unused model configurations
  - Remove or mark as deprecated unused model configurations (QUIZ_GENERATION, PERSONALIZATION) in `deep-time-app/src/config/aiModels.ts`
  - Update documentation to clarify which models are actively used
  - _Requirements: 7.1, 7.2_

- [x] 7.1 Write property test for model configuration usage
  - **Property 8: Model configuration usage**
  - **Validates: Requirements 7.1**

- [x] 7.2 Write example test for unused configuration cleanup
  - **Example 8: Unused configuration cleanup**
  - **Validates: Requirements 7.2**

- [x] 8. Optimize explicit cache threshold
  - Update `EXPLICIT_CACHE_MIN_TOKENS` in `deep-time-app/src/services/ai/explicitCacheService.ts` from 4096 to 512
  - Update documentation explaining the threshold change
  - Verify explicit caching activates appropriately for geological prompts
  - _Requirements: 8.1, 8.2_

- [x] 8.1 Write example test for explicit cache threshold
  - **Example 9: Explicit cache threshold**
  - **Validates: Requirements 8.1**

- [x] 8.2 Write property test for cache threshold activation
  - **Property 9: Explicit cache threshold activation**
  - **Validates: Requirements 8.2**

- [x] 9. Checkpoint - Verify all changes and run tests
  - Ensure all tests pass, ask the user if questions arise.
