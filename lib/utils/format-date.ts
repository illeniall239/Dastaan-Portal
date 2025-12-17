/**
 * Centralized date formatting utilities
 * All dates are formatted in Pakistan Time (Asia/Karachi, UTC+5)
 */

import { formatInTimeZone } from 'date-fns-tz';

const PKT_TIMEZONE = 'Asia/Karachi';

/**
 * Format date in Pakistan Time
 * Example: "Dec 17, 2025"
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  return formatInTimeZone(date, PKT_TIMEZONE, 'MMM d, yyyy');
};

/**
 * Format date with full month name in Pakistan Time
 * Example: "December 17, 2025"
 */
export const formatDateLong = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  return formatInTimeZone(date, PKT_TIMEZONE, 'MMMM d, yyyy');
};

/**
 * Format date with weekday in Pakistan Time
 * Example: "Monday, December 17, 2025"
 */
export const formatDateWithWeekday = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  return formatInTimeZone(date, PKT_TIMEZONE, 'EEEE, MMMM d, yyyy');
};

/**
 * Format time in Pakistan Time
 * Example: "2:33 PM"
 */
export const formatTime = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  return formatInTimeZone(date, PKT_TIMEZONE, 'h:mm a');
};

/**
 * Format date and time in Pakistan Time
 * Example: "Dec 17, 2025 at 2:33 PM"
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  return formatInTimeZone(date, PKT_TIMEZONE, "MMM d, yyyy 'at' h:mm a");
};

/**
 * Format date and time with full month name in Pakistan Time
 * Example: "December 17, 2025 at 2:33 PM"
 */
export const formatDateTimeLong = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  return formatInTimeZone(date, PKT_TIMEZONE, "MMMM d, yyyy 'at' h:mm a");
};
