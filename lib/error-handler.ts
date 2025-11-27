import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'UNIQUE_VIOLATION'
  | 'FK_VIOLATION'
  | 'TRIGGER_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export interface ErrorContext {
  operation: string;
  userId?: string;
  email?: string;
  details?: Record<string, any>;
}

export interface StructuredError {
  code: ErrorCode;
  message: string;
  technicalDetails?: string;
  context: ErrorContext;
}

/**
 * Parse Supabase/PostgreSQL errors into structured format
 */
export function parseSupabaseError(error: any, context: ErrorContext): StructuredError {
  // PostgreSQL error code 23505 = unique_violation
  if (error.code === '23505') {
    return {
      code: 'UNIQUE_VIOLATION',
      message: 'A record with this information already exists',
      technicalDetails: error.message,
      context,
    };
  }

  // PostgreSQL error code 23503 = foreign_key_violation
  if (error.code === '23503') {
    return {
      code: 'FK_VIOLATION',
      message: 'Invalid reference to related data',
      technicalDetails: error.message,
      context,
    };
  }

  // Trigger errors (custom exceptions from our triggers)
  if (error.message?.includes('TEAM_')) {
    return {
      code: 'TRIGGER_ERROR',
      message: 'Team creation failed during user setup',
      technicalDetails: error.message,
      context,
    };
  }

  // Default
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    technicalDetails: error.message || String(error),
    context,
  };
}

/**
 * Parse Supabase Auth errors
 */
export function parseAuthError(error: any, context: ErrorContext): StructuredError {
  if (error.message?.includes('already registered')) {
    return {
      code: 'UNIQUE_VIOLATION',
      message: 'This email address is already registered',
      technicalDetails: error.message,
      context,
    };
  }

  return {
    code: 'AUTH_ERROR',
    message: 'Failed to create user authentication',
    technicalDetails: error.message || String(error),
    context,
  };
}

/**
 * Create NextResponse from structured error
 * Only includes technicalDetails in development mode
 */
export function createErrorResponse(error: StructuredError, statusCode = 500): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';

  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
      message: error.message,
      details: isDev ? error.technicalDetails : undefined,
      context: isDev ? error.context : undefined,
    },
    { status: statusCode }
  );
}
