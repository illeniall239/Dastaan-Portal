/**
 * Error Logger Service
 * 
 * Provides structured logging with severity levels and context capture.
 * Logs to console in development and database in production.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { AppError, ErrorSeverity, classifyError } from './error-types';

interface LogContext {
    userId?: string;
    functionName?: string;
    metadata?: Record<string, any>;
}

interface ErrorLogEntry {
    severity: ErrorSeverity;
    category: string;
    message: string;
    stackTrace?: string;
    context?: Record<string, any>;
    userId?: string;
}

/**
 * Error Logger Class
 */
class ErrorLogger {
    private isDevelopment = process.env.NODE_ENV === 'development';

    /**
     * Log an error with full context
     */
    async logError(error: unknown, context?: LogContext): Promise<void> {
        const appError = classifyError(error);

        const logEntry: ErrorLogEntry = {
            severity: appError.severity,
            category: appError.category,
            message: appError.message,
            stackTrace: appError.stack,
            context: {
                ...appError.context,
                ...context?.metadata,
                functionName: context?.functionName,
                timestamp: appError.timestamp.toISOString(),
            },
            userId: context?.userId,
        };

        // Always log to console in development
        if (this.isDevelopment) {
            this.logToConsole(logEntry);
        }

        // Log to database in production (or if severity is ERROR or CRITICAL)
        if (!this.isDevelopment || appError.severity === ErrorSeverity.ERROR || appError.severity === ErrorSeverity.CRITICAL) {
            await this.logToDatabase(logEntry);
        }
    }

    /**
     * Log to console with color coding
     */
    private logToConsole(entry: ErrorLogEntry): void {
        const colors = {
            [ErrorSeverity.DEBUG]: '\x1b[36m',    // Cyan
            [ErrorSeverity.INFO]: '\x1b[32m',     // Green
            [ErrorSeverity.WARNING]: '\x1b[33m',  // Yellow
            [ErrorSeverity.ERROR]: '\x1b[31m',    // Red
            [ErrorSeverity.CRITICAL]: '\x1b[35m', // Magenta
        };
        const reset = '\x1b[0m';

        const color = colors[entry.severity] || reset;
        const prefix = `${color}[${entry.severity.toUpperCase()}]${reset}`;

        console.error(
            `${prefix} [${entry.category}] ${entry.message}`,
            entry.context ? `\nContext:` : '',
            entry.context || '',
            entry.stackTrace ? `\nStack:` : '',
            entry.stackTrace || ''
        );
    }

    /**
     * Log to database for persistence and monitoring
     */
    private async logToDatabase(entry: ErrorLogEntry): Promise<void> {
        try {
            const supabase = createAdminClient();

            const { error } = await supabase.from('error_logs').insert({
                error_type: entry.category,
                error_message: entry.message,
                error_stack: entry.stackTrace,
                context: entry.context,
                user_id: entry.userId,
            });

            if (error) {
                // Fallback to console if database logging fails
                console.error('Failed to log error to database:', error);
                console.error('Original error:', entry);
            }
        } catch (dbError) {
            // Don't throw - logging errors shouldn't break the application
            console.error('Error logging to database:', dbError);
        }
    }

    /**
     * Log a warning
     */
    async warn(message: string, context?: LogContext): Promise<void> {
        const error = new AppError(message, undefined, ErrorSeverity.WARNING, context?.metadata);
        await this.logError(error, context);
    }

    /**
     * Log an info message
     */
    async info(message: string, context?: LogContext): Promise<void> {
        const error = new AppError(message, undefined, ErrorSeverity.INFO, context?.metadata);
        await this.logError(error, context);
    }

    /**
     * Log a debug message
     */
    async debug(message: string, context?: LogContext): Promise<void> {
        if (this.isDevelopment) {
            const error = new AppError(message, undefined, ErrorSeverity.DEBUG, context?.metadata);
            await this.logError(error, context);
        }
    }

    /**
     * Log a critical error
     */
    async critical(message: string, context?: LogContext): Promise<void> {
        const error = new AppError(message, undefined, ErrorSeverity.CRITICAL, context?.metadata);
        await this.logError(error, context);
    }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Export convenience functions
export const logError = (error: unknown, context?: LogContext) =>
    errorLogger.logError(error, context);

export const logWarning = (message: string, context?: LogContext) =>
    errorLogger.warn(message, context);

export const logInfo = (message: string, context?: LogContext) =>
    errorLogger.info(message, context);

export const logDebug = (message: string, context?: LogContext) =>
    errorLogger.debug(message, context);

export const logCritical = (message: string, context?: LogContext) =>
    errorLogger.critical(message, context);
