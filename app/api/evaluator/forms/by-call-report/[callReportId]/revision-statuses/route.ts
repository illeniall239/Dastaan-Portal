export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

/**
 * GET /api/evaluator/forms/by-call-report/[callReportId]/revision-statuses
 * Returns evaluation status for the original submission and all revisions in one call.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  try {
    const { callReportId } = await params;

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    // The content team sees exactly what their content head sees: the head's evaluations
    let viewerId = user.id;
    let reader = supabase;
    const adminClient = createAdminClient();
    const { data: me } = await adminClient.from("users").select("role, team_id").eq("id", user.id).single();
    if (me && ["content_creator", "content_manager"].includes(me.role)) {
      const { data: team } = me.team_id
        ? await adminClient.from("teams").select("team_head_id").eq("id", me.team_id).single()
        : { data: null };
      if (!team?.team_head_id) {
        return NextResponse.json({ statuses: { original: { hasEvaluated: false }, revisions: {} } });
      }
      viewerId = team.team_head_id;
      reader = adminClient;
    }

    // Query all evaluations for this call report by the viewer (no revision filter)
    const { data: evaluations, error } = await reader
      .from("evaluator_forms")
      .select("id, revision_id, evaluator_id, average_score, decision")
      .eq("call_report_id", callReportId)
      .eq("evaluator_id", viewerId);

    if (error) {
      logger.error("Error fetching call report revision statuses", { error, callReportId });
      return NextResponse.json({ error: "Failed to fetch revision statuses" }, { status: 500 });
    }

    // Build status map
    const original: { hasEvaluated: boolean; averageScore?: number; decision?: string; evaluationId?: string } = { hasEvaluated: false };
    const revisions: Record<string, { hasEvaluated: boolean; averageScore?: number; decision?: string; evaluationId?: string }> = {};

    for (const ev of evaluations || []) {
      if (ev.revision_id === null) {
        original.hasEvaluated = true;
        original.averageScore = ev.average_score;
        original.decision = ev.decision;
        original.evaluationId = ev.id;
      } else {
        revisions[ev.revision_id] = {
          hasEvaluated: true,
          averageScore: ev.average_score,
          decision: ev.decision,
          evaluationId: ev.id,
        };
      }
    }

    return NextResponse.json({ statuses: { original, revisions } });

  } catch (error) {
    logger.error(`Unexpected error in call report revision-statuses: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
