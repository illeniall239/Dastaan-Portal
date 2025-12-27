/**
 * Color Palettes for Management Dashboard
 * Centralized color constants for rating, genre, and slot visualizations
 */

// Rating color scheme (High/Medium/Low priority)
export const RATING_COLORS = {
  high: {
    bg: '#dcfce7',      // green-100
    border: '#22c55e',  // green-500
    text: '#15803d',    // green-700
    chart: '#10b981'    // green-500
  },
  medium: {
    bg: '#fef3c7',      // amber-100
    border: '#f59e0b',  // amber-500
    text: '#b45309',    // amber-700
    chart: '#f59e0b'    // amber-500
  },
  low: {
    bg: '#fee2e2',      // red-100
    border: '#ef4444',  // red-500
    text: '#b91c1c',    // red-700
    chart: '#ef4444'    // red-500
  },
  unrated: {
    bg: '#f3f4f6',      // gray-100
    border: '#9ca3af',  // gray-400
    text: '#6b7280',    // gray-500
    chart: '#9ca3af'    // gray-400
  }
};

// Genre colors for badges and charts
export const GENRE_COLORS: Record<string, string> = {
  'Drama': '#3b82f6',        // blue-500
  'Comedy': '#f97316',       // orange-500
  'Romance': '#ec4899',      // pink-500
  'Thriller': '#dc2626',     // red-600
  'Action': '#a855f7',       // purple-500
  'Horror': '#1f2937',       // gray-800
  'Sci-Fi': '#06b6d4',       // cyan-500
  'Fantasy': '#8b5cf6',      // violet-500
  'Documentary': '#10b981',  // green-500
  'Historical': '#d97706',   // amber-600
  'Family': '#0ea5e9',       // sky-500
  'Mystery': '#7c3aed',      // violet-600
  'Other': '#6b7280'         // gray-500
};

// Time slot colors (gradient from light to dark)
export const SLOT_COLORS: Record<string, string> = {
  '6:00 PM': '#bfdbfe',  // blue-200
  '7:00 PM': '#60a5fa',  // blue-400
  '8:00 PM': '#3b82f6',  // blue-500
  '9:00 PM': '#1e40af'   // blue-800
};

// Content type colors
export const CONTENT_TYPE_COLORS: Record<string, string> = {
  'Serial': '#8b5cf6',           // violet-500
  'Long Serial': '#7c3aed',      // violet-600
  'Telefilm': '#06b6d4',         // cyan-500
  'Mini-serial': '#10b981',      // green-500
  'Ramadan Serial': '#f59e0b',   // amber-500
  'Series Sitcom': '#f97316',    // orange-500
  'Soap': '#ec4899',             // pink-500
  'Unspecified': '#9ca3af'       // gray-400
};

// Theme colors - vibrant palette for story themes
export const THEME_COLORS: Record<string, string> = {
  'Love': '#ec4899',             // pink-500
  'Revenge': '#dc2626',          // red-600
  'Family': '#0ea5e9',           // sky-500
  'Betrayal': '#7c3aed',         // violet-600
  'Justice': '#2563eb',          // blue-600
  'Redemption': '#16a34a',       // green-600
  'Power': '#9333ea',            // purple-600
  'Sacrifice': '#ea580c',        // orange-600
  'Friendship': '#14b8a6',       // teal-500
  'Honor': '#ca8a04',            // yellow-600
  'Survival': '#65a30d',         // lime-600
  'Ambition': '#7e22ce',         // purple-700
  'Loyalty': '#0891b2',          // cyan-600
  'Struggle': '#b91c1c',         // red-700
  'Hope': '#0d9488',             // teal-600
  'Other': '#6b7280'             // gray-500
};

// Script stage colors matching Excel file
// These colors indicate production progress and are used as row backgrounds
export const SCRIPT_STAGE_COLORS = {
  completed: {
    bg: '#CDD49C',      // Light green (Excel color)
    text: '#3f6212',    // Dark green text
    border: '#a3c585',  // Medium green border
    label: 'Completed'
  },
  development: {
    bg: '#E9EDF7',      // Light blue (Excel color)
    text: '#1e3a8a',    // Dark blue text
    border: '#bfdbfe',  // Medium blue border
    label: 'Development'
  },
  planning: {
    bg: '#FEDCD6',      // Light peach (Excel color)
    text: '#991b1b',    // Dark red text
    border: '#fca5a5',  // Medium red border
    label: 'Planning'
  },
  active: {
    bg: '#FFFFFF',      // White (Excel color)
    text: '#374151',    // Gray text
    border: '#e5e7eb',  // Light gray border
    label: 'Active'
  }
} as const;

export type ScriptStageKey = keyof typeof SCRIPT_STAGE_COLORS;

