import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotifications, getUserIdsByRoles, getProjectTeamMemberIds, excludeUserFromList } from "@/lib/notifications/server";
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

    // Fetch call report title for notification content
    const { data: callReport } = await adminClient
      .from("call_reports")
      .select("working_title, call_report_id")
      .eq("id", callReportId)
      .single();

    // Only the evaluator who just submitted this evaluation can announce it
    const { data: evaluation } = await adminClient
      .from("evaluator_forms")
      .select("evaluator_id, call_report_id")
      .eq("id", evaluationId)
      .single();
    if (!evaluation || evaluation.evaluator_id !== user.id || evaluation.call_report_id !== callReportId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const storyTitle = callReport?.working_title || callReport?.call_report_id || "Unknown";

    // Notify the team, same wording and recipients as an episodic evaluation,
    // plus the team that owns the project. Team anonymity: no evaluator name in notification
    const [roleIds, projectTeamIds] = await Promise.all([
      getUserIdsByRoles(["management", "content_manager", "content_creator"]),
      getProjectTeamMemberIds(callReportId),
    ]);
    const teamRecipients = excludeUserFromList([...new Set([...roleIds, ...projectTeamIds])], user.id);

    if (teamRecipients.length > 0) {
      await createNotifications(
        teamRecipients,
        "success",
        `New one-liner evaluation: ${storyTitle}`,
        `"${storyTitle}" has been evaluated. Review the scores in the evaluation section.`,
        "call_report",
        callReportId,
        user.id
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/evaluations/notify]", error);
    // Return 200 anyway — caller is fire-and-forget; a 500 here just pollutes logs
    return NextResponse.json({ success: false });
  }
}
