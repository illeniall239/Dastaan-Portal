/**
 * Repository Context Management
 *
 * Manages Supabase client contexts for repositories.
 * Supports three contexts:
 * - 'server': For server-side operations (server components, API routes)
 * - 'client': For client-side operations (browser)
 * - 'admin': For admin operations that bypass RLS
 *
 * Usage:
 * ```typescript
 * const context = await RepositoryContext.getClient('server');
 * const { data } = await context.from('users').select('*');
 * ```
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Repository context types
 */
export type RepositoryContextType = 'server' | 'client' | 'admin';

/**
 * Repository context manager
 */
export class RepositoryContext {
  /**
   * Get Supabase client for the specified context
   *
   * @param contextType - The type of context ('server', 'client', or 'admin')
   * @returns Supabase client instance
   *
   * @example
   * // Server-side usage
   * const client = await RepositoryContext.getClient('server');
   *
   * // Client-side usage
   * const client = await RepositoryContext.getClient('client');
   *
   * // Admin usage (bypasses RLS)
   * const client = await RepositoryContext.getClient('admin');
   */
  static async getClient(contextType: RepositoryContextType): Promise<SupabaseClient> {
    switch (contextType) {
      case 'server':
        return await createServerClient();

      case 'client':
        return createBrowserClient();

      case 'admin':
        return createAdminClient();

      default:
        throw new Error(`Invalid repository context type: ${contextType}`);
    }
  }

  /**
   * Check if the current environment supports the context type
   *
   * @param contextType - The context type to check
   * @returns True if the context is supported in the current environment
   *
   * @example
   * if (RepositoryContext.isSupported('client')) {
   *   // Safe to use client context
   * }
   */
  static isSupported(contextType: RepositoryContextType): boolean {
    if (typeof window === 'undefined' && contextType === 'client') {
      return false;
    }

    if (typeof window !== 'undefined' && contextType === 'server') {
      return false;
    }

    if (contextType === 'admin' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return false;
    }

    return true;
  }

  /**
   * Get the appropriate context type based on environment
   *
   * @returns 'server' for Node.js environment, 'client' for browser
   *
   * @example
   * const contextType = RepositoryContext.getDefaultContext();
   * const client = await RepositoryContext.getClient(contextType);
   */
  static getDefaultContext(): RepositoryContextType {
    return typeof window === 'undefined' ? 'server' : 'client';
  }
}

/**
 * Helper function to create a repository client
 *
 * @param contextType - Optional context type (defaults to environment-appropriate)
 * @returns Supabase client instance
 *
 * @example
 * const client = await getRepositoryClient();
 * const adminClient = await getRepositoryClient('admin');
 */
export async function getRepositoryClient(
  contextType?: RepositoryContextType
): Promise<SupabaseClient> {
  const context = contextType || RepositoryContext.getDefaultContext();
  return RepositoryContext.getClient(context);
}
