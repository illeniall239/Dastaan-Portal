import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSegregatedEpisodicEvaluations } from "@/lib/evaluations/server";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';
import { requireApiAuth } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(["management", "management_viewer"]);
    if (!auth.success) return auth.response;
    const user = auth.user;

    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }
    const adminClient = createAdminClient();

    const { searchParams } = request.nextUrl;
    const filterCallReportId = searchParams.get("call_report_id") || null;

    // Get all episodes that have evaluations
    // We query the episodic_evaluations_with_type view to get unique episode_ids
    // If filtering by call_report_id, pre-fetch those episode IDs first
    let preFilteredEpisodeIds: string[] | null = null;
    if (filterCallReportId) {
      const { data: epRows } = await adminClient
        .from("episodes")
        .select("id")
        .eq("call_report_id", filterCallReportId);
      preFilteredEpisodeIds = (epRows || []).map(r => r.id);
      if (preFilteredEpisodeIds.length === 0) {
        return NextResponse.json({ success: true, episodes: [] });
      }
    }

    let idsQuery = adminClient
      .from("episodic_evaluations_with_type")
      .select("episode_id")
      .order("created_at", { ascending: false });

    if (preFilteredEpisodeIds) {
      idsQuery = idsQuery.in("episode_id", preFilteredEpisodeIds);
    }

    const { data: episodeIds, error: idsError } = await idsQuery;

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
        attachment_name,
        created_at,
        updated_at,
        call_reports(
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

    // Identify Content Development team members (Humera's management-type team only)
    const contentDevUserIds = new Set<string>();
    const { data: mgmtTeams } = await adminClient
      .from("teams")
      .select("id, team_head:users!team_head_id(email)")
      .eq("team_type", "management");

    const contentDevTeamIds = (mgmtTeams || [])
      .filter((t: any) => t.team_head?.email === "humera.safder@geo.tv")
      .map((t: any) => t.id);

    if (contentDevTeamIds.length > 0) {
      const { data: cdUsers } = await adminClient
        .from("users")
        .select("id")
        .in("team_id", contentDevTeamIds);
      for (const u of cdUsers || []) contentDevUserIds.add(u.id);
    }

    // Map episodes with their evaluations (no async/await needed now!)
    interface EpisodeData {
      id: string;
      episode_number: number;
      title: string | null;
      call_report_id: string | null;
      attachment_name: string | null;
      created_at: string;
      updated_at: string;
      call_reports: { working_title: string } | { working_title: string }[] | null;
    }

    const episodesWithEvaluations = (episodesData || []).map((episode: EpisodeData) => {
      const evaluations = evaluationsByEpisode.get(episode.id) || [];

      // Segregate evaluations by type, reclassifying management-type team members
      const evaluatorEvaluations: any[] = [];
      const managementEvaluations: any[] = [];
      const programmerEvaluations: any[] = [];
      const contentTeamMap = new Map<string, any[]>();

      for (const e of evaluations) {
        if (contentDevUserIds.has(e.evaluator_id)) {
          const list = contentTeamMap.get("Content Development") || [];
          list.push(e);
          contentTeamMap.set("Content Development", list);
        } else if (e.evaluation_type === 'evaluator') {
          evaluatorEvaluations.push(e);
        } else if (e.evaluation_type === 'programmer') {
          programmerEvaluations.push(e);
        } else {
          managementEvaluations.push(e);
        }
      }

      const contentTeamEvaluations = Array.from(contentTeamMap.entries()).map(([teamName, evals]) => ({
        teamName,
        evaluations: evals,
        count: evals.length,
      }));

      const segregatedEvaluations = {
        evaluatorEvaluations,
        managementEvaluations,
        programmerEvaluations,
        contentTeamEvaluations,
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
        dramaTitle: (Array.isArray(episode.call_reports)
          ? episode.call_reports[0]?.working_title
          : (episode.call_reports as any)?.working_title) || "Unknown Drama",
        createdAt: episode.created_at,
        updatedAt: episode.updated_at,
        attachmentName: episode.attachment_name || null,
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
