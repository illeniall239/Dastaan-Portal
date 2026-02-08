/**
 * Error Handling Utilities
 * 
 * Convenience exports for error handling across the application
 */

// Error types and classification
export {
    AppError,
    DatabaseError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    NetworkError,
    ErrorSeverity,
    ErrorCategory,
    classifyError,
    getUserFriendlyMessage,
} from './error-types';

// Error logging
export {
    errorLogger,
    logError,
    logWarning,
    logInfo,
    logDebug,
    logCritical,
} from './error-logger';

// Error handling
export {
    handleError,
    handleErrorAsync,
    withErrorHandler,
    type ErrorHandlerOptions,
} from './error-handler';
