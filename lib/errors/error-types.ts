/**
 * Error Type Definitions
 * 
 * Provides a classification system for different types of errors
 * that can occur in the application.
 */

export enum ErrorSeverity {
    DEBUG = 'debug',
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical',
}

export enum ErrorCategory {
    DATABASE = 'database',
    VALIDATION = 'validation',
    AUTHENTICATION = 'authentication',
    AUTHORIZATION = 'authorization',
    NOT_FOUND = 'not_found',
    NETWORK = 'network',
    UNKNOWN = 'unknown',
}

/**
 * Base error class for application errors
 */
export class AppError extends Error {
    public readonly category: ErrorCategory;
    public readonly severity: ErrorSeverity;
    public readonly context?: Record<string, any>;
    public readonly timestamp: Date;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        context?: Record<string, any>,
        isOperational: boolean = true
    ) {
        super(message);
        this.name = this.constructor.name;
        this.category = category;
        this.severity = severity;
        this.context = context;
        this.timestamp = new Date();
        this.isOperational = isOperational;

        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Database-related errors (Supabase queries, connections)
 */
export class DatabaseError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCategory.DATABASE, ErrorSeverity.ERROR, context);
    }
}

/**
 * Data validation errors
 */
export class ValidationError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCategory.VALIDATION, ErrorSeverity.WARNING, context);
    }
}

/**
 * Authentication errors (login, session)
 */
export class AuthenticationError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCategory.AUTHENTICATION, ErrorSeverity.ERROR, context);
    }
}

/**
 * Authorization errors (permissions, access control)
 */
export class AuthorizationError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCategory.AUTHORIZATION, ErrorSeverity.WARNING, context);
    }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCategory.NOT_FOUND, ErrorSeverity.WARNING, context);
    }
}

/**
 * Network/API errors
 */
export class NetworkError extends AppError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCategory.NETWORK, ErrorSeverity.ERROR, context);
    }
}

/**
 * Classify an unknown error into an AppError
 */
export function classifyError(error: unknown): AppError {
    // Already an AppError
    if (error instanceof AppError) {
        return error;
    }

    // Standard Error
    if (error instanceof Error) {
        // Check for common error patterns
        const message = error.message.toLowerCase();

        if (message.includes('fetch') || message.includes('network')) {
            return new NetworkError(error.message, { originalError: error.name });
        }

        if (message.includes('auth') || message.includes('unauthorized')) {
            return new AuthenticationError(error.message, { originalError: error.name });
        }

        if (message.includes('permission') || message.includes('forbidden')) {
            return new AuthorizationError(error.message, { originalError: error.name });
        }

        if (message.includes('not found') || message.includes('404')) {
            return new NotFoundError(error.message, { originalError: error.name });
        }

        if (message.includes('validation') || message.includes('invalid')) {
            return new ValidationError(error.message, { originalError: error.name });
        }

        // Default to generic error
        return new AppError(
            error.message,
            ErrorCategory.UNKNOWN,
            ErrorSeverity.ERROR,
            { originalError: error.name }
        );
    }

    // Plain object with message property (e.g. Supabase/PostgREST error objects)
    if (error && typeof error === 'object' && 'message' in error) {
        const msg = String((error as any).message);
        const code = (error as any).code;
        const details = (error as any).details;
        const context: Record<string, any> = {};
        if (code) context.code = code;
        if (details) context.details = details;

        const msgLower = msg.toLowerCase();
        if (code === 'PGRST' || msgLower.includes('relation') || msgLower.includes('column')) {
            return new DatabaseError(msg, context);
        }
        if (msgLower.includes('auth') || msgLower.includes('unauthorized') || code === '401') {
            return new AuthenticationError(msg, context);
        }
        if (msgLower.includes('permission') || msgLower.includes('forbidden') || code === '403') {
            return new AuthorizationError(msg, context);
        }

        return new DatabaseError(msg, context);
    }

    // String error
    if (typeof error === 'string') {
        return new AppError(error, ErrorCategory.UNKNOWN, ErrorSeverity.ERROR);
    }

    // Unknown error type
    return new AppError(
        'An unknown error occurred',
        ErrorCategory.UNKNOWN,
        ErrorSeverity.ERROR,
        { error: String(error) }
    );
}

/**
 * Get user-friendly message for error category
 */
export function getUserFriendlyMessage(category: ErrorCategory): string {
    switch (category) {
        case ErrorCategory.DATABASE:
            return 'Unable to access data. Please try again.';
        case ErrorCategory.VALIDATION:
            return 'Invalid data provided. Please check your input.';
        case ErrorCategory.AUTHENTICATION:
            return 'Authentication failed. Please log in again.';
        case ErrorCategory.AUTHORIZATION:
            return 'You do not have permission to perform this action.';
        case ErrorCategory.NOT_FOUND:
            return 'The requested resource was not found.';
        case ErrorCategory.NETWORK:
            return 'Network error. Please check your connection.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}
