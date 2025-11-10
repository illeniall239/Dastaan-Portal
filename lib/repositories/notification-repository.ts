/**
 * Notification Repository
 *
 * Handles all database operations for user notifications.
 * Manages notification creation, retrieval, and status updates.
 *
 * Usage:
 * ```typescript
 * const repo = new NotificationRepository('server');
 *
 * // Create notification (uses admin context)
 * const notification = await repo.createNotification({
 *   user_id: '...',
 *   type: 'success',
 *   title: 'Evaluation completed',
 *   message: '...'
 * });
 *
 * // Get user notifications
 * const notifications = await repo.findByUserId(userId);
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';

/**
 * Notification type
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification entity
 */
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Notification creation data
 */
export interface NotificationCreateData {
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  entity_type?: string;
  entity_id?: string;
}

/**
 * Notification statistics
 */
export interface NotificationStatistics {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
  by_user: Record<string, number>;
}

/**
 * Notification repository for managing notification data
 */
export class NotificationRepository extends BaseRepository<Notification> {
  constructor(context: RepositoryContextType = 'server') {
    super('notifications', context);
  }

  /**
   * Create a notification for a user
   * Note: Should use 'admin' context to bypass RLS
   *
   * @param data - Notification creation data
   * @returns Created notification
   */
  async createNotification(data: NotificationCreateData): Promise<Notification> {
    try {
      logger.info(`Creating notification for user ${data.user_id}: ${data.title}`);

      const notificationData = {
        ...data,
        message: data.message || null,
        entity_type: data.entity_type || null,
        entity_id: data.entity_id || null,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const notification = await this.create(notificationData as Partial<Notification>);
      logger.info(`Notification created: ${notification.id}`);
      return notification;
    } catch (error) {
      logger.error(`Failed to create notification: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   *
   * @param userIds - Array of user IDs
   * @param type - Notification type
   * @param title - Notification title
   * @param message - Optional message
   * @param entityType - Optional entity type
   * @param entityId - Optional entity ID
   * @returns Array of created notifications
   */
  async createNotificationsForUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message?: string,
    entityType?: string,
    entityId?: string
  ): Promise<Notification[]> {
    try {
      logger.info(`Creating notifications for ${userIds.length} users: ${title}`);

      const notifications = userIds.map((userId) => ({
        user_id: userId,
        type,
        title,
        message: message || null,
        entity_type: entityType || null,
        entity_id: entityId || null,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      const created = await this.createMany(notifications as Partial<Notification>[]);
      logger.info(`Created ${created.length} notifications`);
      return created;
    } catch (error) {
      logger.error(`Failed to create notifications: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find notifications by user ID
   *
   * @param userId - User ID
   * @param options - Query options
   * @returns Array of notifications
   */
  async findByUserId(userId: string, options?: QueryOptions): Promise<Notification[]> {
    try {
      logger.info(`Finding notifications for user: ${userId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          user_id: userId,
        },
        order: options?.order || { column: 'created_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find notifications by user: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find unread notifications for a user
   *
   * @param userId - User ID
   * @param options - Query options
   * @returns Array of unread notifications
   */
  async findUnreadByUserId(userId: string, options?: QueryOptions): Promise<Notification[]> {
    try {
      logger.info(`Finding unread notifications for user: ${userId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          user_id: userId,
          is_read: false,
        },
        order: options?.order || { column: 'created_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find unread notifications: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count unread notifications for a user
   *
   * @param userId - User ID
   * @returns Unread count
   */
  async countUnreadByUserId(userId: string): Promise<number> {
    try {
      logger.info(`Counting unread notifications for user: ${userId}`);

      return await this.count({
        user_id: userId,
        is_read: false,
      });
    } catch (error) {
      logger.error(`Failed to count unread notifications: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Mark notification as read
   *
   * @param notificationId - Notification ID
   * @param userId - User ID (for verification)
   * @returns Updated notification
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    try {
      logger.info(`Marking notification as read: ${notificationId}`);

      // Verify notification belongs to user
      const notification = await this.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.user_id !== userId) {
        throw new Error('Notification does not belong to user');
      }

      return await this.update(notificationId, {
        is_read: true,
      } as Partial<Notification>);
    } catch (error) {
      logger.error(`Failed to mark notification as read: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   *
   * @param userId - User ID
   * @returns Updated notifications
   */
  async markAllAsReadByUserId(userId: string): Promise<Notification[]> {
    try {
      logger.info(`Marking all notifications as read for user: ${userId}`);

      return await this.updateMany(
        {
          user_id: userId,
          is_read: false,
        },
        {
          is_read: true,
        } as Partial<Notification>
      );
    } catch (error) {
      logger.error(`Failed to mark all notifications as read: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find notifications by entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param options - Query options
   * @returns Array of notifications
   */
  async findByEntity(entityType: string, entityId: string, options?: QueryOptions): Promise<Notification[]> {
    try {
      logger.info(`Finding notifications for entity: ${entityType}/${entityId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          entity_type: entityType,
          entity_id: entityId,
        },
      });
    } catch (error) {
      logger.error(`Failed to find notifications by entity: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find notifications by type
   *
   * @param type - Notification type
   * @param options - Query options
   * @returns Array of notifications
   */
  async findByType(type: NotificationType, options?: QueryOptions): Promise<Notification[]> {
    try {
      logger.info(`Finding notifications of type: ${type}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          type,
        },
      });
    } catch (error) {
      logger.error(`Failed to find notifications by type: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete notification
   *
   * @param notificationId - Notification ID
   * @param userId - User ID (for verification)
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      logger.info(`Deleting notification: ${notificationId}`);

      // Verify notification belongs to user
      const notification = await this.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.user_id !== userId) {
        throw new Error('Notification does not belong to user');
      }

      await this.delete(notificationId);
      logger.info(`Notification deleted: ${notificationId}`);
    } catch (error) {
      logger.error(`Failed to delete notification: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   *
   * @param userId - User ID
   * @returns Number of notifications deleted
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    try {
      logger.info(`Deleting all notifications for user: ${userId}`);

      const count = await this.deleteMany({ user_id: userId });

      logger.info(`Deleted ${count} notifications`);
      return count;
    } catch (error) {
      logger.error(`Failed to delete notifications: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete old read notifications (cleanup)
   *
   * @param daysOld - Delete notifications older than this many days
   * @returns Number of notifications deleted
   */
  async deleteOldReadNotifications(daysOld: number = 30): Promise<number> {
    try {
      logger.info(`Deleting read notifications older than ${daysOld} days`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .delete()
        .eq('is_read', true)
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) this.handleError(error);

      const count = data?.length || 0;
      logger.info(`Deleted ${count} old read notifications`);
      return count;
    } catch (error) {
      logger.error(`Failed to delete old notifications: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get notification statistics
   *
   * @returns Statistics object
   */
  async getStatistics(): Promise<NotificationStatistics> {
    try {
      logger.info(`Calculating notification statistics`);

      const client = await this.getClient();
      const { data, error } = await client.from(this.tableName).select('type, is_read, user_id');

      if (error) this.handleError(error);

      const stats: NotificationStatistics = {
        total: data?.length || 0,
        unread: 0,
        by_type: {
          info: 0,
          success: 0,
          warning: 0,
          error: 0,
        },
        by_user: {},
      };

      for (const row of data || []) {
        // Count unread
        if (!row.is_read) {
          stats.unread++;
        }

        // Count by type
        if (row.type) {
          stats.by_type[row.type as NotificationType] =
            (stats.by_type[row.type as NotificationType] || 0) + 1;
        }

        // Count by user
        if (row.user_id) {
          stats.by_user[row.user_id] = (stats.by_user[row.user_id] || 0) + 1;
        }
      }

      logger.info(`Statistics calculated`);
      return stats;
    } catch (error) {
      logger.error(`Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Helper function to create a NotificationRepository instance
 *
 * @param context - Repository context
 * @returns NotificationRepository instance
 */
export function createNotificationRepository(
  context: RepositoryContextType = 'server'
): NotificationRepository {
  return new NotificationRepository(context);
}
