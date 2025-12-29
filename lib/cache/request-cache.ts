import { unstable_cache } from 'next/cache';

/**
 * Cache wrapper for expensive server-side operations
 * Uses Next.js unstable_cache for request memoization
 *
 * @example
 * ```typescript
 * const cachedData = cachedQuery(
 *   async () => fetchExpensiveData(),
 *   ['unique-cache-key'],
 *   { revalidate: 300, tags: ['data-tag'] }
 * );
 * ```
 */
export function cachedQuery<T>(
  queryFn: () => Promise<T>,
  keys: string[],
  options: {
    revalidate?: number; // seconds
    tags?: string[];
  } = {}
) {
  return unstable_cache(
    queryFn,
    keys,
    {
      revalidate: options.revalidate || 300, // 5 minutes default
      tags: options.tags || keys,
    }
  );
}

/**
 * Cache tags for invalidation
 * Use these when calling revalidateTag()
 */
export const CacheTags = {
  EXECUTIVE_SUMMARY: 'executive-summary',
  EVALUATOR_STATS: 'evaluator-stats',
  EPISODE_PIPELINE: 'episode-pipeline',
  WRITER_FINANCIAL: 'writer-financial',
  CRITICAL_ALERTS: 'critical-alerts',
  PIPELINE_OVERVIEW: 'pipeline-overview',
  DEPARTMENT_WORKLOAD: 'department-workload',
  ARCHIVE_ANALYTICS: 'archive-analytics',
  SCRIPTING_PHASE: 'scripting-phase',
  TOP_TEAMS: 'top-teams',
  STORIES: 'stories',
  EVALUATIONS: 'evaluations',
  CONTRACTS: 'contracts',
} as const;
