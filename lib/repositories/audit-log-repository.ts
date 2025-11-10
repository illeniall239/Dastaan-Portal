/**
 * AuditLog Repository
 *
 * Handles all database operations for audit logs.
 * Provides comprehensive audit trail for admin operations and sensitive actions.
 *
 * Usage:
 * ```typescript
 * const repo = new AuditLogRepository('admin'); // Use admin context
 *
 * // Log action
 * await repo.logAction({
 *   entity_type: 'user',
 *   entity_id: userId,
 *   action: 'role_changed',
 *   performed_by: adminId,
 *   details: { from: 'evaluator', to: 'manager' }
 * });
 *
 * // Get entity audit trail
 * const logs = await repo.findByEntity('user', userId);
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';

/**
 * Audit log entity
 */
export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  timestamp: string;
  details?: Record<string, any> | null;
}

/**
 * Audit log creation data
 */
export interface AuditLogCreateData {
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  details?: {
    ipAddress?: string;
    userAgent?: string;
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
    reason?: string;
    [key: string]: any;
  };
}

/**
 * Audit log search filters
 */
export interface AuditLogSearchFilters {
  entity_type?: string;
  entity_id?: string;
  action?: string;
  performed_by?: string;
  start_date?: Date;
  end_date?: Date;
}

/**
 * Audit log statistics
 */
export interface AuditLogStatistics {
  total: number;
  by_entity_type: Record<string, number>;
  by_action: Record<string, number>;
  by_user: Record<string, number>;
  recent_activity_count: number;
}

/**
 * AuditLog repository for managing audit trail data
 * Note: Should primarily use 'admin' context
 */
