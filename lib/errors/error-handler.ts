/**
 * Centralized Error Handler
 * 
 * Provides a unified interface for handling errors across the application.
 * Handles logging, user notifications, and fallback values.
 */

import { toast } from 'sonner';
import { logError } from './error-logger';
import { classifyError, getUserFriendlyMessage, ErrorSeverity } from './error-types';

export interface ErrorHandlerOptions<T = any> {
    /** Context identifier (function/operation name) */
    context: string;

    /** Value to return when error occurs */
    fallbackValue: T;

    /** Custom user-facing message (optional) */
    userMessage?: string;

    /** Error severity level */
    severity?: ErrorSeverity;

    /** Additional metadata to log */
    metadata?: Record<string, any>;

    /** Whether to show toast notification to user */
    notifyUser?: boolean;

    /** Whether to log to database (default: true in production) */
    logToDatabase?: boolean;

    /** User ID for logging context */
    userId?: string;
}

/**
 * Handle an error with logging, user notification, and fallback value
 * 
 * @example
 * ```typescript
 * try {
 *   const data = await fetchData();
 *   return data;
 * } catch (error) {
 *   return handleError(error, {
 *     context: 'fetchData',
 *     fallbackValue: [],
 *     userMessage: 'Unable to load data',
 *     metadata: { userId: '123' }
 *   });
 * }
 * ```
 */
export function handleError<T>(
    error: unknown,
    options: ErrorHandlerOptions<T>
): T {
    const {
        context,
        fallbackValue,
        userMessage,
        severity,
        metadata,
        notifyUser = true,
        userId,
    } = options;

    // Classify the error
    let appError = classifyError(error);

    // Override severity if provided
    if (severity) {
        // Create new error with updated severity
        appError = new (appError.constructor as any)(
            appError.message,
            appError.context
        );
        Object.defineProperty(appError, 'severity', { value: severity, writable: true });
    }

    // Log the error (async, non-blocking)
    logError(appError, {
        functionName: context,
        userId,
        metadata: {
            ...metadata,
            fallbackValueType: typeof fallbackValue,
        },
    }).catch(logErr => {
        // Prevent logging errors from breaking the app
        console.error('Failed to log error:', logErr);
    });

    // Notify user if requested and not in server context
    if (notifyUser && typeof window !== 'undefined') {
        const message = userMessage || getUserFriendlyMessage(appError.category);
        const title = getSeverityTitle(appError.severity);

        // Use sonner's toast API
        if (appError.severity === ErrorSeverity.ERROR || appError.severity === ErrorSeverity.CRITICAL) {
            toast.error(title, { description: message });
        } else if (appError.severity === ErrorSeverity.WARNING) {
            toast.warning(title, { description: message });
        } else {
            toast.info(title, { description: message });
        }
    }

    // Return fallback value
    return fallbackValue;
}

/**
 * Get toast title based on severity
 */
function getSeverityTitle(severity: ErrorSeverity): string {
    switch (severity) {
        case ErrorSeverity.CRITICAL:
            return 'Critical Error';
        case ErrorSeverity.ERROR:
            return 'Error';
        case ErrorSeverity.WARNING:
            return 'Warning';
        case ErrorSeverity.INFO:
            return 'Information';
        default:
            return 'Notice';
    }
}

/**
 * Get toast variant based on severity
 */
function getToastVariant(severity: ErrorSeverity): 'default' | 'destructive' {
    return severity === ErrorSeverity.ERROR || severity === ErrorSeverity.CRITICAL
        ? 'destructive'
        : 'default';
}

/**
 * Async version of handleError for use in async contexts
 * Ensures logging completes before returning
 */
export async function handleErrorAsync<T>(
    error: unknown,
    options: ErrorHandlerOptions<T>
): Promise<T> {
    const {
        context,
        fallbackValue,
        userMessage,
        severity,
        metadata,
        notifyUser = true,
        userId,
    } = options;

    let appError = classifyError(error);

    if (severity) {
        // Create new error with updated severity
        appError = new (appError.constructor as any)(
            appError.message,
            appError.context
        );
        Object.defineProperty(appError, 'severity', { value: severity, writable: true });
    }

    // Wait for logging to complete
    try {
        await logError(appError, {
            functionName: context,
            userId,
            metadata: {
                ...metadata,
                fallbackValueType: typeof fallbackValue,
            },
        });
    } catch (logErr) {
        console.error('Failed to log error:', logErr);
    }

    // Notify user
    if (notifyUser && typeof window !== 'undefined') {
        const message = userMessage || getUserFriendlyMessage(appError.category);
        const title = getSeverityTitle(appError.severity);

        // Use sonner's toast API
        if (appError.severity === ErrorSeverity.ERROR || appError.severity === ErrorSeverity.CRITICAL) {
            toast.error(title, { description: message });
        } else if (appError.severity === ErrorSeverity.WARNING) {
            toast.warning(title, { description: message });
        } else {
            toast.info(title, { description: message });
        }
    }

    return fallbackValue;
}

/**
 * Wrap a function with error handling
 * Useful for wrapping multiple calls with the same error handling logic
 */
export function withErrorHandler<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options: Omit<ErrorHandlerOptions<TReturn>, 'context'> & { context?: string }
) {
    return async (...args: TArgs): Promise<TReturn> => {
        try {
            return await fn(...args);
        } catch (error) {
            return handleError(error, {
                context: options.context || fn.name || 'anonymous',
                ...options,
            });
        }
    };
}
