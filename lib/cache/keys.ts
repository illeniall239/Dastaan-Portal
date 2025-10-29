/**
 * Cache key constants for unstable_cache
 * Centralized management of cache keys for consistency and invalidation
 */

// Evaluation cache keys
export const CACHE_KEYS = {
  // Evaluations
  EVALUATIONS_ALL: 'evaluations:all',
  EVALUATIONS_BY_EVALUATOR: (userId: string) => `evaluations:evaluator:${userId}`,
  EVALUATION_BY_ID: (id: string) => `evaluation:${id}`,
  EVALUATIONS_BY_CALL_REPORT: (callReportId: string) => `evaluations:call-report:${callReportId}`,
  EVALUATION_AGGREGATE: (callReportId: string) => `evaluation:aggregate:${callReportId}`,

  // Call Reports & Meetings
  MEETINGS_ALL: 'meetings:all',
  CALL_REPORTS_ALL: 'call-reports:all',
  MEETINGS_BY_DATE_RANGE: (start: string, end: string) => `meetings:range:${start}:${end}`,

  // Dashboard
  RECENT_ACTIVITY: (limit: number) => `dashboard:activity:${limit}`,
  DASHBOARD_STATS: (userId: string) => `dashboard:stats:${userId}`,

  // Attachments
  ATTACHMENTS_BY_ENTITY: (entityType: string, entityId: string) => `attachments:${entityType}:${entityId}`,

  // Users
  USER_BY_ID: (userId: string) => `user:${userId}`,
  USERS_BY_ROLE: (role: string) => `users:role:${role}`,
} as const;

// Cache tags for batch invalidation
export const CACHE_TAGS = {
  EVALUATIONS: 'evaluations',
  CALL_REPORTS: 'call-reports',
  MEETINGS: 'meetings',
  DASHBOARD: 'dashboard',
  ATTACHMENTS: 'attachments',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
} as const;

// Cache durations (in seconds)
export const CACHE_DURATION = {
  SHORT: 30,    // 30 seconds - frequently changing data
  MEDIUM: 60,   // 1 minute - moderate change frequency
  LONG: 120,    // 2 minutes - rarely changing data
  EXTENDED: 300, // 5 minutes - reference data
} as const;
