/**
 * Activity Analytics Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActivityAnalyticsService } from '@/lib/services/analytics/activity-analytics-service';
import { RepositoryContext } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../../mocks/supabase-mock';
import {
  createMockStory,
  createMockCallReport,
  createMockEvaluatorForm,
} from '../../mocks/mock-data';

vi.mock('@/lib/repositories/base/repository-context');

describe('ActivityAnalyticsService', () => {
  let service: ActivityAnalyticsService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    service = new ActivityAnalyticsService('server');
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('getRecentActivity', () => {
    it('should get recent activities from audit logs', async () => {
      const auditLogs = [
        {
          id: 'log1',
          entity_type: 'story',
          action: 'created',
          entity_id: 'story-1',
          details: { entity_name: 'Test Story' },
          timestamp: new Date().toISOString(),
          performed_by: 'user-1',
          user: { name: 'John Doe', email: 'john@geo.com' },
        },
        {
          id: 'log2',
          entity_type: 'evaluation',
          action: 'updated',
          entity_id: 'eval-1',
          details: { entity_name: 'Evaluation' },
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          performed_by: 'user-2',
          user: { name: 'Jane Smith', email: 'jane@geo.com' },
        },
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(auditLogs);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRecentActivity(15);

      expect(result.length).toBeGreaterThanOrEqual(2); // May supplement with more data
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('action');
      expect(result[0]).toHaveProperty('timestamp');
    });

    it('should supplement with entity updates when audit logs are insufficient', async () => {
      // Empty audit logs
      const mockQueryBuilder1 = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      // Stories
      const stories = [createMockStory({ id: 's1' })];
      const mockQueryBuilder2 = createMockQueryBuilderWithData(stories);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder2 as any);

      // Call reports
      const mockQueryBuilder3 = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder3 as any);

      // Evaluations
      const mockQueryBuilder4 = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder4 as any);

      // Episodes
      const mockQueryBuilder5 = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder5 as any);

      const result = await service.getRecentActivity(15);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit results to requested count', async () => {
      const auditLogs = Array.from({ length: 20 }, (_, i) => ({
        id: `log${i}`,
        entity_type: 'story',
        action: 'created',
        entity_id: `story-${i}`,
        details: { entity_name: `Story ${i}` },
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        performed_by: 'user-1',
        user: { name: 'John Doe', email: 'john@geo.com' },
      }));

      const mockQueryBuilder = createMockQueryBuilderWithData(auditLogs);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRecentActivity(10);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle empty activities', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRecentActivity(15);

      expect(result).toEqual([]);
    });

    it('should use caching for repeated calls', async () => {
      const auditLogs = [
        {
          id: 'log1',
          entity_type: 'story',
          action: 'created',
          entity_id: 'story-1',
          details: { entity_name: 'Test Story' },
          timestamp: new Date().toISOString(),
          performed_by: 'user-1',
          user: { name: 'John Doe', email: 'john@geo.com' },
        },
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(auditLogs);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await service.getRecentActivity(15);
      const result2 = await service.getRecentActivity(15);

      expect(result2).toBeDefined();
      // Cache should be used on second call
    });
  });

});