// Status colors (workflow stages)
export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'draft': {
    bg: '#f3f4f6',      // gray-100
    text: '#4b5563',    // gray-600
    border: '#d1d5db'   // gray-300
  },
  'ready_for_evaluation': {
    bg: '#dbeafe',      // blue-100
    text: '#1e40af',    // blue-800
    border: '#93c5fd'   // blue-300
  },
  'in_review': {
    bg: '#fae8ff',      // fuchsia-100
    text: '#86198f',    // fuchsia-800
    border: '#f0abfc'   // fuchsia-300
  }
};

/**
 * Get rating tier based on score
 * @param rating - Score from 1-10 or null
 * @returns 'high' | 'medium' | 'low' | 'unrated'
 */
export function getRatingTier(rating: number | null): 'high' | 'medium' | 'low' | 'unrated' {
  if (rating === null || rating === undefined) return 'unrated';
  if (rating >= 8) return 'high';
  if (rating >= 5) return 'medium';
  return 'low';
}

/**
 * Get color for a specific genre
 * @param genre - Genre name
 * @returns Hex color code
 */
export function getGenreColor(genre: string): string {
  return GENRE_COLORS[genre] || GENRE_COLORS['Other'];
}

/**
 * Get color for a specific time slot
 * @param slot - Time slot (e.g., "6:00 PM")
 * @returns Hex color code
 */
export function getSlotColor(slot: string | null): string {
  if (!slot) return '#9ca3af'; // gray-400 for unassigned
  return SLOT_COLORS[slot] || '#9ca3af';
}

/**
 * Get color for a specific content type
 * @param contentType - Content type
 * @returns Hex color code
 */
export function getContentTypeColor(contentType: string | null): string {
  if (!contentType) return '#9ca3af'; // gray-400 for unspecified
  return CONTENT_TYPE_COLORS[contentType] || '#9ca3af';
}

/**
 * Get color for a specific theme
 * @param theme - Theme name
 * @returns Hex color code
 */
export function getThemeColor(theme: string | null): string {
  if (!theme) return '#9ca3af'; // gray-400 for unspecified
  return THEME_COLORS[theme] || THEME_COLORS['Other'];
}

/**
 * Get rating color scheme based on tier
 * @param rating - Score from 1-10 or null
 * @returns Color object with bg, border, text, chart properties
 */
export function getRatingColors(rating: number | null) {
  const tier = getRatingTier(rating);
  return RATING_COLORS[tier];
}

/**
 * Get status color scheme
 * @param status - Workflow status
 * @returns Color object with bg, text, border properties
 */
export function getStatusColors(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS['draft'];
}

/**
 * Get user-friendly label for status
 * @param status - Workflow status
 * @returns Human-readable label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'draft': 'Draft',
    'ready_for_evaluation': 'Ready for Evaluation',
    'in_review': 'In Review'
  };
  return labels[status] || status;
}

/**
 * Get user-friendly label for category
 * @param category - Category enum value
 * @returns Human-readable label
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'external_producer': 'External Producer',
    'writer_pitch': 'Writer Pitch',
    'inhouse_content': 'In-house Content',
    'content_head_initiative': 'Content Head Initiative',
    'given_by_management': 'Given by Management'
  };
  return labels[category] || category;
}

/**
 * Check if idea is recent (created within last 7 days)
 * @param createdAt - ISO date string
 * @returns boolean
 */
export function isRecent(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7;
}

/**
 * Check if idea is urgent (deadline within 2 days)
 * @param deadline - ISO date string or null
 * @returns boolean
 */
export function isUrgent(deadline: string | null): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysDiff = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff > 0 && daysDiff <= 2;
}

/**
 * Check if idea is overdue
 * @param deadline - ISO date string or null
 * @returns boolean
 */
export function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  return deadlineDate < now;
}

/**
 * Get script stage based on status
 * Maps status strings to Excel-style stage colors
 * @param status - Workflow status
 * @returns Script stage key
 */
export function getScriptStage(status: string): ScriptStageKey {
  const normalizedStatus = status.toLowerCase();

  // Completed: Script final, script completed
  if (normalizedStatus.includes('script completed') ||
      normalizedStatus.includes('script final')) {
    return 'completed';
  }

  // Development: Story under discussion/development
  if (normalizedStatus.includes('story under discussion') ||
      normalizedStatus.includes('development') ||
      normalizedStatus.includes('contract done')) {
    return 'development';
  }

  // Planning: Production planning stages
  if (normalizedStatus.includes('production planning') ||
      normalizedStatus.includes('feedback needed')) {
    return 'planning';
  }

  // Active: In writing, pre-production, editing, etc.
  return 'active';
}

/**
 * Get script stage colors based on status
 * @param status - Workflow status
 * @returns Color object with bg, text, border, label properties
 */
export function getScriptStageColors(status: string) {
  const stage = getScriptStage(status);
  return SCRIPT_STAGE_COLORS[stage];
}
