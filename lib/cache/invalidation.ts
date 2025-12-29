'use server';

import { revalidateTag } from 'next/cache';
import { CacheTags } from './request-cache';

/**
 * Invalidate all management dashboard caches
 * Call this when data changes that affects the dashboard
 */
export async function invalidateManagementCache() {
  revalidateTag(CacheTags.EXECUTIVE_SUMMARY, '');
  revalidateTag(CacheTags.EVALUATOR_STATS, '');
  revalidateTag(CacheTags.EPISODE_PIPELINE, '');
  revalidateTag(CacheTags.WRITER_FINANCIAL, '');
  revalidateTag(CacheTags.CRITICAL_ALERTS, '');
  revalidateTag(CacheTags.PIPELINE_OVERVIEW, '');
  revalidateTag(CacheTags.DEPARTMENT_WORKLOAD, '');
  revalidateTag(CacheTags.ARCHIVE_ANALYTICS, '');
  revalidateTag(CacheTags.SCRIPTING_PHASE, '');
  revalidateTag(CacheTags.TOP_TEAMS, '');
}

/**
 * Invalidate story-related caches
 * Call when stories are created/updated
 */
export async function invalidateStoryCache() {
  revalidateTag(CacheTags.STORIES, '');
  revalidateTag(CacheTags.EXECUTIVE_SUMMARY, '');
  revalidateTag(CacheTags.PIPELINE_OVERVIEW, '');
  revalidateTag(CacheTags.ARCHIVE_ANALYTICS, '');
}

/**
 * Invalidate evaluation-related caches
 * Call when evaluations are submitted
 */
export async function invalidateEvaluationCache() {
  revalidateTag(CacheTags.EVALUATIONS, '');
  revalidateTag(CacheTags.EVALUATOR_STATS, '');
  revalidateTag(CacheTags.EPISODE_PIPELINE, '');
}

/**
 * Invalidate contract-related caches
 * Call when contracts/negotiations/payments change
 */
export async function invalidateContractCache() {
  revalidateTag(CacheTags.CONTRACTS, '');
  revalidateTag(CacheTags.WRITER_FINANCIAL, '');
  revalidateTag(CacheTags.PIPELINE_OVERVIEW, '');
}
