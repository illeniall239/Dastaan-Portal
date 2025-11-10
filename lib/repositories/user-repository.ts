/**
 * User Repository
 *
 * Handles all database operations for users.
 *
 * Usage:
 * ```typescript
 * // In API route
 * const userRepo = new UserRepository('admin');
 * const user = await userRepo.findByEmail('user@geo.com');
 *
 * // In server component
 * const userRepo = new UserRepository('server');
 * const users = await userRepo.findByRole('evaluator');
 *
 * // In client component
 * const userRepo = new UserRepository('client');
 * const searchResults = await userRepo.searchUsers('john');
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';
import type { User, UserRole } from '@/types';

/**
 * User search filters
 */
export interface UserSearchFilters {
  role?: UserRole | UserRole[];
  department?: string | string[];
  status?: string | string[];
  query?: string; // Search across name, email
}

/**
 * User repository for managing user data
 */
export class UserRepository extends BaseRepository<User> {
  constructor(context: RepositoryContextType = 'server') {
    super('users', context);
  }

  /**
   * Find user by email address
   *
   * @param email - User email address
   * @returns User or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      logger.info(`Finding user by email`);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        // Handle "not found" gracefully
        if (error.code === 'PGRST116') {
          logger.info(`User not found by email`);
          return null;
        }
        this.handleError(error);
      }

      logger.info(`Found user by email`);
      return data as User;
    } catch (error) {
      logger.error(`Error in findByEmail`);
      throw error;
    }
  }

  /**
   * Find all users by role
   *
   * @param role - User role(s) to filter by
   * @param options - Query options (pagination, ordering, etc.)
   * @returns Array of users with the specified role
   */
  async findByRole(role: UserRole | UserRole[], options?: QueryOptions): Promise<User[]> {
    try {
      logger.info(`Finding users by role`);

      return this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          role,
        },
      });
    } catch (error) {
      logger.error(`Error in findByRole`);
      throw error;
    }
  }

  /**
   * Find all users by department
   *
   * @param department - Department name(s)
   * @param options - Query options
   * @returns Array of users in the department
   */
  async findByDepartment(department: string | string[], options?: QueryOptions): Promise<User[]> {
    try {
      logger.info(`Finding users by department`);

      return this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          department,
        },
      });
    } catch (error) {
      logger.error(`Error in findByDepartment`);
      throw error;
    }
  }

  /**
   * Find all users by status
   *
   * @param status - User status (e.g., 'active', 'inactive', 'suspended')
   * @param options - Query options
   * @returns Array of users with the status
   */
  async findByStatus(status: string | string[], options?: QueryOptions): Promise<User[]> {
    try {
      logger.info(`Finding users by status`);

      return this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          status,
        },
      });
    } catch (error) {
      logger.error(`Error in findByStatus`);
      throw error;
    }
  }

  /**
   * Search users by name or email
   *
   * @param query - Search query
   * @param options - Query options
   * @returns Array of matching users
   */
  async searchUsers(query: string, options?: QueryOptions): Promise<User[]> {
    try {
      logger.info(`Searching users`);

      const client = await this.getClient();
      let dbQuery = client
        .from(this.tableName)
        .select(options?.select || '*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`);

      // Apply additional filters if provided
      if (options?.filters) {
        dbQuery = this.buildQuery(dbQuery, options.filters);
      }

      // Apply ordering
      if (options?.order) {
        dbQuery = this.applyOrdering(dbQuery, options.order);
      }

      // Apply pagination
      if (options?.pagination) {
        dbQuery = this.applyPagination(dbQuery, options.pagination);
      }

      const { data, error } = await dbQuery;

      if (error) this.handleError(error);

      logger.info(`Search completed`);
      return (data as unknown as User[]) || [];
    } catch (error) {
      logger.error(`Error in searchUsers`);
      throw error;
    }
  }

  /**
   * Search users with complex filters
   *
   * @param filters - Search filters
   * @param options - Query options
   * @returns Array of matching users
   */
  async searchWithFilters(filters: UserSearchFilters, options?: QueryOptions): Promise<User[]> {
    try {
      logger.info(`Searching users with filters`);

      const queryFilters: any = { ...options?.filters };

      // Add role filter
      if (filters.role) {
        queryFilters.role = filters.role;
      }

      // Add department filter
      if (filters.department) {
        queryFilters.department = filters.department;
      }

      // Add status filter
      if (filters.status) {
        queryFilters.status = filters.status;
      }

      // If query is provided, use searchUsers instead
      if (filters.query) {
        return this.searchUsers(filters.query, {
          ...options,
          filters: queryFilters,
        });
      }

      // Otherwise use regular findAll
      return this.findAll({
        ...options,
        filters: queryFilters,
      });
    } catch (error) {
      logger.error(`Error in searchWithFilters`);
      throw error;
    }
  }

  /**
   * Update user role
   *
   * @param userId - User ID
   * @param role - New role
   * @returns Updated user
   */
  async updateRole(userId: string, role: UserRole): Promise<User> {
    try {
      logger.info(`Updating user role`);

      const user = await this.update(userId, { role });

      logger.info(`User role updated successfully`);
      return user;
    } catch (error) {
      logger.error(`Error in updateRole`);
      throw error;
    }
  }

  /**
   * Update user status
   *
   * @param userId - User ID
   * @param status - New status
   * @returns Updated user
   */
  async updateStatus(userId: string, status: string): Promise<User> {
    try {
      logger.info(`Updating user status`);

      const user = await this.update(userId, { status });

      logger.info(`User status updated successfully`);
      return user;
    } catch (error) {
      logger.error(`Error in updateStatus`);
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   *
   * @param userId - User ID
   * @returns Updated user
   */
  async updateLastLogin(userId: string): Promise<User> {
    try {
      logger.info(`Updating user last login`);

      const user = await this.update(userId, {
        last_login: new Date().toISOString(),
      });

      logger.info(`User last login updated`);
      return user;
    } catch (error) {
      logger.error(`Error in updateLastLogin`);
      throw error;
    }
  }

  /**
   * Check if email is already taken
   *
   * @param email - Email to check
   * @param excludeUserId - User ID to exclude from check (for updates)
   * @returns True if email is taken
   */
  async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      logger.info(`Checking if email is taken`);

      const client = await this.getClient();
      let query = client
        .from(this.tableName)
        .select('id', { count: 'exact', head: true })
        .eq('email', email);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { count, error } = await query;

      if (error) this.handleError(error);

      const isTaken = (count || 0) > 0;
      logger.info(`Email availability checked`);

      return isTaken;
    } catch (error) {
      logger.error(`Error in isEmailTaken`);
      throw error;
    }
  }

  /**
   * Get active evaluators (users with evaluator role and active status)
   *
   * @param options - Query options
   * @returns Array of active evaluators
   */
  async getActiveEvaluators(options?: QueryOptions): Promise<User[]> {
    try {
      logger.info('Finding active evaluators');

      return this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          role: 'evaluator',
          status: 'active',
        },
      });
    } catch (error) {
      logger.error(`Error in getActiveEvaluators`);
      throw error;
    }
  }

  /**
   * Get users by IDs
   *
   * @param userIds - Array of user IDs
   * @param options - Query options
   * @returns Array of users
   */
  async findByIds(userIds: string[], options?: QueryOptions): Promise<User[]> {
    try {
      logger.info(`Finding users by IDs`);

      if (userIds.length === 0) {
        return [];
      }

      const client = await this.getClient();
      let query = client
        .from(this.tableName)
        .select(options?.select || '*')
        .in('id', userIds);

      // Apply ordering
      if (options?.order) {
        query = this.applyOrdering(query, options.order);
      }

      const { data, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Found users by IDs`);
      return (data as unknown as User[]) || [];
    } catch (error) {
      logger.error(`Error in findByIds`);
      throw error;
    }
  }

  /**
   * Count users by role
   *
   * @returns Object with role counts
   */
  async countByRole(): Promise<Record<UserRole, number>> {
    try {
      logger.info('Counting users by role');

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('role');

      if (error) this.handleError(error);

      // Count occurrences of each role
      const roleCounts: Record<string, number> = {};

      const roles: UserRole[] = [
        'admin',
        'management',
        'content_manager',
        'evaluator',
        'executive',
        'legal',
        'finance',
        'content_creator',
      ];

      // Initialize all roles with 0
      for (const role of roles) {
        roleCounts[role] = 0;
      }

      // Count actual occurrences
      for (const row of data || []) {
        if (row.role) {
          roleCounts[row.role] = (roleCounts[row.role] || 0) + 1;
        }
      }

      logger.info(`Users counted by role`);
      return roleCounts as Record<UserRole, number>;
    } catch (error) {
      logger.error(`Error in countByRole`);
      throw error;
    }
  }

  /**
   * Get user statistics
   *
   * @returns User statistics object
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
    byDepartment: Record<string, number>;
  }> {
    try {
      logger.info('Getting user statistics');

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('role, status, department');

      if (error) this.handleError(error);

      const stats = {
        total: data?.length || 0,
        active: 0,
        inactive: 0,
        byRole: {} as Record<UserRole, number>,
        byDepartment: {} as Record<string, number>,
      };

      // Initialize role counts
      const roles: UserRole[] = [
        'admin',
        'management',
        'content_manager',
        'evaluator',
        'executive',
        'legal',
        'finance',
        'content_creator',
      ];

      for (const role of roles) {
        stats.byRole[role] = 0;
      }

      // Process data
      for (const row of data || []) {
        // Count by status
        if (row.status === 'active') {
          stats.active++;
        } else {
          stats.inactive++;
        }

        // Count by role
        if (row.role) {
          stats.byRole[row.role as UserRole] = (stats.byRole[row.role as UserRole] || 0) + 1;
        }

        // Count by department
        if (row.department) {
          stats.byDepartment[row.department] = (stats.byDepartment[row.department] || 0) + 1;
        }
      }

      logger.info(`User statistics calculated`);
      return stats;
    } catch (error) {
      logger.error(`Error in getStatistics`);
      throw error;
    }
  }
}

/**
 * Helper function to create a UserRepository instance
 *
 * @param context - Repository context
 * @returns UserRepository instance
 */
export function createUserRepository(context: RepositoryContextType = 'server'): UserRepository {
  return new UserRepository(context);
}
