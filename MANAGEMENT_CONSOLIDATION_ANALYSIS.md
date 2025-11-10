# Management Dashboard Consolidation Analysis

## Current State

**Location:** `lib/management/`
**Total Files:** 19 files
**Total Size:** ~200KB
**Pattern:** Direct Supabase queries with mixed concerns

## File Inventory

### Core Analytics (8 files)
1. **pipeline-analytics.ts** (5.8KB) - Pipeline stage tracking, conversion rates, bottlenecks
2. **activity-analytics.ts** (7.4KB) - Weekly activities, timelines, trends
3. **archive-analytics.ts** (1.8KB) - Archive statistics and breakdowns
4. **episodes-analytics.ts** (9.5KB) - Episode production metrics
5. **scripting-analytics.ts** (4.2KB) - Script development tracking
6. **ideas-analytics.ts** (2.7KB) - Ideas funnel and source tracking
7. **evaluator-performance.ts** (9.4KB) - Evaluator workload and metrics
8. **episode-pipeline.ts** (11.6KB) - Episode workflow tracking

### Operational Data (6 files)
9. **active-projects.ts** (2.5KB) - Currently active projects
10. **active-contracts.ts** (3.0KB) - Active contract tracking
11. **pending-approvals.ts** (2.6KB) - Approval queue
12. **critical-alerts.ts** (6.9KB) - System alerts and warnings
13. **overdue-payments.ts** (2.3KB) - Payment tracking
14. **pipeline-value.ts** (2.9KB) - Financial pipeline value

### Detailed Views (3 files)
15. **active-ideas-details.ts** (2.7KB) - Detailed idea information
16. **archive-details.ts** (6.2KB) - Archive detail views
17. **weekly-activities.ts** (15.5KB) - Activity breakdowns

### Utilities (2 files)
18. **server.ts** (17.8KB) - Master aggregation functions
19. **sample-data.ts** (57.8KB) - Mock data for development

## Common Patterns Identified

### 1. Direct Database Queries
```typescript
const { data } = await supabase
  .from('stories')
  .select('*')
  .eq('status', 'active');
```

**Issue:** No abstraction, testing difficult, duplication

### 2. Inline Aggregations
```typescript
const avgTime = stories.reduce((sum, s) => {
  return sum + calculateDays(s.created_at, s.updated_at);
}, 0) / stories.length;
```

**Issue:** Business logic scattered, not reusable

### 3. Mixed Concerns
- Data fetching
- Business logic
- Calculations
- Formatting

### 4. No Caching
All queries run fresh on every request - expensive for dashboards

### 5. Error Handling
Inconsistent error handling, often returns empty data

## Proposed Architecture

### Phase 1: Repository Integration
Use existing repositories instead of direct Supabase queries:
- `CallReportRepository`
- `EvaluationRepository`
- `StoryRepository`
- `EpisodeRepository`
- etc.

### Phase 2: Service Layer
Create specialized analytics services:
```
lib/services/analytics/
├── pipeline-analytics-service.ts
├── evaluator-analytics-service.ts
├── episode-analytics-service.ts
├── financial-analytics-service.ts
└── index.ts (unified AnalyticsService)
```

### Phase 3: Caching Strategy
Implement caching for expensive queries:
- Redis for real-time dashboards
- Scheduled aggregations for historical data
- Cache invalidation on data changes

## Migration Strategy

### Approach: Strangler Fig Pattern
Incrementally replace functions while maintaining backward compatibility

### Priority Order
1. **High-Impact, Low-Complexity** (Quick wins)
   - active-projects.ts
   - pending-approvals.ts
   - overdue-payments.ts

2. **High-Impact, Medium-Complexity** (Core value)
   - pipeline-analytics.ts
   - evaluator-performance.ts
   - critical-alerts.ts

3. **Complex Analytics** (Careful migration)
   - activity-analytics.ts
   - episodes-analytics.ts
   - weekly-activities.ts

4. **Utility Files** (Last)
   - server.ts (master aggregator)
   - sample-data.ts (development only)

## Benefits of Consolidation

### Code Reduction
- Eliminate ~1,500+ lines of duplicate queries
- Centralize business logic
- Reduce maintenance burden

### Performance
- Enable caching strategies
- Optimize common queries
- Batch operations where possible

### Testability
- Mock repositories instead of Supabase
- Unit test business logic
- Integration test analytics

### Maintainability
- Single source of truth for calculations
- Consistent error handling
- Type-safe throughout

## Example: Before vs After

### Before (Current)
```typescript
// lib/management/active-projects.ts
export async function getActiveProjects() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('stories')
    .select('*')
    .not('status', 'in', '("archived","rejected")');

  return data?.map(story => ({
    id: story.id,
    title: story.title,
    // ... formatting logic
  })) || [];
}
```

### After (Proposed)
```typescript
// lib/services/analytics/pipeline-analytics-service.ts
export class PipelineAnalyticsService {
  constructor(
    private storyRepo: StoryRepository,
    private cache: CacheService
  ) {}

  async getActiveProjects() {
    const cacheKey = 'active-projects';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const stories = await this.storyRepo.findByStatus(
      ['submitted', 'in_evaluation', 'approved'],
      { order: { column: 'created_at', ascending: false } }
    );

    const result = stories.map(this.formatStoryForDashboard);
    await this.cache.set(cacheKey, result, 300); // 5 min TTL
    return result;
  }

  private formatStoryForDashboard(story: Story) {
    // Centralized formatting logic
  }
}
```

## Implementation Plan

### Day 12: Analysis & Planning ✅
- Analyze all 19 files
- Document patterns and issues
- Design new architecture
- Define migration strategy

### Day 13: Foundation (Current Phase)
- Create `lib/services/analytics/` structure
- Implement base AnalyticsService
- Migrate 3 simple files as proof of concept
- Update 3 API routes to use new services

### Day 14: Core Consolidation
- Migrate complex analytics files
- Implement caching strategy
- Update remaining API routes
- Performance testing

### Day 15-16: Polish & Document (Phase 5)
- Add unit tests
- Integration tests
- Performance benchmarks
- Migration guide
- API documentation

## Success Metrics

- [ ] All 19 files consolidated or migrated
- [ ] 100% backward compatibility maintained
- [ ] Dashboard load time reduced by >30%
- [ ] Test coverage >80%
- [ ] Zero production issues during migration

## Next Steps

1. Create analytics service foundation
2. Migrate 3 proof-of-concept files
3. Validate approach with stakeholders
4. Continue incremental migration
