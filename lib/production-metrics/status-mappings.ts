/**
 * Status Mapping for Production Lifecycle Metrics
 *
 * Maps the 40+ status values from call_reports.status field into 7 production metrics.
 * Status values are defined in components/status-updater/status-updater-table.tsx (lines 16-41)
 *
 * @module production-metrics/status-mappings
 */

/**
 * Status categories for production lifecycle tracking
 * Each category maps to one of the 7 dashboard metrics
 */
export const STATUS_CATEGORIES = {
  /**
   * Metric 1: Stories in Discussion/Development
   * Projects in early ideation and discussion phase
   */
  STORIES_IN_DISCUSSION: [
    "Story Under Discussion/Development",
    "Contract done - Story Under Discussion/Development",
    "Story Discussed & Approved",
  ],

  /**
   * Metric 2: Scripts in Writing
   * Projects actively being written or edited
   * Supports slot-wise breakdown
   */
  SCRIPTS_IN_WRITING: [
    "In Writing",
    "Pre-Production - In Writing",
    "Production Planning - In Writing",
    "In Writing & Editing",
    "Production Planning - In Writing - Feedback need to discuss",
    "Script is in Editing Process",
    "Revised script is awaited",
    "Pre Production - In Editing",
    "Production Planning - In Editing",
  ],

  /**
   * Metric 3: Scripts Completed
   * Finished scripts ready for or awaiting production
   * Supports slot-wise breakdown
   */
  SCRIPTS_COMPLETED: [
    "Script completed",
    "Script Final",
    "Script Received/Not Final",
    "Script completed not on shoot",
    "Need to be Re-Edit",
  ],

  /**
   * Metric 4: Projects on Shoot
   * Projects currently in production/filming
   */
  PROJECTS_ON_SHOOT: [
    "Project on Shoot",
  ],

  /**
   * Metric 5: Projects on Air
   * Projects currently airing on television
   */
  PROJECTS_ON_AIR: [
    "On-air Drama",
  ],
} as const;

/**
 * Type for status category keys
 */
export type StatusCategory = keyof typeof STATUS_CATEGORIES;

/**
 * Check if a given status belongs to a specific category
 *
 * @param status - The status string from call_reports.status
 * @param category - The category to check against
 * @returns true if status is in the category, false otherwise
 *
 * @example
 * ```typescript
 * isStatusInCategory("In Writing", "SCRIPTS_IN_WRITING") // true
 * isStatusInCategory("Script completed", "SCRIPTS_IN_WRITING") // false
 * ```
 */
export function isStatusInCategory(
  status: string,
  category: StatusCategory
): boolean {
  if (!status) return false;
  return (STATUS_CATEGORIES[category] as readonly string[]).includes(status);
}

/**
 * Get the category for a given status
 *
 * @param status - The status string from call_reports.status
 * @returns The category name or null if status doesn't match any category
 *
 * @example
 * ```typescript
 * getStatusCategory("In Writing") // "SCRIPTS_IN_WRITING"
 * getStatusCategory("Unknown Status") // null
 * ```
 */
export function getStatusCategory(status: string): StatusCategory | null {
  if (!status) return null;

  for (const category of Object.keys(STATUS_CATEGORIES) as StatusCategory[]) {
    if ((STATUS_CATEGORIES[category] as readonly string[]).includes(status)) {
      return category;
    }
  }

  return null;
}

/**
 * Get all statuses for a given category
 *
 * @param category - The category to get statuses for
 * @returns Array of status strings in that category
 *
 * @example
 * ```typescript
 * getStatusesInCategory("PROJECTS_ON_SHOOT") // ["Project on Shoot"]
 * ```
 */
export function getStatusesInCategory(category: StatusCategory): readonly string[] {
  return STATUS_CATEGORIES[category];
}

/**
 * Get count of all mapped statuses
 * Useful for validation to ensure we're covering most of the 40+ status values
 *
 * @returns Total number of statuses mapped across all categories
 */
export function getTotalMappedStatusesCount(): number {
  return (Object.keys(STATUS_CATEGORIES) as StatusCategory[])
    .reduce((total, category) => total + STATUS_CATEGORIES[category].length, 0);
}
