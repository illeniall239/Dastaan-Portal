/**
 * Attachment Repository
 *
 * Handles all database operations for file attachments.
 * Manages attachment metadata (actual file storage handled separately via Supabase Storage).
 *
 * Usage:
 * ```typescript
 * const repo = new AttachmentRepository('server');
 *
 * // Create attachment record
 * const attachment = await repo.createAttachment({
 *   entity_type: 'story',
 *   entity_id: storyId,
 *   file_name: 'script.pdf',
 *   file_path: 'stories/abc123/script.pdf',
 *   file_size: 1024000,
 *   file_type: 'application/pdf',
 *   uploaded_by: userId
 * });
 *
 * // Get attachments for entity
 * const attachments = await repo.findByEntity('story', storyId);
 * ```
 */

import { BaseRepository, type RepositoryContextType, type QueryOptions } from './base';
import { logger } from '@/lib/logger';

/**
 * Attachment entity
 */
export interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  file_type?: string | null;
  uploaded_by?: string | null;
  uploaded_at: string;
}

/**
 * Attachment with uploader details
 */
export interface AttachmentWithUploader extends Attachment {
  uploader?: {
    name: string;
    email: string;
  } | null;
}

/**
 * Attachment creation data
 */
export interface AttachmentCreateData {
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type?: string;
  uploaded_by: string;
}

/**
 * Attachment search filters
 */
export interface AttachmentSearchFilters {
  entity_type?: string;
  entity_id?: string;
  uploaded_by?: string;
  file_type?: string;
}

/**
 * Attachment statistics
 */
export interface AttachmentStatistics {
  total: number;
  total_size: number;
  by_entity_type: Record<string, number>;
  by_file_type: Record<string, number>;
  by_user: Record<string, number>;
  average_file_size: number;
}

/**
 * Attachment repository for managing attachment metadata
 * Note: This handles database records only. File storage operations
 * should be handled via Supabase Storage API or AttachmentService.
 */
export class AttachmentRepository extends BaseRepository<Attachment> {
  constructor(context: RepositoryContextType = 'server') {
    super('attachments', context);
  }

