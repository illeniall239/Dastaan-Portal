import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOneLinerEvaluation } from "@/lib/evaluations/evaluate-on-log";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

/**
 * POST /api/evaluations/notify
 * Server-side notification trigger for call report evaluation submissions.
 * Called fire-and-forget from lib/evaluations/client.ts after an evaluation is created.
 * Uses admin client to bypass RLS (notifications table blocks authenticated-user inserts).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
    if (!rate.success) return rate.response!;

    const body = await request.json();
    const { evaluationId, callReportId } = body;

    if (!evaluationId || !callReportId) {
      return NextResponse.json({ error: "evaluationId and callReportId are required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Only the evaluator who just submitted this evaluation can announce it
    const { data: evaluation } = await adminClient
      .from("evaluator_forms")
      .select("evaluator_id, call_report_id")
      .eq("id", evaluationId)
      .single();
    if (!evaluation || evaluation.evaluator_id !== user.id || evaluation.call_report_id !== callReportId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Notify the team + the project's own team (anonymous — no evaluator name)
    await notifyOneLinerEvaluation(callReportId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/evaluations/notify]", error);
    // Return 200 anyway — caller is fire-and-forget; a 500 here just pollutes logs
    return NextResponse.json({ success: false });
  }
}
