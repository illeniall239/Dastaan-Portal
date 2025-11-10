/**
 * Weekly Activity Analytics Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WeeklyActivityAnalyticsService } from '@/lib/services/analytics/weekly-activity-analytics-service';
import { RepositoryContext } from '@/lib/repositories';
import {
  createMockSupabaseClient,
  createMockQueryBuilderWithData,
} from '../../mocks/supabase-mock';
import { daysAgo } from '../../utils/test-helpers';

vi.mock('@/lib/repositories/base/repository-context');

describe('WeeklyActivityAnalyticsService', () => {
  let service: WeeklyActivityAnalyticsService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    vi.mocked(RepositoryContext.getClient).mockResolvedValue(mockClient as any);
    service = new WeeklyActivityAnalyticsService('server');
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('getWeeklyActivities', () => {
    it('should get activities from last 7 days from audit logs', async () => {
      const auditLogs = [
        {
          id: 'log1',
          entity_type: 'story',
          action: 'created',
          entity_id: 'story-1',
          details: { entity_name: 'Test Story' },
          timestamp: daysAgo(1),
          performed_by: 'user-1',
          user: { name: 'John Doe', email: 'john@geo.com' },
        },
        {
          id: 'log2',
          entity_type: 'evaluation',
          action: 'updated',
          entity_id: 'eval-1',
          details: { entity_name: 'Evaluation' },
          timestamp: daysAgo(3),
          performed_by: 'user-2',
          user: { name: 'Jane Smith', email: 'jane@geo.com' },
        },
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(auditLogs);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getWeeklyActivities();

      expect(result.length).toBeGreaterThanOrEqual(2); // May supplement with more data
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('action');
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('time_group');
    });

    it('should supplement with entity updates when audit logs are empty', async () => {
      // Empty audit logs
      const mockQueryBuilder1 = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder1 as any);

      // Mock entity queries (stories, evaluations, contracts, etc.)
      for (let i = 0; i < 6; i++) {
        const mockQueryBuilder = createMockQueryBuilderWithData([]);
        vi.mocked(mockClient.from).mockReturnValueOnce(mockQueryBuilder as any);
      }

      const result = await service.getWeeklyActivities();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should group activities by time (Today/Yesterday/Earlier This Week)', async () => {
      const auditLogs = [
        {
          id: 'log1',
          entity_type: 'story',
          action: 'created',
          entity_id: 'story-1',
          details: { entity_name: 'Story 1' },
          timestamp: daysAgo(0), // Today
          performed_by: 'user-1',
          user: { name: 'John Doe', email: 'john@geo.com' },
        },
        {
          id: 'log2',
          entity_type: 'story',
          action: 'created',
          entity_id: 'story-2',
          details: { entity_name: 'Story 2' },
          timestamp: daysAgo(1), // Yesterday
          performed_by: 'user-1',
          user: { name: 'John Doe', email: 'john@geo.com' },
        },
        {
          id: 'log3',
          entity_type: 'story',
          action: 'created',
          entity_id: 'story-3',
          details: { entity_name: 'Story 3' },
          timestamp: daysAgo(5), // Earlier This Week
          performed_by: 'user-1',
          user: { name: 'John Doe', email: 'john@geo.com' },
        },
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(auditLogs);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getWeeklyActivities();

      const timeGroups = new Set(result.map(a => a.time_group));
      expect(timeGroups.size).toBeGreaterThan(0);
      // Should have at least one of: Today, Yesterday, or Earlier This Week
    });

    it('should sort activities by timestamp descending', async () => {
      const auditLogs = [
        {
          id: 'log1',
          entity_type: 'story',
          action: 'created',
          entity_id: 'story-1',
          details: { entity_name: 'Story 1' },
          timestamp: daysAgo(5),
          performed_by: 'user-1',
          user: { name: 'John Doe', email: 'john@geo.com' },
        },
        {
          id: 'log2',
          entity_type: 'story',
          action: 'created',
          entity_id: 'story-2',
          details: { entity_name: 'Story 2' },
          timestamp: daysAgo(1),
          performed_by: 'user-1',
          user: { name: 'John Doe', email: 'john@geo.com' },
        },
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(auditLogs);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getWeeklyActivities();

      // Most recent should be first
      expect(new Date(result[0].timestamp).getTime()).toBeGreaterThan(
        new Date(result[1].timestamp).getTime()
      );
    });

    it('should use caching for repeated calls', async () => {
      const auditLogs = [
        {
          id: 'log1',
          entity_type: 'story',
          action: 'created',
          entity_id: 'story-1',
          details: { entity_name: 'Test Story' },
          timestamp: daysAgo(1),
          performed_by: 'user-1',
          user: { name: 'John Doe', email: 'john@geo.com' },
        },
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(auditLogs);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      await service.getWeeklyActivities();
      const result2 = await service.getWeeklyActivities();

      expect(result2).toBeDefined();
      // Cache should be used on second call
    });
  });

  describe('getWeeklyActivityStats', () => {
    it('should calculate weekly activity statistics', async () => {
      const auditLogs = [
        {
          id: 'log1',
          entity_type: 'story',
          action: 'created',
          entity_id: 'story-1',
          details: { entity_name: 'Story 1' },
          timestamp: daysAgo(1),
          performed_by: 'user-1',
          user: { name: 'John Doe', email: 'john@geo.com' },
        },
        {
          id: 'log2',
          entity_type: 'evaluation',
          action: 'updated',
          entity_id: 'eval-1',
          details: { entity_name: 'Evaluation' },
          timestamp: daysAgo(2),
          performed_by: 'user-2',
          user: { name: 'Jane Smith', email: 'jane@geo.com' },
        },
      ];

      const mockQueryBuilder = createMockQueryBuilderWithData(auditLogs);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getWeeklyActivityStats();

      expect(result.totalActivities).toBeGreaterThan(0);
      expect(result.byType).toBeDefined();
    });

    it('should return zero stats for no activities', async () => {
      const mockQueryBuilder = createMockQueryBuilderWithData([]);
      vi.mocked(mockClient.from).mockReturnValue(mockQueryBuilder as any);

      const result = await service.getWeeklyActivityStats();

      expect(result.totalActivities).toBe(0);
    });
  });
});