  /**
   * Create an attachment record
   *
   * @param data - Attachment creation data
   * @returns Created attachment
   */
  async createAttachment(data: AttachmentCreateData): Promise<Attachment> {
    try {
      logger.info(`Creating attachment record: ${data.file_name} for ${data.entity_type}/${data.entity_id}`);

      const attachmentData = {
        ...data,
        file_size: data.file_size || null,
        file_type: data.file_type || null,
        uploaded_at: new Date().toISOString(),
      };

      const attachment = await this.create(attachmentData as Partial<Attachment>);
      logger.info(`Attachment record created: ${attachment.id}`);
      return attachment;
    } catch (error) {
      logger.error(`Failed to create attachment record: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find attachments by entity
   *
   * @param entityType - Entity type (e.g., 'story', 'call_report')
   * @param entityId - Entity ID
   * @param options - Query options
   * @returns Array of attachments
   */
  async findByEntity(entityType: string, entityId: string, options?: QueryOptions): Promise<Attachment[]> {
    try {
      logger.info(`Finding attachments for entity: ${entityType}/${entityId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          entity_type: entityType,
          entity_id: entityId,
        },
        order: options?.order || { column: 'uploaded_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find attachments by entity: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find attachments by entity with uploader details
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param options - Query options
   * @returns Array of attachments with uploader details
   */
  async findByEntityWithUploader(
    entityType: string,
    entityId: string,
    options?: QueryOptions
  ): Promise<AttachmentWithUploader[]> {
    try {
      logger.info(`Finding attachments with uploader for entity: ${entityType}/${entityId}`);

      const client = await this.getClient();
      let query = client
        .from(this.tableName)
        .select(`
          *,
          uploader:users!uploaded_by(name, email)
        `);

      // Apply entity filters
      query = query.eq('entity_type', entityType).eq('entity_id', entityId);

      // Apply additional filters
      if (options?.filters) {
        query = this.buildQuery(query, options.filters);
      }

      // Apply ordering
      if (options?.order) {
        query = this.applyOrdering(query, options.order);
      } else {
        query = query.order('uploaded_at', { ascending: false });
      }

      // Apply pagination
      if (options?.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Found ${data?.length || 0} attachments with uploader`);
      return (data as unknown as AttachmentWithUploader[]) || [];
    } catch (error) {
      logger.error(`Failed to find attachments with uploader: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find attachments by entity type
   *
   * @param entityType - Entity type
   * @param options - Query options
   * @returns Array of attachments
   */
  async findByEntityType(entityType: string, options?: QueryOptions): Promise<Attachment[]> {
    try {
      logger.info(`Finding attachments for entity type: ${entityType}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          entity_type: entityType,
        },
      });
    } catch (error) {
      logger.error(`Failed to find attachments by entity type: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find attachments by uploader
   *
   * @param userId - User ID who uploaded
   * @param options - Query options
   * @returns Array of attachments
   */
  async findByUploader(userId: string, options?: QueryOptions): Promise<Attachment[]> {
    try {
      logger.info(`Finding attachments uploaded by user: ${userId}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          uploaded_by: userId,
        },
        order: options?.order || { column: 'uploaded_at', ascending: false },
      });
    } catch (error) {
      logger.error(`Failed to find attachments by uploader: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find attachments by file type
   *
   * @param fileType - File MIME type
   * @param options - Query options
   * @returns Array of attachments
   */
  async findByFileType(fileType: string, options?: QueryOptions): Promise<Attachment[]> {
    try {
      logger.info(`Finding attachments of type: ${fileType}`);

      return await this.findAll({
        ...options,
        filters: {
          ...options?.filters,
          file_type: fileType,
        },
      });
    } catch (error) {
      logger.error(`Failed to find attachments by file type: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Count attachments for an entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Attachment count
   */
  async countByEntity(entityType: string, entityId: string): Promise<number> {
    try {
      logger.info(`Counting attachments for entity: ${entityType}/${entityId}`);

      return await this.count({
        entity_type: entityType,
        entity_id: entityId,
      });
    } catch (error) {
      logger.error(`Failed to count attachments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get total storage size for an entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Total size in bytes
   */
  async getTotalSizeByEntity(entityType: string, entityId: string): Promise<number> {
    try {
      logger.info(`Calculating total storage size for entity: ${entityType}/${entityId}`);

      const attachments = await this.findByEntity(entityType, entityId);

      const totalSize = attachments.reduce((sum, attachment) => {
        return sum + (attachment.file_size || 0);
      }, 0);

      logger.info(`Total storage size: ${totalSize} bytes`);
      return totalSize;
    } catch (error) {
      logger.error(`Failed to get total size: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Update attachment metadata
   *
   * @param attachmentId - Attachment ID
   * @param data - Update data
   * @returns Updated attachment
   */
  async updateAttachment(
    attachmentId: string,
    data: Partial<Pick<Attachment, 'file_name' | 'file_size' | 'file_type'>>
  ): Promise<Attachment> {
    try {
      logger.info(`Updating attachment: ${attachmentId}`);

      return await this.update(attachmentId, data as Partial<Attachment>);
    } catch (error) {
      logger.error(`Failed to update attachment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete attachment record
   * Note: This only deletes the database record. File deletion should be handled separately.
   *
   * @param attachmentId - Attachment ID
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    try {
      logger.info(`Deleting attachment record: ${attachmentId}`);
      await this.delete(attachmentId);
      logger.info(`Attachment record deleted: ${attachmentId}`);
    } catch (error) {
      logger.error(`Failed to delete attachment record: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete all attachments for an entity
   * Note: This only deletes database records. File deletion should be handled separately.
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Number of attachments deleted
   */
  async deleteByEntity(entityType: string, entityId: string): Promise<number> {
    try {
      logger.info(`Deleting all attachments for entity: ${entityType}/${entityId}`);

      const count = await this.deleteMany({
        entity_type: entityType,
        entity_id: entityId,
      });

      logger.info(`Deleted ${count} attachment records`);
      return count;
    } catch (error) {
      logger.error(`Failed to delete attachments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Search attachments with complex filters
   *
   * @param filters - Search filters
   * @param options - Query options
   * @returns Array of matching attachments
   */
  async searchWithFilters(filters: AttachmentSearchFilters, options?: QueryOptions): Promise<Attachment[]> {
    try {
      logger.info(`Searching attachments with filters`);

      const queryFilters: any = { ...options?.filters };

      if (filters.entity_type) {
        queryFilters.entity_type = filters.entity_type;
      }

      if (filters.entity_id) {
        queryFilters.entity_id = filters.entity_id;
      }

      if (filters.uploaded_by) {
        queryFilters.uploaded_by = filters.uploaded_by;
      }

      if (filters.file_type) {
        queryFilters.file_type = filters.file_type;
      }

      return await this.findAll({
        ...options,
        filters: queryFilters,
      });
    } catch (error) {
      logger.error(`Failed to search attachments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get attachment statistics
   *
   * @returns Statistics object
   */
  async getStatistics(): Promise<AttachmentStatistics> {
    try {
      logger.info(`Calculating attachment statistics`);

      const client = await this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select('entity_type, file_type, file_size, uploaded_by');

      if (error) this.handleError(error);

      const stats: AttachmentStatistics = {
        total: data?.length || 0,
        total_size: 0,
        by_entity_type: {},
        by_file_type: {},
        by_user: {},
        average_file_size: 0,
      };

      if (!data || data.length === 0) {
        return stats;
      }

      for (const row of data) {
        // Count by entity type
        if (row.entity_type) {
          stats.by_entity_type[row.entity_type] = (stats.by_entity_type[row.entity_type] || 0) + 1;
        }

        // Count by file type
        if (row.file_type) {
          stats.by_file_type[row.file_type] = (stats.by_file_type[row.file_type] || 0) + 1;
        }

        // Count by user
        if (row.uploaded_by) {
          stats.by_user[row.uploaded_by] = (stats.by_user[row.uploaded_by] || 0) + 1;
        }

        // Sum file sizes
        stats.total_size += row.file_size || 0;
      }

      stats.average_file_size = Number((stats.total_size / data.length).toFixed(2));

      logger.info(`Statistics calculated`);
      return stats;
    } catch (error) {
      logger.error(`Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get large attachments (above size threshold)
   *
   * @param sizeThreshold - Size threshold in bytes
   * @param options - Query options
   * @returns Array of large attachments
   */
  async findLargeAttachments(sizeThreshold: number, options?: QueryOptions): Promise<Attachment[]> {
    try {
      logger.info(`Finding attachments larger than ${sizeThreshold} bytes`);

      const client = await this.getClient();
      let query = client.from(this.tableName).select(options?.select || '*');

      // Filter by size
      query = query.gt('file_size', sizeThreshold);

      // Apply additional filters
      if (options?.filters) {
        query = this.buildQuery(query, options.filters);
      }

      // Apply ordering
      if (options?.order) {
        query = this.applyOrdering(query, options.order);
      } else {
        query = query.order('file_size', { ascending: false });
      }

      // Apply pagination
      if (options?.pagination) {
        query = this.applyPagination(query, options.pagination);
      }

      const { data, error } = await query;

      if (error) this.handleError(error);

      logger.info(`Found ${data?.length || 0} large attachments`);
      return (data as unknown as Attachment[]) || [];
    } catch (error) {
      logger.error(`Failed to find large attachments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get attachment by file path
   * Useful for checking if a file already exists
   *
   * @param filePath - File path in storage
   * @returns Attachment or null
   */
  async findByFilePath(filePath: string): Promise<Attachment | null> {
    try {
      logger.info(`Finding attachment by file path: ${filePath}`);

      return await this.findOne({ file_path: filePath });
    } catch (error) {
      logger.error(`Failed to find attachment by file path: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Helper function to create an AttachmentRepository instance
 *
 * @param context - Repository context
 * @returns AttachmentRepository instance
 */
export function createAttachmentRepository(context: RepositoryContextType = 'server'): AttachmentRepository {
  return new AttachmentRepository(context);
}
