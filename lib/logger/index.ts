/**
 * Centralized Logging Utility using Pino
 *
 * Provides structured logging with:
 * - Environment-based formatting (pretty in dev, JSON in prod)
 * - Log levels (trace, debug, info, warn, error, fatal)
 * - Sensitive data redaction
 * - Correlation ID support
 * - Child logger creation with context
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.info('User logged in', { userId: '123', email: 'user@geo.com' });
 * logger.error('Database connection failed', { error: err.message });
 *
 * // Create scoped logger
 * const childLogger = logger.child({ module: 'auth' });
 * childLogger.debug('Validating session');
 * ```
 */

import pino from 'pino';

/**
 * Sensitive field patterns to redact from logs
 * Prevents accidental logging of passwords, tokens, API keys, etc.
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'api_key',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'session',
  'access_token',
  'refresh_token',
  'private_key',
  'credit_card',
  'ssn',
];

/**
 * Get log level from environment or default to 'info'
 *
 * Levels (from most to least verbose):
 * - trace: Very detailed debugging
 * - debug: Detailed debugging
 * - info: General information (default)
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Critical errors that crash the application
 */
function getLogLevel(): pino.Level {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  const validLevels: pino.Level[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

  if (level && validLevels.includes(level as pino.Level)) {
    return level as pino.Level;
  }

  // Default to 'info' in production, 'debug' in development
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Determine if we should use pretty printing
 * - Development: Use pretty format for human readability
 * - Production: Use JSON format for log aggregation
 */
function shouldUsePrettyPrint(): boolean {
  if (process.env.LOG_FORMAT === 'json') return false;
  if (process.env.LOG_FORMAT === 'pretty') return true;

  // Default: pretty in development, JSON in production
  return process.env.NODE_ENV !== 'production';
}

/**
 * Create Pino logger instance with configuration
 */
const logger = pino({
  level: getLogLevel(),

  // Redact sensitive fields to prevent accidental PII logging
  redact: {
    paths: SENSITIVE_KEYS,
    censor: '[REDACTED]',
  },

  // Base configuration
  base: {
    env: process.env.NODE_ENV || 'development',
    pid: process.pid,
  },

  // Timestamp in ISO 8601 format
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Format configuration
  ...(shouldUsePrettyPrint() && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        messageFormat: '{module} {msg}',
      },
    },
  }),

  // Serializers for common objects
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/**
 * Create a child logger with additional context
 *
 * @param context Additional context fields to include in all logs
 * @returns Child logger instance
 *
 * @example
 * const authLogger = createChildLogger({ module: 'auth' });
 * authLogger.info('User authenticated', { userId: '123' });
 * // Output: {"module":"auth","msg":"User authenticated","userId":"123"}
 */
export function createChildLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}

/**
 * Add context to logger (user ID, request ID, etc.)
 *
 * @param context Context object with user/request information
 * @returns Logger instance with context
 *
 * @example
 * const contextLogger = withContext({ userId: '123', requestId: 'req-456' });
 * contextLogger.info('Action performed');
 * // Output: {"userId":"123","requestId":"req-456","msg":"Action performed"}
 */
export function withContext(context: {
  userId?: string;
  requestId?: string;
  correlationId?: string;
  [key: string]: unknown;
}): pino.Logger {
  return logger.child(context);
}

/**
 * Log database query with duration
 *
 * @param query Query description
 * @param duration Duration in milliseconds
 * @param additionalContext Additional context
 *
 * @example
 * const start = Date.now();
 * const result = await supabase.from('users').select('*');
 * logQuery('SELECT * FROM users', Date.now() - start, { rowCount: result.data?.length });
 */
export function logQuery(
  query: string,
  duration: number,
  additionalContext?: Record<string, unknown>
): void {
  logger.debug(
    {
      type: 'database_query',
      query,
      duration,
      ...additionalContext,
    },
    `Query executed in ${duration}ms`
  );
}

/**
 * Log API request performance
 *
 * @param method HTTP method
 * @param path Request path
 * @param duration Duration in milliseconds
 * @param statusCode Response status code
 * @param additionalContext Additional context
 *
 * @example
 * const start = Date.now();
 * // ... process request
 * logApiRequest('GET', '/api/users', Date.now() - start, 200, { userId: '123' });
 */
export function logApiRequest(
  method: string,
  path: string,
  duration: number,
  statusCode: number,
  additionalContext?: Record<string, unknown>
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  const logData = {
    type: 'api_request',
    method,
    path,
    duration,
    statusCode,
    ...additionalContext,
  };
  const message = `${method} ${path} ${statusCode} - ${duration}ms`;

  if (level === 'error') {
    logger.error(logData, message);
  } else if (level === 'warn') {
    logger.warn(logData, message);
  } else {
    logger.info(logData, message);
  }
}

