export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedEpisodicEvaluations } from "@/lib/episodic-evaluations/scoped";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

/**
 * GET /api/episodic-evaluations/project/[callReportId]/versions
 * Every version of a project's episodes in evaluation order — EP1 original, EP1 Rev 1, Rev 2…,
 * then EP2 — each marked evaluated or not for this viewer (same rules as the Original/Rev rows).
 * Drives the "Evaluate next" button on the episode evaluation pages.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ callReportId: string }> }
) {
  try {
    const { callReportId } = await params;
    if (!idParamSchema.safeParse({ id: callReportId }).success) {
      return NextResponse.json({ error: "Invalid project ID format" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    const adminClient = createAdminClient();
    const { data: userData } = await adminClient
      .from("users")
      .select("role, team_id")
      .eq("id", user.id)
      .single();

    if (!userData || !["evaluator", "programmer", "content_manager", "admin", "management", "executive", "gcm"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The viewer's own client: only episodes and revisions they can see
    const { data: episodes, error: epError } = await supabase
      .from("episodes")
      .select("id, episode_number")
      .eq("call_report_id", callReportId)
      .eq("is_current", true)
      .is("archived_at", null)
      .order("episode_number", { ascending: true });

    if (epError) {
      logger.error("Error fetching project episodes", { error: epError, callReportId });
      return NextResponse.json({ error: "Failed to fetch episodes" }, { status: 500 });
    }

    const episodeIds = (episodes || []).map((e: any) => e.id);
    const [{ data: revisions }, { evaluations, error: evalError }] = await Promise.all([
      episodeIds.length > 0
        ? supabase
            .from("episode_revisions")
            .select("id, episode_id, revision_number")
            .in("episode_id", episodeIds)
            .order("revision_number", { ascending: true })
        : Promise.resolve({ data: [] as any[] }),
      getScopedEpisodicEvaluations(supabase, adminClient, user.id, userData, episodeIds),
    ]);

    if (evalError) {
      logger.error("Error fetching project evaluations", { error: evalError, callReportId });
      return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
    }

    const done = new Set(evaluations.map((ev) => `${ev.episode_id}:${ev.revision_id ?? ""}`));
    const versions = (episodes || []).flatMap((ep: any) => [
      { episode_id: ep.id, episode_number: ep.episode_number, revision_id: null, revision_number: null },
      ...(revisions || [])
        .filter((r: any) => r.episode_id === ep.id)
        .map((r: any) => ({ episode_id: ep.id, episode_number: ep.episode_number, revision_id: r.id, revision_number: r.revision_number })),
    ]).map((v) => ({ ...v, evaluated: done.has(`${v.episode_id}:${v.revision_id ?? ""}`) }));

    return NextResponse.json({ versions }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    logger.error(`Unexpected error in project versions: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
