# Requirements Document

## Introduction

This specification addresses critical security vulnerabilities and cost optimization opportunities identified in the DeepTime application before public deployment. The system must ensure API keys are properly secured, AI service costs are accurately tracked and minimized, and the codebase is streamlined to remove redundant implementations.

## Glossary

- **API Key**: Authentication credential for accessing Google AI services (Gemini, Veo)
- **Cached Token**: Previously processed input token that receives 90% cost discount via prompt caching
- **Flash-Lite**: Lower-cost Gemini model variant suitable for simple JSON responses
- **Batch API**: Google AI service offering 50% cost reduction for bulk operations
- **Explicit Cache**: Gemini feature for caching prompts exceeding a token threshold
- **Cost Tracking Service**: System component that monitors and reports AI API usage costs
- **Narrative Service**: Component responsible for generating era-specific text content

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want all exposed API keys removed from the codebase, so that unauthorized users cannot consume my API quota.

#### Acceptance Criteria

1. WHEN the application repository is inspected THEN the system SHALL contain no hardcoded API keys in any environment files
2. WHEN a developer clones the repository THEN the system SHALL provide only example configuration files without actual credentials
3. WHEN the application starts without an API key THEN the system SHALL prompt the user to provide their own key
4. WHEN an API key is provided by the user THEN the system SHALL store it securely in browser localStorage only

### Requirement 2

**User Story:** As a cost-conscious developer, I want accurate cost reporting for cached tokens, so that I can understand my actual API expenses.

#### Acceptance Criteria

1. WHEN cached tokens are used in API requests THEN the Cost Tracking Service SHALL apply the correct 90% discount rate of $0.03 per 1M tokens
2. WHEN cost reports are generated THEN the system SHALL distinguish between cached and uncached token costs
3. WHEN calculating total costs THEN the system SHALL use the constant value 0.03 for cached token pricing

### Requirement 3

**User Story:** As a cost-conscious developer, I want to use the most cost-effective AI models for each task, so that I minimize API expenses without sacrificing quality.

#### Acceptance Criteria

1. WHEN generating era narrative text THEN the system SHALL use the gemini-2.5-flash-lite model
2. WHEN the model configuration is queried THEN the system SHALL return flash-lite for ERA_NARRATIVE operations
3. WHEN narrative generation completes THEN the system SHALL produce valid JSON responses meeting quality requirements

### Requirement 4

**User Story:** As a cost-conscious developer, I want to limit token generation to necessary amounts, so that I avoid paying for excessive output tokens.

#### Acceptance Criteria

1. WHEN requesting text generation THEN the system SHALL set maxOutputTokens to 2048 or less
2. WHEN narrative JSON is generated THEN the system SHALL complete successfully within the 2048 token limit
3. WHEN token limits are configured THEN the system SHALL not exceed values appropriate for the content type

### Requirement 5

**User Story:** As a cost-conscious developer, I want to reduce video generation costs, so that I can provide video content at lower expense.

#### Acceptance Criteria

1. WHEN generating videos without explicit duration THEN the system SHALL default to 4 seconds
2. WHEN video generation completes THEN the system SHALL produce videos meeting quality requirements at the shorter duration
3. WHEN video costs are calculated THEN the system SHALL reflect the reduced cost of $0.60 per 4-second video

### Requirement 6

**User Story:** As a developer, I want a single narrative generation implementation, so that the codebase is maintainable and consistent.

#### Acceptance Criteria

1. WHEN narrative text is requested THEN the system SHALL use only the REST API implementation in textGenerator
2. WHEN the codebase is inspected THEN the system SHALL contain no duplicate narrative service implementations
3. WHEN legacy narrative service code is removed THEN all existing functionality SHALL remain operational

### Requirement 7

**User Story:** As a developer, I want unused model configurations removed, so that the configuration is clear and maintainable.

#### Acceptance Criteria

1. WHEN model configurations are inspected THEN the system SHALL contain only actively used model assignments
2. WHEN unused configurations exist THEN the system SHALL clearly mark them as deprecated or remove them
3. WHEN the configuration is read THEN developers SHALL not encounter confusion about which models are in use

### Requirement 8

**User Story:** As a cost-conscious developer, I want explicit caching to activate at appropriate thresholds, so that the feature provides actual cost savings.

#### Acceptance Criteria

1. WHEN the explicit cache threshold is configured THEN the system SHALL use a value of 512 tokens or less
2. WHEN geological context prompts are generated THEN the system SHALL trigger explicit caching when appropriate
3. WHEN explicit caching activates THEN the system SHALL achieve measurable cost savings on repeated prompts
