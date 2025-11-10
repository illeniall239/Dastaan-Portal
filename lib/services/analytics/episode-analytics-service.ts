/**
 * Episode Analytics Service
 *
 * Handles analytics for episodes and episodic evaluations.
 * Tracks production metrics, quality distribution, and evaluation trends.
 *
 * Usage:
 * ```typescript
 * const service = new EpisodeAnalyticsService('server');
 * const overview = await service.getEpisodeOverview();
 * const trends = await service.getEpisodeProductionTrends(90);
 * ```
 */

import {
  EpisodeRepository,
  EpisodicEvaluationRepository,
  type RepositoryContextType,
} from '@/lib/repositories';
import { BaseAnalyticsService, TimeUtils, StatsUtils } from './base-analytics-service';
import { logger } from '@/lib/logger';

/**
 * Episode overview statistics
 */
export interface EpisodeOverview {
  totalEpisodes: number;
  episodesBySource: {
    callReports: number;
    stories: number;
  };
  pendingEvaluation: number;
  evaluated: number;
  avgPages: number;
  avgScenes: number;
}

/**
 * Episodic evaluation overview statistics
 */
export interface EpisodicEvaluationOverview {
  totalEvaluations: number;
  avgOverallScore: number;
  completionRate: number;
  gradeDistribution: {
    [key: string]: number; // A+, A, B+, B, C
  };
  criteriaAverages: {
    conflict: number;
    characterization: number;
    progression: number;
    freezes: number;
    whatsNext: number;
  };
}

/**
 * Episode production trend data point
 */
export interface EpisodeProductionTrend {
  date: string;
  callReportEpisodes: number;
  storyEpisodes: number;
  total: number;
}

/**
 * Quality distribution metrics
 */
export interface QualityDistribution {
  pagesDistribution: {
    belowStandard: number; // <40
    nearStandard: number; // 40-44
    standard: number; // 45-50
    aboveStandard: number; // >50
  };
  scenesDistribution: {
    belowStandard: number; // <20
    nearStandard: number; // 20-21
    standard: number; // 22-25
    aboveStandard: number; // >25
  };
}

/**
 * Quality standards (hardcoded as per business requirements)
 */
const QUALITY_STANDARDS = {
  pages: {
    belowStandard: 40,
    nearStandard: 45,
    standard: 50,
  },
  scenes: {
    belowStandard: 20,
    nearStandard: 22,
    standard: 25,
  },
};

/**
 * Episode analytics service
 * Provides comprehensive analytics for episodes and their evaluations
 */
export class EpisodeAnalyticsService extends BaseAnalyticsService {
  private episodeRepo: EpisodeRepository;
  private episodicEvalRepo: EpisodicEvaluationRepository;

  constructor(context: RepositoryContextType = 'server') {
    super();
    this.episodeRepo = new EpisodeRepository(context);
    this.episodicEvalRepo = new EpisodicEvaluationRepository(context);
  }

