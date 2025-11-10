/**
 * Base Repository Abstract Class
 *
 * Provides common CRUD operations and query building for all repositories.
 * All entity repositories should extend this class.
 *
 * Usage:
 * ```typescript
 * export class UserRepository extends BaseRepository<User> {
 *   constructor(context: RepositoryContextType = 'server') {
 *     super('users', context);
 *   }
 *
 *   // Add custom methods
 *   async findByEmail(email: string): Promise<User | null> {
 *     const client = await this.getClient();
 *     const { data, error } = await client
 *       .from(this.tableName)
 *       .select('*')
 *       .eq('email', email)
 *       .single();
 *
 *     if (error) this.handleError(error);
 *     return data;
 *   }
 * }
 * ```
 */

import { RepositoryContext, type RepositoryContextType } from './repository-context';
import { logger } from '@/lib/logger';
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';

/**
 * Query filter options
 */
export interface QueryFilters {
  [key: string]: any;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Ordering options
 */
export interface OrderOptions {
  column: string;
  ascending?: boolean;
}

/**
 * Query options combining filters, pagination, and ordering
 */
export interface QueryOptions {
  filters?: QueryFilters;
  pagination?: PaginationOptions;
  order?: OrderOptions | OrderOptions[];
  select?: string;
}

/**
 * Repository result with pagination metadata
 */
export interface RepositoryResult<T> {
  data: T[];
  count: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

/**
 * Repository error class
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any,
    public readonly hint?: string
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Abstract base repository class
 * Provides common CRUD operations and utilities for all repositories
 */
export abstract class BaseRepository<T extends Record<string, any>> {
  protected readonly tableName: string;
  protected readonly context: RepositoryContextType;

  /**
   * Constructor
   *
   * @param tableName - The database table name
   * @param context - The repository context (server, client, admin)
   */
  constructor(tableName: string, context: RepositoryContextType = 'server') {
    this.tableName = tableName;
    this.context = context;
  }

  /**
   * Get Supabase client for the current context
   *
   * @returns Supabase client instance
   */
  protected async getClient(): Promise<SupabaseClient> {
    return RepositoryContext.getClient(this.context);
  }

  /**
   * Find entity by ID
   *
   * @param id - Entity ID
   * @param select - Columns to select (default: '*')
   * @returns Entity or null if not found
   */
  async findById(id: string, select: string = '*'): Promise<T | null> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select(select)
        .eq('id', id)
        .single();

      if (error) {
        // Handle "not found" gracefully
        if (error.code === 'PGRST116') {
          logger.info(`Entity not found`);
          return null;
        }
        this.handleError(error);
      }

      logger.info(`Found entity`);
      return data as unknown as unknown as T;
    } catch (error) {
      logger.error(`Error in findById`);
      throw error;
    }
  }

  /**
   * Find one entity matching filters
   *
   * @param filters - Query filters
   * @param select - Columns to select (default: '*')
   * @returns Entity or null if not found
   */
  async findOne(filters: QueryFilters, select: string = '*'): Promise<T | null> {
    try {
      const client = await this.getClient();
      let query = client.from(this.tableName).select(select);

      query = this.buildQuery(query, filters);

      const { data, error } = await query.single();

      if (error) {
        // Handle "not found" gracefully
        if (error.code === 'PGRST116') {
          logger.info(`Entity not found`);
          return null;
        }
        this.handleError(error);
      }

      logger.info(`Found entity`);
      return data as unknown as unknown as T;
    } catch (error) {
      logger.error(`Error in findOne`);
      throw error;
    }
  }

