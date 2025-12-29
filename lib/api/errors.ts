import { NextResponse } from "next/server";

/**
 * Standard API error codes for consistent client-side handling
 */
export enum ApiErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Resource Errors
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  DUPLICATE = "DUPLICATE",
  CONFLICT = "CONFLICT",

  // Database Errors
  DATABASE_ERROR = "DATABASE_ERROR",
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION",

  // Business Logic
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Server Errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  /** User-friendly error message */
  error: string;

  /** Machine-readable error code for client-side handling */
  code?: ApiErrorCode | string;

  /** Additional error details (validation errors, field-specific messages, etc.) */
  details?: any;

  /** ISO timestamp when error occurred */
  timestamp?: string;

  /** Optional request ID for tracking/debugging */
  requestId?: string;

  /** Optional suggestions for fixing the error */
  suggestions?: string[];
}

/**
 * Standard API success response structure
 */
export interface ApiSuccessResponse<T = any> {
  /** Success message */
  message?: string;

  /** Response data */
  data?: T;

  /** ISO timestamp */
  timestamp?: string;
}

/**
 * Create a standardized error response
 *
 * @param error - User-friendly error message
 * @param status - HTTP status code
 * @param options - Additional options
 * @returns NextResponse with standardized error format
 *
 * @example
 * ```typescript
 * // Simple error
 * return createErrorResponse("User not found", 404);
 *
 * // With error code for client handling
 * return createErrorResponse("User not found", 404, {
 *   code: ApiErrorCode.NOT_FOUND
 * });
 *
 * // With details and suggestions
 * return createErrorResponse("Validation failed", 400, {
 *   code: ApiErrorCode.VALIDATION_ERROR,
 *   details: { email: "Invalid email format" },
 *   suggestions: ["Check email format", "Ensure all required fields are filled"]
 * });
 * ```
 */
export function createErrorResponse(
  error: string,
  status: number,
  options?: {
    code?: ApiErrorCode | string;
    details?: any;
    requestId?: string;
    suggestions?: string[];
  }
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    error,
    code: options?.code,
    details: options?.details,
    timestamp: new Date().toISOString(),
    requestId: options?.requestId,
    suggestions: options?.suggestions,
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a standardized success response
 *
 * @param message - Success message
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with standardized success format
 *
 * @example
 * ```typescript
 * return createSuccessResponse("User created successfully", user, 201);
 * ```
 */
export function createSuccessResponse<T = any>(
  message: string,
  data?: T,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status });
}

// ============================================================================
// Common Error Response Helpers
// ============================================================================

/**
 * Unauthorized error (401)
 */
export function unauthorizedError(
  message: string = "Authentication required"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(message, 401, {
    code: ApiErrorCode.UNAUTHORIZED,
    suggestions: ["Please log in to access this resource"],
  });
}

/**
 * Forbidden error (403)
 */
export function forbiddenError(
  message: string = "Insufficient permissions"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(message, 403, {
    code: ApiErrorCode.FORBIDDEN,
    suggestions: ["Contact an administrator for access"],
  });
}

/**
 * Not found error (404)
 */
export function notFoundError(
  resource: string = "Resource"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(`${resource} not found`, 404, {
    code: ApiErrorCode.NOT_FOUND,
  });
}

/**
 * Validation error (400)
 */
export function validationError(
  message: string = "Validation failed",
  details?: any
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(message, 400, {
    code: ApiErrorCode.VALIDATION_ERROR,
    details,
    suggestions: details
      ? ["Check the details field for specific validation errors"]
      : undefined,
  });
}

/**
 * Conflict error (409) - for duplicates, concurrent modifications, etc.
 */
export function conflictError(
  message: string,
  details?: any
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(message, 409, {
    code: ApiErrorCode.CONFLICT,
    details,
  });
}

/**
 * Duplicate resource error (409)
 */
export function duplicateError(
  resource: string,
  details?: any
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(`${resource} already exists`, 409, {
    code: ApiErrorCode.DUPLICATE,
    details,
    suggestions: [
      "Use a different identifier",
      "Delete the existing resource first",
    ],
  });
}

/**
 * Rate limit exceeded error (429)
 */
export function rateLimitError(
  retryAfter?: number
): NextResponse<ApiErrorResponse> {
  const response = createErrorResponse(
    "Rate limit exceeded",
    429,
    {
      code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
      suggestions: ["Please wait before making another request"],
      details: retryAfter ? { retryAfter } : undefined,
    }
  );

  if (retryAfter) {
    response.headers.set("Retry-After", retryAfter.toString());
  }

  return response;
}

/**
 * Internal server error (500)
 * Also captures the error to GlitchTip
 */