  /**
   * Get episode overview statistics
   * Includes totals, source breakdown, evaluation status, and averages
   *
   * @returns Episode overview statistics
   */
  async getEpisodeOverview(): Promise<EpisodeOverview> {
    try {
      logger.info('Getting episode overview');

      return await this.withCache(
        'analytics:episode-overview',
        async () => {
          // Get all episodes
          const episodes = await this.episodeRepo.findAll({
            select: 'id, call_report_id, story_id, no_of_pages, no_of_scenes',
          });

          // Get all evaluations to determine evaluated episodes
          const evaluations = await this.episodicEvalRepo.findAll({
            select: 'episode_id',
          });

          const totalEpisodes = episodes.length;
          const callReportEpisodes = episodes.filter((e: any) => e.call_report_id).length;
          const storyEpisodes = episodes.filter((e: any) => e.story_id).length;

          // Create set of evaluated episode IDs
          const evaluatedSet = new Set(evaluations.map((e: any) => e.episode_id));

          // Calculate averages
          const avgPages =
            episodes.length > 0
              ? episodes.reduce((sum: number, e: any) => sum + (e.no_of_pages || 0), 0) /
                episodes.length
              : 0;

          const avgScenes =
            episodes.length > 0
              ? episodes.reduce((sum: number, e: any) => sum + (e.no_of_scenes || 0), 0) /
                episodes.length
              : 0;

          const overview: EpisodeOverview = {
            totalEpisodes,
            episodesBySource: {
              callReports: callReportEpisodes,
              stories: storyEpisodes,
            },
            pendingEvaluation: totalEpisodes - evaluatedSet.size,
            evaluated: evaluatedSet.size,
            avgPages: Math.round(avgPages * 10) / 10,
            avgScenes: Math.round(avgScenes * 10) / 10,
          };

          logger.info(
            `Episode overview: ${overview.totalEpisodes} total, ${overview.evaluated} evaluated, ${overview.avgPages} avg pages`
          );

          return overview;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get episode overview');
    }
  }

  /**
   * Get episodic evaluation overview statistics
   * Includes evaluation counts, scores, completion rate, and grade distribution
   *
   * @returns Episodic evaluation overview statistics
   */
  async getEpisodicEvaluationOverview(): Promise<EpisodicEvaluationOverview> {
    try {
      logger.info('Getting episodic evaluation overview');

      return await this.withCache(
        'analytics:episodic-evaluation-overview',
        async () => {
          // Get all evaluations with scoring fields
          const evaluations = await this.episodicEvalRepo.findAll({
            select: `
              overall_average,
              overall_grade,
              conflict_of_content_score,
              characterization_score,
              story_progression_score,
              freezes_score,
              whats_next_element_score
            `,
          });

          // Get total episodes for completion rate
          const episodes = await this.episodeRepo.findAll({
            select: 'id',
          });

          const totalEvaluations = evaluations.length;
          const totalEpisodes = episodes.length;

          // Calculate average overall score
          const avgOverallScore =
            evaluations.length > 0
              ? evaluations.reduce((sum: number, e: any) => sum + e.overall_average, 0) /
                evaluations.length
              : 0;

          // Calculate grade distribution
          const gradeDistribution: { [key: string]: number } = {
            'A+': 0,
            A: 0,
            'B+': 0,
            B: 0,
            C: 0,
          };

          evaluations.forEach((e: any) => {
            if (e.overall_grade in gradeDistribution) {
              gradeDistribution[e.overall_grade]++;
            }
          });

          // Calculate criteria averages
          const criteriaAverages = {
            conflict: 0,
            characterization: 0,
            progression: 0,
            freezes: 0,
            whatsNext: 0,
          };

          if (evaluations.length > 0) {
            criteriaAverages.conflict =
              evaluations.reduce((sum: number, e: any) => sum + e.conflict_of_content_score, 0) /
              evaluations.length;
            criteriaAverages.characterization =
              evaluations.reduce((sum: number, e: any) => sum + e.characterization_score, 0) /
              evaluations.length;
            criteriaAverages.progression =
              evaluations.reduce((sum: number, e: any) => sum + e.story_progression_score, 0) /
              evaluations.length;
            criteriaAverages.freezes =
              evaluations.reduce((sum: number, e: any) => sum + e.freezes_score, 0) /
              evaluations.length;
            criteriaAverages.whatsNext =
              evaluations.reduce((sum: number, e: any) => sum + e.whats_next_element_score, 0) /
              evaluations.length;
          }

          const overview: EpisodicEvaluationOverview = {
            totalEvaluations,
            avgOverallScore: Math.round(avgOverallScore * 10) / 10,
            completionRate:
              totalEpisodes > 0 ? Math.round((totalEvaluations / totalEpisodes) * 100) : 0,
            gradeDistribution,
            criteriaAverages: {
              conflict: Math.round(criteriaAverages.conflict * 10) / 10,
              characterization: Math.round(criteriaAverages.characterization * 10) / 10,
              progression: Math.round(criteriaAverages.progression * 10) / 10,
              freezes: Math.round(criteriaAverages.freezes * 10) / 10,
              whatsNext: Math.round(criteriaAverages.whatsNext * 10) / 10,
            },
          };

          logger.info(
            `Episodic evaluation overview: ${overview.totalEvaluations} evaluations, ${overview.avgOverallScore} avg score, ${overview.completionRate}% completion`
          );

          return overview;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get episodic evaluation overview');
    }
  }

  /**
   * Get episode production trends
   * Groups episodes by week and tracks production by source
   *
   * @param days - Number of days to look back (default: 90)
   * @returns Array of weekly production data points
   */
  async getEpisodeProductionTrends(days: number = 90): Promise<EpisodeProductionTrend[]> {
    try {
      logger.info(`Getting episode production trends (${days} days)`);

      return await this.withCache(
        `analytics:episode-production-trends:${days}`,
        async () => {
          const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

          // Get episodes created within date range
          const episodes = await this.episodeRepo.findAll({
            select: 'created_at, call_report_id, story_id',
            filters: {
              created_at: { gte: fromDate.toISOString() },
            },
            order: { column: 'created_at', ascending: true },
          });

          if (episodes.length === 0) {
            logger.info('No episodes found in date range');
            return [];
          }

          // Group episodes by week (Monday start)
          const weeklyData: { [key: string]: { callReport: number; story: number } } = {};

          episodes.forEach((episode: any) => {
            const date = new Date(episode.created_at);
            // Get Monday of the week
            const monday = new Date(date);
            const day = date.getDay();
            const diff = day === 0 ? -6 : 1 - day; // Adjust for Sunday (0)
            monday.setDate(date.getDate() + diff);
            const weekKey = monday.toISOString().split('T')[0];

            if (!weeklyData[weekKey]) {
              weeklyData[weekKey] = { callReport: 0, story: 0 };
            }

            if (episode.call_report_id) {
              weeklyData[weekKey].callReport++;
            } else if (episode.story_id) {
              weeklyData[weekKey].story++;
            }
          });

          // Convert to array and sort by date
          const trends: EpisodeProductionTrend[] = Object.keys(weeklyData)
            .sort()
            .map((date) => ({
              date,
              callReportEpisodes: weeklyData[date].callReport,
              storyEpisodes: weeklyData[date].story,
              total: weeklyData[date].callReport + weeklyData[date].story,
            }));

          logger.info(`Found ${trends.length} weeks of production data`);
          return trends;
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, `get episode production trends (${days} days)`);
    }
  }

  /**
   * Get quality distribution for pages and scenes
   * Categorizes episodes based on quality standards
   *
   * @returns Quality distribution statistics
   */
  async getQualityDistribution(): Promise<QualityDistribution> {
    try {
      logger.info('Getting quality distribution');

      return await this.withCache(
        'analytics:quality-distribution',
        async () => {
          const episodes = await this.episodeRepo.findAll({
            select: 'no_of_pages, no_of_scenes',
          });

          if (episodes.length === 0) {
            logger.info('No episodes found for quality distribution');
            return {
              pagesDistribution: {
                belowStandard: 0,
                nearStandard: 0,
                standard: 0,
                aboveStandard: 0,
              },
              scenesDistribution: {
                belowStandard: 0,
                nearStandard: 0,
                standard: 0,
                aboveStandard: 0,
              },
            };
          }

          // Calculate pages distribution
          const pagesDistribution = {
            belowStandard: episodes.filter(
              (e: any) => (e.no_of_pages || 0) < QUALITY_STANDARDS.pages.belowStandard
            ).length,
            nearStandard: episodes.filter(
              (e: any) =>
                (e.no_of_pages || 0) >= QUALITY_STANDARDS.pages.belowStandard &&
                (e.no_of_pages || 0) < QUALITY_STANDARDS.pages.nearStandard
            ).length,
            standard: episodes.filter(
              (e: any) =>
                (e.no_of_pages || 0) >= QUALITY_STANDARDS.pages.nearStandard &&
                (e.no_of_pages || 0) <= QUALITY_STANDARDS.pages.standard
            ).length,
            aboveStandard: episodes.filter(
              (e: any) => (e.no_of_pages || 0) > QUALITY_STANDARDS.pages.standard
            ).length,
          };

          // Calculate scenes distribution
          const scenesDistribution = {
            belowStandard: episodes.filter(
              (e: any) => (e.no_of_scenes || 0) < QUALITY_STANDARDS.scenes.belowStandard
            ).length,
            nearStandard: episodes.filter(
              (e: any) =>
                (e.no_of_scenes || 0) >= QUALITY_STANDARDS.scenes.belowStandard &&
                (e.no_of_scenes || 0) < QUALITY_STANDARDS.scenes.nearStandard
            ).length,
            standard: episodes.filter(
              (e: any) =>
                (e.no_of_scenes || 0) >= QUALITY_STANDARDS.scenes.nearStandard &&
                (e.no_of_scenes || 0) <= QUALITY_STANDARDS.scenes.standard
            ).length,
            aboveStandard: episodes.filter(
              (e: any) => (e.no_of_scenes || 0) > QUALITY_STANDARDS.scenes.standard
            ).length,
          };

          logger.info(
            `Quality distribution: Pages (${pagesDistribution.standard} standard), Scenes (${scenesDistribution.standard} standard)`
          );

          return {
            pagesDistribution,
            scenesDistribution,
          };
        },
        300 // 5 minute cache
      );
    } catch (error) {
      this.handleError(error, 'get quality distribution');
    }
  }

  /**
   * Get episodes by quality standard
   *
   * @param metric - 'pages' or 'scenes'
   * @param category - 'belowStandard', 'nearStandard', 'standard', or 'aboveStandard'
   * @returns Array of episode IDs matching the criteria
   */
  async getEpisodesByQuality(
    metric: 'pages' | 'scenes',
    category: 'belowStandard' | 'nearStandard' | 'standard' | 'aboveStandard'
  ): Promise<string[]> {
    try {
      logger.info(`Getting episodes by quality: ${metric} - ${category}`);

      const episodes = await this.episodeRepo.findAll({
        select: 'id, no_of_pages, no_of_scenes',
      });

      const field = metric === 'pages' ? 'no_of_pages' : 'no_of_scenes';
      const standards = QUALITY_STANDARDS[metric];

      const filtered = episodes.filter((e: any) => {
        const value = e[field] || 0;
        switch (category) {
          case 'belowStandard':
            return value < standards.belowStandard;
          case 'nearStandard':
            return value >= standards.belowStandard && value < standards.nearStandard;
          case 'standard':
            return value >= standards.nearStandard && value <= standards.standard;
          case 'aboveStandard':
            return value > standards.standard;
          default:
            return false;
        }
      });

      return filtered.map((e: any) => e.id);
    } catch (error) {
      this.handleError(error, `get episodes by quality (${metric} - ${category})`);
    }
  }

  /**
   * Invalidate cache when episode data changes
   */
  async invalidateEpisodeCache(): Promise<void> {
    await this.invalidateCache('analytics:episode-overview');
    await this.invalidateCache('analytics:episodic-evaluation-overview');
    await this.invalidateCache('analytics:quality-distribution');
    // Note: Production trends with different day parameters would need separate tracking
    logger.info('Episode analytics cache invalidated');
  }
}

/**
 * Helper function to create an EpisodeAnalyticsService instance
 */
export function createEpisodeAnalyticsService(
  context: RepositoryContextType = 'server'
): EpisodeAnalyticsService {
  return new EpisodeAnalyticsService(context);
}
