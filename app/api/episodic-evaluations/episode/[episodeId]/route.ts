import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { episodeIdParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

/**
 * GET /api/episodic-evaluations/episode/[episodeId]
 * Get the current evaluator's evaluation for a specific episode
 * Used to check if evaluator has already evaluated this episode
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const { episodeId } = await params;

  // Validate UUID format
  const paramValidation = episodeIdParamSchema.safeParse({ episodeId });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid episode ID format", details: paramValidation.error.format() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["evaluator", "programmer", "content_manager", "admin", "management", "executive"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

    // Check if episode exists
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("id")
      .eq("id", episodeId)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: "Episode not found" },
        { status: 404 }
      );
    }

    // Get evaluation for this episode by current evaluator, scoped by revision and/or cross_team_share_id if provided
    const url = new URL(request.url);
    const revisionId = url.searchParams.get("revision_id");
    const crossTeamShareId = url.searchParams.get("cross_team_share_id");

    let evalQuery = supabase
      .from("episodic_evaluations")
      .select(`
        *,
        evaluator:users!evaluator_id(name, email),
        episode:episodes(
          *,
          call_report:call_reports(working_title, writer_name),
          story:stories(title, status)
        )
      `)
      .eq("episode_id", episodeId)
      .eq("evaluator_id", user.id);

    if (revisionId) {
      evalQuery = evalQuery.eq("revision_id", revisionId);
    } else {
      evalQuery = evalQuery.is("revision_id", null);
    }

    if (crossTeamShareId) {
      evalQuery = evalQuery.eq("cross_team_share_id", crossTeamShareId);
    } else {
      evalQuery = evalQuery.is("cross_team_share_id", null);
    }

    const { data: evaluation, error } = await evalQuery.maybeSingle();

    if (error) {
      logger.error(`Error fetching episodic evaluation: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluation", details: error.message },
        { status: 500 }
      );
    }

    // Return evaluation if found, or null if not found
    return NextResponse.json({
      evaluation: evaluation || null,
      hasEvaluated: !!evaluation,
    });

  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
