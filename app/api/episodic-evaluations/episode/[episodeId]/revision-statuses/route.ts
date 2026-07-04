export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { episodeIdParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

/**
 * GET /api/episodic-evaluations/episode/[episodeId]/revision-statuses
 * Returns evaluation status for the original submission and all revisions in one call.
 * Replicates the same scoping logic as the single-evaluation GET endpoint.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { episodeId } = await params;

    const paramValidation = episodeIdParamSchema.safeParse({ episodeId });
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: "Invalid episode ID format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    const adminClient = createAdminClient();

    // Get user role
    const { data: userData, error: userQueryError } = await adminClient
      .from("users")
      .select("role, team_id")
      .eq("id", user.id)
      .single();

    if (userQueryError || !userData) {
      return NextResponse.json({ error: "Failed to verify user permissions" }, { status: 500 });
    }

    if (!["evaluator", "programmer", "content_manager", "admin", "management", "executive", "gcm"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine scoping: management team, programmer (excluding content dev), or individual
    let isManagementTeam = false;
    let teamMemberIds: string[] = [];
    let contentDevUserIds: string[] = [];

    if (["programmer", "management"].includes(userData.role) && userData.team_id) {
      const { data: team } = await adminClient
        .from("teams")
        .select("team_type")
        .eq("id", userData.team_id)
        .single();

      if (team?.team_type === "management") {
        isManagementTeam = true;
        const { data: members } = await adminClient
          .from("users")
          .select("id")
          .eq("team_id", userData.team_id);
        teamMemberIds = (members || []).map((m: any) => m.id);
      }
    }

    if (!isManagementTeam && userData.role === "programmer") {
      const { data: mgmtTeams } = await adminClient.from("teams").select("id").eq("team_type", "management");
      if (mgmtTeams && mgmtTeams.length > 0) {
        const { data: cdUsers } = await adminClient.from("users").select("id").in("team_id", mgmtTeams.map((t: any) => t.id));
        contentDevUserIds = (cdUsers || []).map((u: any) => u.id);
      }
    }

    // Query all evaluations for this episode (no revision filter) with scoping
    let query = supabase
      .from("episodic_evaluations")
      .select("id, revision_id, evaluator_id, evaluator:users!evaluator_id(name, role)")
      .eq("episode_id", episodeId)
      .is("cross_team_share_id", null);

    if (isManagementTeam) {
      query = query.in("evaluator_id", teamMemberIds);
    } else if (userData.role === "programmer") {
      if (contentDevUserIds.length > 0) {
        query = query.not("evaluator_id", "in", `(${contentDevUserIds.join(",")})`);
      }
    } else {
      query = query.eq("evaluator_id", user.id);
    }

    const { data: evaluations, error } = await query;

    if (error) {
      logger.error("Error fetching revision statuses", { error, episodeId });
      return NextResponse.json({ error: "Failed to fetch revision statuses" }, { status: 500 });
    }

    // Build status map
    const original: { hasEvaluated: boolean; evaluatorName?: string } = { hasEvaluated: false };
    const revisions: Record<string, { hasEvaluated: boolean; evaluatorName?: string }> = {};

    for (const ev of evaluations || []) {
      const evaluatorName = (ev.evaluator as any)?.name || undefined;

      // For programmers, skip content dev evaluations
      if (userData.role === "programmer" && !isManagementTeam) {
        if ((ev.evaluator as any)?.role !== "programmer" || contentDevUserIds.includes(ev.evaluator_id)) {
          continue;
        }
      }

      if (ev.revision_id === null) {
        original.hasEvaluated = true;
        if (evaluatorName) original.evaluatorName = evaluatorName;
      } else {
        revisions[ev.revision_id] = { hasEvaluated: true, evaluatorName };
      }
    }

    return NextResponse.json({ statuses: { original, revisions } });

  } catch (error) {
    logger.error(`Unexpected error in revision-statuses: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
