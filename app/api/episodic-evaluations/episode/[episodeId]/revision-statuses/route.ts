export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedEpisodicEvaluations } from "@/lib/episodic-evaluations/scoped";
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

    // Same team rules as "next episode" (lib/episodic-evaluations/scoped.ts)
    const { evaluations, error } = await getScopedEpisodicEvaluations(supabase, adminClient, user.id, userData, [episodeId]);

    if (error) {
      logger.error("Error fetching revision statuses", { error, episodeId });
      return NextResponse.json({ error: "Failed to fetch revision statuses" }, { status: 500 });
    }

    // Build status map
    const original: { hasEvaluated: boolean; evaluatorName?: string; averageScore?: number; decision?: string; grade?: string; evaluationId?: string } = { hasEvaluated: false };
    const revisions: Record<string, { hasEvaluated: boolean; evaluatorName?: string; averageScore?: number; decision?: string; grade?: string; evaluationId?: string }> = {};

    for (const ev of evaluations as any[]) {
      const evaluatorName = (ev.evaluator as any)?.name || undefined;

      if (ev.revision_id === null) {
        original.hasEvaluated = true;
        if (evaluatorName) original.evaluatorName = evaluatorName;
        original.averageScore = ev.overall_average;
        original.decision = ev.decision;
        original.grade = ev.overall_grade;
        original.evaluationId = ev.id;
      } else {
        revisions[ev.revision_id] = {
          hasEvaluated: true,
          evaluatorName,
          averageScore: ev.overall_average,
          decision: ev.decision,
          grade: ev.overall_grade,
          evaluationId: ev.id,
        };
      }
    }

    return NextResponse.json({ statuses: { original, revisions } });

  } catch (error) {
    logger.error(`Unexpected error in revision-statuses: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
