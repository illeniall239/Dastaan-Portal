/**
 * User Service
 *
 * Business logic layer for user management operations.
 * Orchestrates repositories, handles complex workflows, and enforces business rules.
 *
 * Usage:
 * ```typescript
 * // In API route
 * const userService = new UserService('admin');
 * const user = await userService.createUser({
 *   email: 'user@geo.com',
 *   name: 'John Doe',
 *   role: 'evaluator',
 *   department: 'Content'
 * });
 *
 * // In server component
 * const userService = new UserService('server');
 * const stats = await userService.getUserStatistics();
 * ```
 */

import { UserRepository } from '@/lib/repositories/user-repository';
import { executeTransaction, type RepositoryContextType } from '@/lib/repositories/base';
import { logger } from '@/lib/logger';
import type { User, UserRole } from '@/types';

/**
 * User creation data
 */
export interface CreateUserData {
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  position?: string;
  status?: string;
}

/**
 * User update data
 */
export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  department?: string;
  phone?: string;
  position?: string;
  avatar_url?: string;
  status?: string;
}

/**
 * User search criteria
 */
export interface UserSearchCriteria {
  query?: string;
  role?: UserRole | UserRole[];
  department?: string | string[];
  status?: string | string[];
  page?: number;
  limit?: number;
}

/**
 * User statistics
 */
export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
  byDepartment: Record<string, number>;
  recentLogins: User[];
}

/**
 * Service error
 */
export class UserServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

/**
 * User service for managing user-related business logic
 */
export class UserService {
  private readonly userRepo: UserRepository;
  private readonly context: RepositoryContextType;

  constructor(context: RepositoryContextType = 'server') {
    this.context = context;
    this.userRepo = new UserRepository(context);
  }

