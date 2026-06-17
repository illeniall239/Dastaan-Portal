import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotifications, getUserIdsByRoles, excludeUserFromList } from "@/lib/notifications/server";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";
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

    // Fetch evaluation score
    const { data: evaluation } = await adminClient
      .from("evaluator_forms")
      .select("average_score")
      .eq("id", evaluationId)
      .single();

    const storyTitle = callReport?.working_title || callReport?.call_report_id || "Unknown";
    const score = evaluation?.average_score;

    // Notify full team (management + content_manager + content_creator)
    // Team anonymity: no evaluator name in notification
    const teamIds = await getUserIdsByRoles(["management", "content_manager", "content_creator"]);
    const teamRecipients = excludeUserFromList(teamIds, user.id);

    if (teamRecipients.length > 0) {
      await createNotifications(
        teamRecipients,
        "success",
        `New evaluation submitted: ${storyTitle}`,
        `Evaluation completed${score != null ? ` — average score: ${score}/10` : ""}.`,
        "evaluation_submitted",
        evaluationId,
        user.id
      );
    }

    // Notify mandatory approvers (Humera/Salman) + programmers: story ready for approval
    const { data: mandatoryUsers } = await adminClient
      .from("users")
      .select("id")
      .in("email", MANDATORY_APPROVER_EMAILS);

    const { data: programmerUsers } = await adminClient
      .from("users")
      .select("id")
      .eq("role", "programmer")
      .eq("status", "active");

    const approvalRecipientSet = new Set<string>([
      ...(mandatoryUsers || []).map((u: { id: string }) => u.id),
      ...(programmerUsers || []).map((u: { id: string }) => u.id),
    ]);
    const approvalRecipients = excludeUserFromList(Array.from(approvalRecipientSet), user.id);

    if (approvalRecipients.length > 0) {
      await createNotifications(
        approvalRecipients,
        "info",
        `Story ready for your review: ${storyTitle}`,
        `An evaluation has been completed. Please review and approve or reject this story.`,
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
