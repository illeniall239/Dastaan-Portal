import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from './keys';
// Workaround for Next.js type signature changes in revalidateTag across versions
// Use a loosely typed alias to keep usage uniform
const revTag: any = revalidateTag;

/**
 * Cache invalidation utilities
 * Use these functions to clear caches when data changes
 */

/**
 * Invalidate all evaluation-related caches
 * Call this after creating, updating, or deleting evaluations
 */
export function invalidateEvaluations() {
  revTag(CACHE_TAGS.EVALUATIONS);
}

/**
 * Invalidate all call report and meeting caches
 * Call this after creating, updating, or deleting call reports/meetings
 */
export function invalidateCallReports() {
  revTag(CACHE_TAGS.CALL_REPORTS);
  revTag(CACHE_TAGS.MEETINGS);
}

/**
 * Invalidate dashboard caches
 * Call this when dashboard data might have changed
 */
export function invalidateDashboard() {
  revTag(CACHE_TAGS.DASHBOARD);
}

/**
 * Invalidate attachment caches
 * Call this after uploading or deleting attachments
 */
export function invalidateAttachments() {
  revTag(CACHE_TAGS.ATTACHMENTS);
}

/**
 * Invalidate user-related caches
 * Call this after user profile updates
 */
export function invalidateUsers() {
  revTag(CACHE_TAGS.USERS);
}

/**
 * Invalidate all caches (nuclear option)
 * Use sparingly - only for major system changes
 */
export function invalidateAllCaches() {
  Object.values(CACHE_TAGS).forEach(tag => revTag(tag));
}

/**
 * Invalidate multiple related caches at once
 * Example: When creating an evaluation, invalidate evaluations + dashboard
 */
export function invalidateMultiple(tags: string[]) {
  tags.forEach(tag => revTag(tag));
}
