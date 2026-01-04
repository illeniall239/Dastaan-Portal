import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSegregatedEpisodicEvaluations } from "@/lib/evaluations/server";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const adminClient = createAdminClient();

    // Get all episodes that have evaluations
    // We query the episodic_evaluations_with_type view to get unique episode_ids
    const { data: episodeIds, error: idsError } = await adminClient
      .from("episodic_evaluations_with_type")
      .select("episode_id")
      .order("created_at", { ascending: false });

    if (idsError) {
      throw new Error(`Failed to fetch episode IDs: ${idsError.message}`);
    }

    // Get unique episode IDs
    const uniqueEpisodeIds = [...new Set(episodeIds?.map(item => item.episode_id) || [])];

    if (uniqueEpisodeIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          episodes: [],
        },
        {
          headers: {
            'Cache-Control': createCacheControl(CACHE_DURATION.ANALYTICS),
          },
        }
      );
    }

    // Fetch episode details for these IDs
    const { data: episodesData, error: episodesError } = await adminClient
      .from("episodes")
      .select(`
        id,
        episode_number,
        title,
        call_report_id,
        created_at,
        updated_at,
        call_reports!inner(
          working_title
        )
      `)
      .in("id", uniqueEpisodeIds)
      .order("created_at", { ascending: false });

    if (episodesError) {
      throw new Error(`Failed to fetch episodes: ${episodesError.message}`);
    }

    // OPTIMIZATION: Fetch all evaluations in a single query instead of N queries
    const { data: allEvaluations, error: evaluationsError } = await adminClient
      .from("episodic_evaluations_with_type")
      .select("*")
      .in("episode_id", uniqueEpisodeIds)
      .order("created_at", { ascending: false });

    if (evaluationsError) {
      logger.error("Error fetching episodic evaluations:", { error: evaluationsError });
      // Continue with empty evaluations rather than failing completely
    }

    // Group evaluations by episode_id
    const evaluationsByEpisode = new Map();
    (allEvaluations || []).forEach(evaluation => {
      if (!evaluationsByEpisode.has(evaluation.episode_id)) {
        evaluationsByEpisode.set(evaluation.episode_id, []);
      }
      evaluationsByEpisode.get(evaluation.episode_id).push(evaluation);
    });

    // Map episodes with their evaluations (no async/await needed now!)
    interface EpisodeData {
      id: string;
      episode_number: number;
      title: string | null;
      call_report_id: string | null;
      created_at: string;
      updated_at: string;
      call_reports: Array<{
        working_title: string;
      }>;
    }

    const episodesWithEvaluations = (episodesData || []).map((episode: EpisodeData) => {
      const evaluations = evaluationsByEpisode.get(episode.id) || [];

      // Segregate evaluations by type
      const evaluatorEvaluations = evaluations.filter((e: any) => e.evaluation_type === 'evaluator');
      const managementEvaluations = evaluations.filter((e: any) => e.evaluation_type === 'management');
      const programmerEvaluations = evaluations.filter((e: any) => e.evaluation_type === 'programmer');

      const segregatedEvaluations = {
        evaluatorEvaluations,
        managementEvaluations,
        programmerEvaluations,
        total: evaluations.length,
        evaluatorCount: evaluatorEvaluations.length,
        managementCount: managementEvaluations.length,
        programmerCount: programmerEvaluations.length,
      };

      return {
        id: episode.id,
        episodeNumber: episode.episode_number,
        title: episode.title || `Episode ${episode.episode_number}`,
        callReportId: episode.call_report_id,
        dramaTitle: episode.call_reports?.[0]?.working_title || "Unknown Drama",
        createdAt: episode.created_at,
        updatedAt: episode.updated_at,
        evaluationCount: segregatedEvaluations.total,
        segregatedEvaluations,
      };
    });

    return NextResponse.json(
      {
        success: true,
        episodes: episodesWithEvaluations,
      },
      {
        headers: {
          'Cache-Control': createCacheControl(CACHE_DURATION.ANALYTICS),
        },
      }
    );
  } catch (error) {
    logger.error(`Error fetching episodes with evaluations: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Failed to fetch episodes with evaluations" },
      { status: 500 }
    );
  }
}