  /**
   * Create a new user
   *
   * @param data - User creation data
   * @returns Created user
   * @throws UserServiceError if validation fails or email is already taken
   */
  async createUser(data: CreateUserData): Promise<User> {
    try {
      logger.info(`Creating user: ${data.email}`);

      // Validate email domain
      if (!this.isValidEmailDomain(data.email)) {
        throw new UserServiceError(
          'Invalid email domain. Only @geo.com emails are allowed.',
          'INVALID_EMAIL_DOMAIN',
          { email: data.email }
        );
      }

      // Check if email is already taken
      const emailTaken = await this.userRepo.isEmailTaken(data.email);
      if (emailTaken) {
        throw new UserServiceError(
          'Email address is already registered.',
          'EMAIL_ALREADY_EXISTS',
          { email: data.email }
        );
      }

      // Create user with default values
      const user = await this.userRepo.create({
        ...data,
        status: data.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      logger.info(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      logger.error(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to create user',
        'CREATE_USER_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get user by ID
   *
   * @param userId - User ID
   * @returns User or null if not found
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepo.findById(userId);
    } catch (error) {
      logger.error(`Failed to get user by ID: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to retrieve user',
        'GET_USER_FAILED',
        { userId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get user by email
   *
   * @param email - User email
   * @returns User or null if not found
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepo.findByEmail(email);
    } catch (error) {
      logger.error(`Failed to get user by email: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to retrieve user',
        'GET_USER_FAILED',
        { email, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update user information
   *
   * @param userId - User ID
   * @param data - Update data
   * @returns Updated user
   * @throws UserServiceError if validation fails
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<User> {
    try {
      logger.info(`Updating user: ${userId}`);

      // Validate user exists
      const existingUser = await this.userRepo.findById(userId);
      if (!existingUser) {
        throw new UserServiceError(
          'User not found',
          'USER_NOT_FOUND',
          { userId }
        );
      }

      // Update user
      const updatedUser = await this.userRepo.update(userId, {
        ...data,
        updated_at: new Date().toISOString(),
      });

      logger.info(`User updated successfully: ${userId}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      logger.error(`Failed to update user: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to update user',
        'UPDATE_USER_FAILED',
        { userId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update user role
   *
   * @param userId - User ID
   * @param role - New role
   * @param performedBy - ID of user performing the action
   * @returns Updated user
   */
  async updateUserRole(userId: string, role: UserRole, performedBy: string): Promise<User> {
    try {
      logger.info(`Updating user role: ${userId} to ${role}`);

      // Validate user exists
      const existingUser = await this.userRepo.findById(userId);
      if (!existingUser) {
        throw new UserServiceError(
          'User not found',
          'USER_NOT_FOUND',
          { userId }
        );
      }

      // Prevent self-demotion from admin
      if (userId === performedBy && existingUser.role === 'admin' && role !== 'admin') {
        throw new UserServiceError(
          'Cannot remove admin role from yourself',
          'SELF_DEMOTION_FORBIDDEN',
          { userId }
        );
      }

      // Update role
      const updatedUser = await this.userRepo.updateRole(userId, role);

      logger.info(`User role updated: ${userId} to ${role}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      logger.error(`Failed to update user role: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to update user role',
        'UPDATE_ROLE_FAILED',
        { userId, role, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Update user status
   *
   * @param userId - User ID
   * @param status - New status ('active', 'inactive', 'suspended')
   * @param performedBy - ID of user performing the action
   * @returns Updated user
   */
  async updateUserStatus(userId: string, status: string, performedBy: string): Promise<User> {
    try {
      logger.info(`Updating user status: ${userId} to ${status}`);

      // Validate user exists
      const existingUser = await this.userRepo.findById(userId);
      if (!existingUser) {
        throw new UserServiceError(
          'User not found',
          'USER_NOT_FOUND',
          { userId }
        );
      }

      // Prevent self-suspension
      if (userId === performedBy && status !== 'active') {
        throw new UserServiceError(
          'Cannot deactivate your own account',
          'SELF_DEACTIVATION_FORBIDDEN',
          { userId }
        );
      }

      // Update status
      const updatedUser = await this.userRepo.updateStatus(userId, status);

      logger.info(`User status updated: ${userId} to ${status}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      logger.error(`Failed to update user status: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to update user status',
        'UPDATE_STATUS_FAILED',
        { userId, status, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Delete user
   *
   * @param userId - User ID
   * @param performedBy - ID of user performing the action
   */
  async deleteUser(userId: string, performedBy: string): Promise<void> {
    try {
      logger.info(`Deleting user: ${userId}`);

      // Prevent self-deletion
      if (userId === performedBy) {
        throw new UserServiceError(
          'Cannot delete your own account',
          'SELF_DELETION_FORBIDDEN',
          { userId }
        );
      }

      // Validate user exists
      const existingUser = await this.userRepo.findById(userId);
      if (!existingUser) {
        throw new UserServiceError(
          'User not found',
          'USER_NOT_FOUND',
          { userId }
        );
      }

      // Delete user
      await this.userRepo.delete(userId);

      logger.info(`User deleted successfully: ${userId}`);
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      logger.error(`Failed to delete user: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to delete user',
        'DELETE_USER_FAILED',
        { userId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Search users with filters
   *
   * @param criteria - Search criteria
   * @returns Matching users
   */
  async searchUsers(criteria: UserSearchCriteria): Promise<User[]> {
    try {
      logger.info(`Searching users with criteria`);

      return await this.userRepo.searchWithFilters(
        {
          query: criteria.query,
          role: criteria.role,
          department: criteria.department,
          status: criteria.status,
        },
        {
          order: { column: 'name', ascending: true },
          pagination: {
            page: criteria.page,
            limit: criteria.limit || 20,
          },
        }
      );
    } catch (error) {
      logger.error(`Failed to search users: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to search users',
        'SEARCH_USERS_FAILED',
        { criteria, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get all active evaluators
   *
   * @returns Array of active evaluators
   */
  async getActiveEvaluators(): Promise<User[]> {
    try {
      return await this.userRepo.getActiveEvaluators({
        order: { column: 'name', ascending: true },
      });
    } catch (error) {
      logger.error(`Failed to get active evaluators: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to retrieve evaluators',
        'GET_EVALUATORS_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get users by role
   *
   * @param role - User role
   * @returns Array of users with the specified role
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      return await this.userRepo.findByRole(role, {
        order: { column: 'name', ascending: true },
      });
    } catch (error) {
      logger.error(`Failed to get users by role: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to retrieve users by role',
        'GET_USERS_BY_ROLE_FAILED',
        { role, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get comprehensive user statistics
   *
   * @returns User statistics
   */
  async getUserStatistics(): Promise<UserStatistics> {
    try {
      logger.info(`Calculating user statistics`);

      const stats = await this.userRepo.getStatistics();

      // Get recently logged in users
      const recentLogins = await this.userRepo.findAll({
        filters: { status: 'active' },
        order: { column: 'last_login', ascending: false },
        pagination: { limit: 10 },
      });

      return {
        ...stats,
        recentLogins,
      };
    } catch (error) {
      logger.error(`Failed to get user statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to retrieve statistics',
        'GET_STATISTICS_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Record user login
   *
   * @param userId - User ID
   * @returns Updated user
   */
  async recordLogin(userId: string): Promise<User> {
    try {
      return await this.userRepo.updateLastLogin(userId);
    } catch (error) {
      logger.error(`Failed to record login: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to record login',
        'RECORD_LOGIN_FAILED',
        { userId, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Validate email domain
   *
   * @param email - Email address to validate
   * @returns True if domain is valid
   */
  private isValidEmailDomain(email: string): boolean {
    const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'geo.com';
    return email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`);
  }

  /**
   * Bulk update user status
   *
   * @param userIds - Array of user IDs
   * @param status - New status
   * @param performedBy - ID of user performing the action
   * @returns Number of users updated
   */
  async bulkUpdateStatus(userIds: string[], status: string, performedBy: string): Promise<number> {
    try {
      logger.info(`Bulk updating ${userIds.length} users to status: ${status}`);

      // Filter out the performing user to prevent self-deactivation
      const filteredUserIds = userIds.filter(id => id !== performedBy || status === 'active');

      if (filteredUserIds.length === 0) {
        throw new UserServiceError(
          'Cannot deactivate your own account',
          'SELF_DEACTIVATION_FORBIDDEN'
        );
      }

      const users = await this.userRepo.updateMany(
        { id: filteredUserIds },
        { status, updated_at: new Date().toISOString() }
      );

      logger.info(`Bulk updated ${users.length} users`);
      return users.length;
    } catch (error) {
      if (error instanceof UserServiceError) {
        throw error;
      }
      logger.error(`Failed to bulk update status: ${error instanceof Error ? error.message : String(error)}`);
      throw new UserServiceError(
        'Failed to bulk update status',
        'BULK_UPDATE_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}

/**
 * Helper function to create a UserService instance
 *
 * @param context - Repository context
 * @returns UserService instance
 */
export function createUserService(context: RepositoryContextType = 'server'): UserService {
  return new UserService(context);
}