export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(context: RepositoryContextType = 'admin') {
    super('audit_logs', context);
  }

  /**
   * Log an action to the audit trail
   *
   * @param data - Audit log creation data
   * @returns Created audit log entry
   */
  async logAction(data: AuditLogCreateData): Promise<AuditLog> {
    try {
      logger.info(`Logging audit action: ${data.entity_type}/${data.entity_id} - ${data.action}`);

      const auditData = {
        ...data,
        details: data.details || null,
        timestamp: new Date().toISOString(),
      };

      const log = await this.create(auditData as Partial<AuditLog>);
      logger.info(`Audit log created: ${log.id}`);
      return log;
    } catch (error) {
      logger.error(`CRITICAL: Failed to create audit log: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`Action details: ${JSON.stringify(data)}`);
      throw error;
    }
  }

  /**
   * Log multiple actions in a single operation
   *
   * @param entries - Array of audit log creation data
   * @returns Array of created audit log entries
   */
  async logActions(entries: AuditLogCreateData[]): Promise<AuditLog[]> {
    try {
      logger.info(`Logging ${entries.length} audit actions`);

      const auditData = entries.map((entry) => ({
        ...entry,
        details: entry.details || null,
        timestamp: new Date().toISOString(),
      }));

      const logs = await this.createMany(auditData as Partial<AuditLog>[]);
      logger.info(`Created ${logs.length} audit logs`);
      return logs;
    } catch (error) {
      logger.error(`CRITICAL: Failed to create audit logs: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`Actions details: ${JSON.stringify(entries)}`);
      throw error;
    }
  }

  /**
   * Find audit logs by entity
   *
   * @param entityType - Entity type (e.g., 'user', 'story', 'evaluation')
   * @param entityId - Entity ID
   * @param options - Query options
   * @returns Array of audit logs
   */
  async findByEntity(entityType: string, entityId: string, options?: QueryOptions): Promise<AuditLog[]> {
    try {
      logger.info(`Finding audit logs for entity: ${entityType}/${entityId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          entity_type: entityType,
          entity_id: entityId,
        },
        order: options?.order || { column: 'timestamp', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find audit logs by entity: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find audit logs by user (who performed actions)
   *
   * @param userId - User ID who performed actions
   * @param options - Query options
   * @returns Array of audit logs
   */
  async findByUser(userId: string, options?: QueryOptions): Promise<AuditLog[]> {
    try {
      logger.info(`Finding audit logs for user: ${userId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          performed_by: userId,
        },
        order: options?.order || { column: 'timestamp', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find audit logs by user: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find audit logs by action type
   *
   * @param action - Action type (e.g., 'created', 'updated', 'deleted')
   * @param options - Query options
   * @returns Array of audit logs
   */
  async findByAction(action: string, options?: QueryOptions): Promise<AuditLog[]> {
    try {
      logger.info(`Finding audit logs for action: ${action}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          action,
        },
        order: options?.order || { column: 'timestamp', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find audit logs by action: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find audit logs by entity type
   *
   * @param entityType - Entity type (e.g., 'user', 'story')
   * @param options - Query options
   * @returns Array of audit logs
   */
  async findByEntityType(entityType: string, options?: QueryOptions): Promise<AuditLog[]> {
    try {
      logger.info(`Finding audit logs for entity type: ${entityType}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          entity_type: entityType,
        },
        order: options?.order || { column: 'timestamp', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find audit logs by entity type: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find audit logs within a date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @param options - Query options
   * @returns Array of audit logs
   */
  async findByDateRange(startDate: Date, endDate: Date, options?: QueryOptions): Promise<AuditLog[]> {
    try {
      logger.info(`Finding audit logs between ${startDate.toISOString()} and ${endDate.toISOString()}`);

      const client = await this.getClient();
      let query = client.from(this.tableName).select(options?.select || '*');

      // Apply date range filters
      query = query.gte('timestamp', startDate.toISOString()).lte('timestamp', endDate.toISOString());

      // Apply additional filters
      if (options?.filters) {
        query = this.buildQuery(query, options.filters);
      }

      // Apply ordering
      if (options?.order) {
        query = this.applyOrdering(query, options.order);
      } else {
        query = query.order('timestamp', { ascending: false });
      }

      // Apply pagination
      if (options?.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Found ${data?.length || 0} audit logs in date range`);
      return (data as unknown as AuditLog[]) || [];
    } catch (error) {
      logger.error(`Failed to find audit logs by date range: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Search audit logs with complex filters
   *
   * @param filters - Search filters
   * @param options - Query options
   * @returns Array of matching audit logs
   */
  async searchWithFilters(filters: AuditLogSearchFilters, options?: QueryOptions): Promise<AuditLog[]> {
    try {
      logger.info(`Searching audit logs with filters`);

      const client = await this.getClient();
      let query = client.from(this.tableName).select(options?.select || '*');

      // Apply filters
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }

      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.performed_by) {
        query = query.eq('performed_by', filters.performed_by);
      }

      if (filters.start_date) {
        query = query.gte('timestamp', filters.start_date.toISOString());
      }

      if (filters.end_date) {
        query = query.lte('timestamp', filters.end_date.toISOString());
      }

      // Apply additional filters from options
      if (options?.filters) {
        query = this.buildQuery(query, options.filters);
      }

      // Apply ordering
      if (options?.order) {
        query = this.applyOrdering(query, options.order);
      } else {
        query = query.order('timestamp', { ascending: false });
      }

      // Apply pagination
      if (options?.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Found ${data?.length || 0} audit logs matching filters`);
      return (data as unknown as AuditLog[]) || [];
    } catch (error) {
      logger.error(`Failed to search audit logs: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get recent audit logs
   *
   * @param limit - Number of logs to return
   * @returns Array of recent audit logs
   */
  async getRecent(limit: number = 100): Promise<AuditLog[]> {
    try {
      logger.info(`Getting ${limit} recent audit logs`);

      return await this.findAll({
        order: { column: 'timestamp', ascending: false },
        pagination: { limit },
      });
    } catch (error) {
      logger.error(`Failed to get recent audit logs: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count audit logs by entity type
   *
   * @returns Object with counts by entity type
   */
  async countByEntityType(): Promise<Record<string, number>> {
    try {
      logger.info(`Counting audit logs by entity type`);

      const client = await this.getClient();
      const { data, error } = await client.from(this.tableName).select('entity_type');

      if (error) this.handleError(error);

      const counts: Record<string, number> = {};

      for (const row of data || []) {
        if (row.entity_type) {
          counts[row.entity_type] = (counts[row.entity_type] || 0) + 1;
        }
      }

      logger.info(`Counted audit logs by entity type`);
      return counts;
    } catch (error) {
      logger.error(`Failed to count by entity type: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count audit logs by action
   *
   * @returns Object with counts by action
   */
  async countByAction(): Promise<Record<string, number>> {
    try {
      logger.info(`Counting audit logs by action`);

      const client = await this.getClient();
      const { data, error } = await client.from(this.tableName).select('action');

      if (error) this.handleError(error);

      const counts: Record<string, number> = {};

      for (const row of data || []) {
        if (row.action) {
          counts[row.action] = (counts[row.action] || 0) + 1;
        }
      }

      logger.info(`Counted audit logs by action`);
      return counts;
    } catch (error) {
      logger.error(`Failed to count by action: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get audit log statistics
   *
   * @param recentDays - Number of days to consider as "recent"
   * @returns Statistics object
   */
  async getStatistics(recentDays: number = 7): Promise<AuditLogStatistics> {
    try {
      logger.info(`Calculating audit log statistics`);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('entity_type, action, performed_by, timestamp');

      if (error) this.handleError(error);

      const stats: AuditLogStatistics = {
        total: data?.length || 0,
        by_entity_type: {},
        by_action: {},
        by_user: {},
        recent_activity_count: 0,
      };

      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - recentDays);

      for (const row of data || []) {
        // Count by entity type
        if (row.entity_type) {
          stats.by_entity_type[row.entity_type] = (stats.by_entity_type[row.entity_type] || 0) + 1;
        }

        // Count by action
        if (row.action) {
          stats.by_action[row.action] = (stats.by_action[row.action] || 0) + 1;
        }

        // Count by user
        if (row.performed_by) {
          stats.by_user[row.performed_by] = (stats.by_user[row.performed_by] || 0) + 1;
        }

        // Count recent activity
        if (row.timestamp && new Date(row.timestamp) >= recentCutoff) {
          stats.recent_activity_count++;
        }
      }

      logger.info(`Statistics calculated`);
      return stats;
    } catch (error) {
      logger.error(`Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete old audit logs (for cleanup/retention policy)
   * WARNING: Use with caution - audit logs are critical for compliance
   *
   * @param olderThanDays - Delete logs older than this many days
   * @returns Number of logs deleted
   */
  async deleteOldLogs(olderThanDays: number): Promise<number> {
    try {
      logger.info(`Deleting audit logs older than ${olderThanDays} days`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id');

      if (error) this.handleError(error);

      const count = data?.length || 0;
      logger.info(`Deleted ${count} old audit logs`);
      return count;
    } catch (error) {
      logger.error(`Failed to delete old audit logs: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Helper function to create an AuditLogRepository instance
 *
 * @param context - Repository context (should typically be 'admin')
 * @returns AuditLogRepository instance
 */
export function createAuditLogRepository(context: RepositoryContextType = 'admin'): AuditLogRepository {
  return new AuditLogRepository(context);
}