  /**
   * Find all entities matching filters
   *
   * @param options - Query options (filters, pagination, ordering)
   * @returns Array of entities
   */
  async findAll(options: QueryOptions = {}): Promise<T[]> {
    try {
      const client = await this.getClient();
      const select = options.select || '*';
      let query = client.from(this.tableName).select(select);

      // Apply filters
      if (options.filters) {
        query = this.buildQuery(query, options.filters);
      }

      // Apply ordering
      if (options.order) {
        query = this.applyOrdering(query, options.order);
      }

      // Apply pagination
      if (options.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Found entities`);
      return (data as unknown as unknown as T[]) || [];
    } catch (error) {
      logger.error(`Error in findAll`);
      throw error;
    }
  }

  /**
   * Find all entities with pagination metadata
   *
   * @param options - Query options (filters, pagination, ordering)
   * @returns Repository result with data and pagination metadata
   */
  async findAllWithCount(options: QueryOptions = {}): Promise<RepositoryResult<T>> {
    try {
      const client = await this.getClient();
      const select = options.select || '*';
      let query = client.from(this.tableName).select(select, { count: 'exact' });

      // Apply filters
      if (options.filters) {
        query = this.buildQuery(query, options.filters);
      }

      // Apply ordering
      if (options.order) {
        query = this.applyOrdering(query, options.order);
      }

      // Apply pagination
      if (options.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error, count } = await query;

      if (error) this.handleError(error);

      const totalCount = count || 0;
      const result: RepositoryResult<T> = {
        data: (data as unknown as unknown as T[]) || [],
        count: totalCount,
      };

      // Add pagination metadata if pagination was requested
      if (options.pagination?.limit) {
        const limit = options.pagination.limit;
        const page = options.pagination.page || 1;
        result.page = page;
        result.limit = limit;
        result.totalPages = Math.ceil(totalCount / limit);
      }

      logger.info(`Found entities with count`);
      return result;
    } catch (error) {
      logger.error(`Error in findAllWithCount`);
      throw error;
    }
  }

  /**
   * Count entities matching filters
   *
   * @param filters - Query filters
   * @returns Count of matching entities
   */
  async count(filters?: QueryFilters): Promise<number> {
    try {
      const client = await this.getClient();
      let query = client.from(this.tableName).select('*', { count: 'exact', head: true });

      if (filters) {
        query = this.buildQuery(query, filters);
      }

      const { count, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Counted entities`);
      return count || 0;
    } catch (error) {
      logger.error(`Error in count`);
      throw error;
    }
  }

  /**
   * Create new entity
   *
   * @param data - Entity data
   * @param select - Columns to return (default: '*')
   * @returns Created entity
   */
  async create(data: Partial<T>, select: string = '*'): Promise<T> {
    try {
      const client = await this.getClient();
      const { data: result, error } = await client
        .from(this.tableName)
        .insert(data)
        .select(select)
        .single();

      if (error) this.handleError(error);

      logger.info(`Created entity`);
      return result as unknown as T;
    } catch (error) {
      logger.error(`Error in create`);
      throw error;
    }
  }

