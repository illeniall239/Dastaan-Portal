export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
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

    // Query all evaluations for this call report by current user (no revision filter)
    const { data: evaluations, error } = await supabase
      .from("evaluator_forms")
      .select("id, revision_id, evaluator_id")
      .eq("call_report_id", callReportId)
      .eq("evaluator_id", user.id);

    if (error) {
      logger.error("Error fetching call report revision statuses", { error, callReportId });
      return NextResponse.json({ error: "Failed to fetch revision statuses" }, { status: 500 });
    }

    // Build status map
    const original: { hasEvaluated: boolean } = { hasEvaluated: false };
    const revisions: Record<string, { hasEvaluated: boolean }> = {};

    for (const ev of evaluations || []) {
      if (ev.revision_id === null) {
        original.hasEvaluated = true;
      } else {
        revisions[ev.revision_id] = { hasEvaluated: true };
      }
    }

    return NextResponse.json({ statuses: { original, revisions } });

  } catch (error) {
    logger.error(`Unexpected error in call report revision-statuses: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