export function internalError(
  message: string = "An unexpected error occurred",
  details?: any,
  error?: Error
): NextResponse<ApiErrorResponse> {
  // Capture to GlitchTip if error object provided (only in production)
  if (error && process.env.NODE_ENV === "production") {
    import("@sentry/nextjs").then(({ captureException }) => {
      captureException(error, {
        level: "error",
        tags: {
          source: "api",
          error_type: "internal",
        },
        extra: {
          message,
          details,
        },
      });
    });
  }

  return createErrorResponse(message, 500, {
    code: ApiErrorCode.INTERNAL_ERROR,
    details: process.env.NODE_ENV === "development" ? details : undefined,
    suggestions: ["Please try again later", "Contact support if the problem persists"],
  });
}

/**
 * Database constraint violation error (409)
 * Handles PostgreSQL unique constraint violations (23505) and other constraints
 */
export function constraintViolationError(
  constraintName?: string,
  details?: any
): NextResponse<ApiErrorResponse> {
  let message = "Database constraint violation";
  let suggestions: string[] = [];

  if (constraintName?.includes("unique")) {
    message = "Duplicate entry detected";
    suggestions = ["Use a different value", "Delete the existing entry first"];
  } else if (constraintName?.includes("foreign")) {
    message = "Referenced resource does not exist";
    suggestions = ["Ensure the referenced resource exists"];
  } else if (constraintName?.includes("check")) {
    message = "Value does not meet requirements";
    suggestions = ["Check the value constraints", "Refer to API documentation"];
  }

  return createErrorResponse(message, 409, {
    code: ApiErrorCode.CONSTRAINT_VIOLATION,
    details: {
      constraint: constraintName,
      ...details,
    },
    suggestions,
  });
}

/**
 * Handle Supabase/PostgreSQL errors and convert to standard API errors
 * Also captures unexpected database errors to GlitchTip
 *
 * @param error - The database error object
 * @param context - Optional context about what operation failed
 * @returns Standardized error response
 *
 * @example
 * ```typescript
 * const { error } = await supabase.from('users').insert(data);
 * if (error) {
 *   return handleDatabaseError(error, "creating user");
 * }
 * ```
 */
export function handleDatabaseError(
  error: any,
  context?: string
): NextResponse<ApiErrorResponse> {
  // Capture unexpected database errors to GlitchTip (not constraint violations)
  const isExpectedError =
    error.code === "23505" || // Unique constraint
    error.code === "23503" || // Foreign key
    error.code === "23514" || // Check constraint
    error.code === "42501" || // RLS policy
    error.message?.includes("policy");

  if (!isExpectedError && process.env.NODE_ENV === "production") {
    import("@sentry/nextjs").then(({ captureException }) => {
      const errorObj =
        error instanceof Error ? error : new Error(error.message || "Database error");

      captureException(errorObj, {
        level: "error",
        tags: {
          source: "database",
          error_type: "database",
          error_code: error.code,
        },
        contexts: {
          database: {
            code: error.code,
            message: error.message,
            context,
          },
        },
      });
    });
  }
  // PostgreSQL unique constraint violation
  if (error.code === "23505") {
    const constraintMatch = error.message?.match(/constraint "([^"]+)"/);
    const constraint = constraintMatch ? constraintMatch[1] : undefined;

    return constraintViolationError(constraint, {
      message: error.message,
      context,
    });
  }

  // PostgreSQL foreign key violation
  if (error.code === "23503") {
    return createErrorResponse(
      context
        ? `Referenced resource not found when ${context}`
        : "Referenced resource not found",
      404,
      {
        code: ApiErrorCode.NOT_FOUND,
        details: { message: error.message },
      }
    );
  }

  // PostgreSQL check constraint violation
  if (error.code === "23514") {
    return createErrorResponse(
      context ? `Invalid value when ${context}` : "Invalid value",
      400,
      {
        code: ApiErrorCode.VALIDATION_ERROR,
        details: { message: error.message },
      }
    );
  }

  // RLS policy violation (insufficient permissions)
  if (error.code === "42501" || error.message?.includes("policy")) {
    return forbiddenError(
      context
        ? `Insufficient permissions for ${context}`
        : "Insufficient permissions"
    );
  }

  // Generic database error
  return internalError(
    context ? `Database error when ${context}` : "Database error occurred",
    process.env.NODE_ENV === "development"
      ? { code: error.code, message: error.message }
      : undefined
  );
}

/**
 * Handle Zod validation errors and convert to standard API errors
 *
 * @param zodError - The Zod validation error
 * @returns Standardized validation error response
 *
 * @example
 * ```typescript
 * const validation = schema.safeParse(body);
 * if (!validation.success) {
 *   return handleValidationError(validation.error);
 * }
 * ```
 */
export function handleValidationError(zodError: any): NextResponse<ApiErrorResponse> {
  return validationError("Validation failed", zodError.format());
}
