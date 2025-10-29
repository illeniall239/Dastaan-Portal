/**
 * Development-only logging utility
 *
 * In production, only errors and warnings are logged.
 * Debug logs, time measurements, and info logs are stripped out.
 *
 * Usage:
 * - logger.dev() - Development-only logs (removed in production)
 * - logger.time() / logger.timeEnd() - Performance timing (dev-only)
 * - logger.error() - Always logged (production errors)
 * - logger.warn() - Always logged (production warnings)
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Development-only log - stripped in production
   */
  dev: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  },

  /**
   * Start a performance timer (dev-only)
   */
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  /**
   * End a performance timer (dev-only)
   */
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },

  /**
   * Log errors - always logged even in production
   */
  error: (message: string, error?: any) => {
    console.error(message, error);
  },

  /**
   * Log warnings - always logged even in production
   */
  warn: (message: string, ...args: any[]) => {
    console.warn(message, ...args);
  },

  /**
   * Info logs - development only
   */
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.info(message, ...args);
    }
  }
};