/**
 * Log authentication events
 *
 * @param event Event type (login, logout, failed_login, etc.)
 * @param userId User ID (if available)
 * @param additionalContext Additional context
 *
 * @example
 * logAuthEvent('login', '123', { email: 'user@geo.com', ip: '192.168.1.1' });
 * logAuthEvent('failed_login', undefined, { email: 'hacker@bad.com', reason: 'Invalid password' });
 */
export function logAuthEvent(
  event: 'login' | 'logout' | 'failed_login' | 'session_refresh' | 'password_reset',
  userId?: string,
  additionalContext?: Record<string, unknown>
): void {
  const level = event === 'failed_login' ? 'warn' : 'info';

  const logData = {
    type: 'auth_event',
    event,
    userId,
    ...additionalContext,
  };
  const message = `Auth event: ${event}`;

  if (level === 'warn') {
    logger.warn(logData, message);
  } else {
    logger.info(logData, message);
  }
}

/**
 * Log admin actions (complements audit trail)
 *
 * @param action Action type
 * @param performedBy Admin user ID
 * @param targetEntity Target entity type and ID
 * @param additionalContext Additional context
 *
 * @example
 * logAdminAction('user_deleted', 'admin-123', { type: 'user', id: 'user-456' });
 */
export function logAdminAction(
  action: string,
  performedBy: string,
  targetEntity: { type: string; id: string },
  additionalContext?: Record<string, unknown>
): void {
  logger.info(
    {
      type: 'admin_action',
      action,
      performedBy,
      entityType: targetEntity.type,
      entityId: targetEntity.id,
      ...additionalContext,
    },
    `Admin action: ${action} on ${targetEntity.type}:${targetEntity.id}`
  );
}

/**
 * Log business events (evaluation submitted, story approved, etc.)
 *
 * @param event Event name
 * @param entityType Entity type
 * @param entityId Entity ID
 * @param additionalContext Additional context
 *
 * @example
 * logBusinessEvent('evaluation_submitted', 'evaluator_form', 'form-123', { score: 85 });
 * logBusinessEvent('story_approved', 'story', 'story-456', { approvedBy: 'exec-789' });
 */
export function logBusinessEvent(
  event: string,
  entityType: string,
  entityId: string,
  additionalContext?: Record<string, unknown>
): void {
  logger.info(
    {
      type: 'business_event',
      event,
      entityType,
      entityId,
      ...additionalContext,
    },
    `Business event: ${event} - ${entityType}:${entityId}`
  );
}

/**
 * Log error and send to GlitchTip
 *
 * @param error Error object or message
 * @param context Additional context
 *
 * @example
 * logError(new Error('Database connection failed'), { table: 'users', operation: 'select' });
 */
export function logError(
  error: Error | string,
  context?: Record<string, unknown>
): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  // Log to Pino
  logger.error({ error: errorObj, ...context }, errorObj.message);

  // Send to GlitchTip (only in production)
  if (process.env.NODE_ENV === 'production') {
    // Dynamic import to avoid loading Sentry in development
    import('@sentry/nextjs').then(({ captureException }) => {
      captureException(errorObj, {
        level: 'error',
        tags: {
          source: 'logger',
          ...context,
        },
        extra: context,
      });
    });
  }
}

/**
 * Log fatal error and send to GlitchTip
 *
 * @param error Error object or message
 * @param context Additional context
 *
 * @example
 * logFatal(new Error('Critical system failure'), { service: 'database' });
 */
export function logFatal(
  error: Error | string,
  context?: Record<string, unknown>
): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  // Log to Pino
  logger.fatal({ error: errorObj, ...context }, errorObj.message);

  // Send to GlitchTip (only in production)
  if (process.env.NODE_ENV === 'production') {
    // Dynamic import to avoid loading Sentry in development
    import('@sentry/nextjs').then(({ captureException }) => {
      captureException(errorObj, {
        level: 'fatal',
        tags: {
          source: 'logger',
          ...context,
        },
        extra: context,
      });
    });
  }
}

/**
 * Log database error and send to GlitchTip
 *
 * @param error Error object
 * @param query Query that failed
 * @param context Additional context
 *
 * @example
 * logDatabaseError(err, 'SELECT * FROM users', { table: 'users' });
 */
export function logDatabaseError(
  error: Error,
  query: string,
  context?: Record<string, unknown>
): void {
  const errorContext = {
    type: 'database_error',
    query,
    ...context,
  };

  logger.error(errorContext, `Database error: ${error.message}`);

  if (process.env.NODE_ENV === 'production') {
    import('@sentry/nextjs').then(({ captureException }) => {
      captureException(error, {
        level: 'error',
        tags: {
          source: 'database',
          error_type: 'database',
        },
        contexts: {
          database: {
            query,
            ...context,
          },
        },
      });
    });
  }
}

// Export the main logger instance
export { logger };

// Export logger methods for convenience
export const { trace, debug, info, warn, error, fatal } = logger;
