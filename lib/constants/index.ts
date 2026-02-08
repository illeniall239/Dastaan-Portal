/**
 * Application Constants
 *
 * Centralized constants for roles, statuses, cache durations, and other magic values.
 * This improves maintainability and reduces the risk of typos.
 */

// ============================================================================
// USER ROLES
// ============================================================================

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGEMENT: 'management',
  EXECUTIVE: 'executive',
  EVALUATOR: 'evaluator',
  PROGRAMMER: 'programmer',
  CONTENT_MANAGER: 'content_manager',
  CONTENT_CREATOR: 'content_creator',
  CONTENT_HEAD: 'content_head',
  GCM: 'gcm',
  LEGAL: 'legal',
  FINANCE: 'finance',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Roles that can evaluate
export const EVALUATOR_ROLES = [
  USER_ROLES.EVALUATOR,
  USER_ROLES.MANAGEMENT,
  USER_ROLES.PROGRAMMER,
] as const;

// Roles with global access
export const ADMIN_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.PROGRAMMER,
] as const;

// ============================================================================
// STATUSES
// ============================================================================

export const EVALUATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
} as const;

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_IMPROVEMENT: 'needs_improvement',
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const;

// ============================================================================
// CACHE DURATIONS (in seconds)
// ============================================================================

export const CACHE_DURATION = {
  // Real-time data (1 minute)
  REALTIME: 60,
  // Analytics/aggregate data (5 minutes)
  ANALYTICS: 300,
  // Static/infrequent updates (15 minutes)
  STATIC: 900,
  // Long-term cache (1 hour)
  LONG: 3600,
} as const;

export const STALE_WHILE_REVALIDATE = {
  // For real-time data (2 minutes)
  REALTIME: 120,
  // For analytics (10 minutes)
  ANALYTICS: 600,
  // For static content (30 minutes)
  STATIC: 1800,
  // For long-term cache (2 hours)
  LONG: 7200,
} as const;

// Helper to create Cache-Control header
export function createCacheControl(
  duration: number,
  staleWhileRevalidate?: number
): string {
  const swr = staleWhileRevalidate ?? duration * 2;
  return `public, s-maxage=${duration}, stale-while-revalidate=${swr}`;
}

// ============================================================================
// RATE LIMITS
// ============================================================================

export const RATE_LIMITS = {
  // Authentication endpoints (10 req/min)
  AUTH_STRICT: { limit: 10, window: 60 * 1000 },
  // Standard API endpoints (30 req/min)
  STANDARD: { limit: 30, window: 60 * 1000 },
  // Relaxed for read-only (100 req/min)
  RELAXED: { limit: 100, window: 60 * 1000 },
  // Very strict for sensitive ops (5 req/5min)
  VERY_STRICT: { limit: 5, window: 5 * 60 * 1000 },
  // Public endpoints (10 req/hour)
  PUBLIC: { limit: 10, window: 60 * 60 * 1000 },
} as const;

// ============================================================================
// TIMEOUTS (in milliseconds)
// ============================================================================

export const TIMEOUTS = {
  // API request timeout
  API_REQUEST: 30000, // 30 seconds
  // Database query timeout
  DB_QUERY: 10000, // 10 seconds
  // File upload timeout
  FILE_UPLOAD: 60000, // 60 seconds
  // Default timeout
  DEFAULT: 5000, // 5 seconds
} as const;

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

// ============================================================================
// FILE UPLOAD
// ============================================================================

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_SIZE_IMAGE: 5 * 1024 * 1024, // 5 MB
  ALLOWED_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    SCRIPTS: ['application/pdf', 'text/plain'],
  },
} as const;

// ============================================================================
// EVALUATION SCORES
// ============================================================================

export const EVALUATION_SCORES = {
  MIN: 1,
  MAX: 10,
  PASSING_THRESHOLD: 6,
} as const;

// ============================================================================
// DATE/TIME
// ============================================================================

export const DATE_TIME = {
  // Number of weeks for activity heatmap
  HEATMAP_WEEKS: 12,
  // Days in a week
  DAYS_IN_WEEK: 7,
  // Hours in a day
  HOURS_IN_DAY: 24,
} as const;