  /**
   * Create multiple entities
   *
   * @param dataArray - Array of entity data
   * @param select - Columns to return (default: '*')
   * @returns Array of created entities
   */
  async createMany(dataArray: Partial<T>[], select: string = '*'): Promise<T[]> {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .insert(dataArray)
        .select(select);

      if (error) this.handleError(error);

      logger.info(`Created entities`);
      return (data as unknown as unknown as T[]) || [];
    } catch (error) {
      logger.error(`Error in createMany`);
      throw error;
    }
  }

  /**
   * Update entity by ID
   *
   * @param id - Entity ID
   * @param data - Update data
   * @param select - Columns to return (default: '*')
   * @returns Updated entity
   */
  async update(id: string, data: Partial<T>, select: string = '*'): Promise<T> {
    try {
      const client = await this.getClient();
      const { data: result, error } = await client
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select(select)
        .single();

      if (error) this.handleError(error);

      logger.info(`Updated entity`);
      return result as unknown as T;
    } catch (error) {
      logger.error(`Error in update`);
      throw error;
    }
  }

  /**
   * Update entities matching filters
   *
   * @param filters - Query filters
   * @param data - Update data
   * @param select - Columns to return (default: '*')
   * @returns Array of updated entities
   */
  async updateMany(filters: QueryFilters, data: Partial<T>, select: string = '*'): Promise<T[]> {
    try {
      const client = await this.getClient();
      let query = client.from(this.tableName).update(data);

      query = this.buildQuery(query, filters);

      const { data: result, error } = await query.select(select);

      if (error) this.handleError(error);

      logger.info(`Updated entities`);
      return (result as unknown as T[]) || [];
    } catch (error) {
      logger.error(`Error in updateMany`);
      throw error;
    }
  }

  /**
   * Delete entity by ID
   *
   * @param id - Entity ID
   */
  async delete(id: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) this.handleError(error);

      logger.info(`Deleted entity`);
    } catch (error) {
      logger.error(`Error in delete`);
      throw error;
    }
  }

  /**
   * Delete entities matching filters
   *
   * @param filters - Query filters
   * @returns Count of deleted entities
   */
  async deleteMany(filters: QueryFilters): Promise<number> {
    try {
      const client = await this.getClient();
      let query = client.from(this.tableName).delete({ count: 'exact' });

      query = this.buildQuery(query, filters);

      const { count, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Deleted entities`);
      return count || 0;
    } catch (error) {
      logger.error(`Error in deleteMany`);
      throw error;
    }
  }

  /**
   * Check if entity exists
   *
   * @param id - Entity ID
   * @returns True if entity exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const { count, error } = await client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('id', id);

      if (error) this.handleError(error);

      return (count || 0) > 0;
    } catch (error) {
      logger.error(`Error in exists`);
      throw error;
    }
  }

  /**
   * Build query with filters
   *
   * @param query - Supabase query builder
   * @param filters - Query filters
   * @returns Modified query builder
   */
  protected buildQuery(query: any, filters: QueryFilters): any {
    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        query = query.is(key, null);
      } else if (value === undefined) {
        // Skip undefined values
        continue;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Handle complex filters (e.g., { gte: 10, lte: 20 })
        for (const [operator, operatorValue] of Object.entries(value)) {
          query = query[operator](key, operatorValue);
        }
      } else if (Array.isArray(value)) {
        // Handle "in" queries
        query = query.in(key, value);
      } else {
        // Simple equality
        query = query.eq(key, value);
      }
    }

    return query;
  }

  /**
   * Apply ordering to query
   *
   * @param query - Supabase query builder
   * @param order - Order options
   * @returns Modified query builder
   */
  protected applyOrdering(query: any, order: OrderOptions | OrderOptions[]): any {
    const orders = Array.isArray(order) ? order : [order];

    for (const { column, ascending = true } of orders) {
      query = query.order(column, { ascending });
    }

    return query;
  }

  /**
   * Apply pagination to query
   *
   * @param query - Supabase query builder
   * @param pagination - Pagination options
   * @returns Modified query builder
   */
  protected applyPagination(query: any, pagination: PaginationOptions): any {
    const { page, limit, offset } = pagination;

    if (offset !== undefined) {
      query = query.range(offset, offset + (limit || 10) - 1);
    } else if (page !== undefined && limit !== undefined) {
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      query = query.range(start, end);
    } else if (limit !== undefined) {
      query = query.limit(limit);
    }

    return query;
  }

  /**
   * Handle Supabase errors
   *
   * @param error - Supabase error
   * @throws RepositoryError
   */
  protected handleError(error: PostgrestError): never {
    logger.error(`Database error in ${this.tableName}: ${error.message} (code: ${error.code})`);

    throw new RepositoryError(
      error.message,
      error.code,
      error.details,
      error.hint
    );
  }

  /**
   * Execute raw SQL query (admin context only)
   * USE WITH CAUTION - Bypasses type safety
   *
   * @param query - SQL query
   * @returns Query result
   */
  protected async executeRawQuery<R = any>(query: string): Promise<R> {
    if (this.context !== 'admin') {
      throw new RepositoryError(
        'Raw queries are only allowed in admin context',
        'PERMISSION_DENIED',
        { context: this.context }
      );
    }

    try {
      const client = await this.getClient();
      const { data, error } = await client.rpc('exec_sql', { query });

      if (error) this.handleError(error);

      logger.warn(`Executed raw query`);
      return data as R;
    } catch (error) {
      logger.error(`Error in executeRawQuery`);
      throw error;
    }
  }
}
