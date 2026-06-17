import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";
import { createDiscussionSchema } from "@/lib/validations/call-reports";
import { createNotifications } from "@/lib/notifications/server";
import { MANDATORY_APPROVER_EMAILS } from "@/lib/approvals/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/call-reports/[id]/discussions
 * Fetch all discussion messages for a call report, oldest first
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
  if (!rate.success) return rate.response!;

  try {
    const { data: callReport } = await supabase
      .from("call_reports")
      .select("id")
      .eq("id", id)
      .single();

    if (!callReport) {
      return NextResponse.json({ error: "Call report not found" }, { status: 404 });
    }

    const { data: discussions, error } = await supabase
      .from("call_report_discussions")
      .select(`
        id,
        call_report_id,
        user_id,
        message,
        revision_id,
        is_system_message,
        created_at,
        updated_at,
        user:users!user_id(name, email, role)
      `)
      .eq("call_report_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("Error fetching call report discussions:", error);
      return NextResponse.json({ error: "Failed to fetch discussions" }, { status: 500 });
    }

    return NextResponse.json({ discussions: discussions || [] });
  } catch (error) {
    logger.error("Error in GET /api/call-reports/[id]/discussions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/call-reports/[id]/discussions
 * Post a new message in the discussion thread
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  try {
    const body = await request.json();
    const validation = createDiscussionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation error", details: validation.error.format() },
        { status: 400 }
      );
    }

    // Verify call report exists and get creator id + display fields
    const { data: callReport } = await supabase
      .from("call_reports")
      .select("id, logged_by, working_title, call_report_id")
      .eq("id", id)
      .single();

    if (!callReport) {
      return NextResponse.json({ error: "Call report not found" }, { status: 404 });
    }

    // Insert message
    const { data: discussion, error: insertError } = await supabase
      .from("call_report_discussions")
      .insert({
        call_report_id: id,
        user_id: user.id,
        message: validation.data.message,
      })
      .select(`
        id,
        call_report_id,
        user_id,
        message,
        revision_id,
        is_system_message,
        created_at,
        updated_at,
        user:users!user_id(name, email, role)
      `)
      .single();

    if (insertError) {
      logger.error("Error creating discussion message:", insertError);
      return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
    }

    // Audit log
    try {
      const ctx = await getRequestContext(request);
      await logAuditAction({
        action: "create",
        entityType: "call_report_discussion",
        entityId: discussion.id,
        performedBy: user.id,
        details: { call_report_id: id, ...ctx },
      });
    } catch (auditError) {
      logger.error("Audit log error:", auditError);
    }

    // Rich notifications: notify relevant parties with context
    try {
      const posterUser = discussion.user as { name?: string; email?: string; role?: string } | null;
      const posterName = posterUser?.name || "Someone";
      const posterEmail = posterUser?.email || user.email || "";
      const isMandatoryApprover = (MANDATORY_APPROVER_EMAILS as readonly string[]).includes(posterEmail as string);

      const displayTitle = callReport.working_title || callReport.call_report_id || "a call report";
      const displayId = callReport.call_report_id || "";
      const msgPreview = validation.data.message.slice(0, 100) + (validation.data.message.length > 100 ? "…" : "");

      // Get all previous participants in this thread (excluding poster)
      const { data: participants } = await supabase
        .from("call_report_discussions")
        .select("user_id")
        .eq("call_report_id", id)
        .neq("user_id", user.id);

      const participantIds = [...new Set(
        (participants || []).map((p: { user_id: string }) => p.user_id)
          .filter((uid): uid is string => Boolean(uid))
      )];

      let recipientIds: string[];
      let notifTitle: string;
      let notifMessage: string;

      if (!isMandatoryApprover) {
        // Evaluator/programmer replying to management feedback:
        // only notify mandatory approvers who have already posted in this thread + logged_by
        const adminClient = createAdminClient();
        const { data: mandatoryUsers } = await adminClient
          .from("users")
          .select("id")
          .in("email", MANDATORY_APPROVER_EMAILS);

        const mandatoryUserIdSet = new Set((mandatoryUsers || []).map((u: { id: string }) => u.id));
        const mandatoryInThread = participantIds.filter((uid) => mandatoryUserIdSet.has(uid));

        recipientIds = [...new Set([
          ...mandatoryInThread,
          ...(callReport.logged_by ? [callReport.logged_by] : []),
        ])].filter((uid) => uid !== user.id);

        notifTitle = `Feedback reply on ${displayTitle}`;
        notifMessage = `${posterName} replied on ${displayId}: "${msgPreview}"`;
      } else {
        // Mandatory approver (Humera/Salman) leaving feedback:
        // notify all existing thread participants + logged_by
        recipientIds = [...new Set([
          ...participantIds,
          ...(callReport.logged_by ? [callReport.logged_by] : []),
        ])].filter((uid) => uid !== user.id);

        notifTitle = `New feedback on ${displayTitle}`;
        notifMessage = `${posterName} left feedback on ${displayId}: "${msgPreview}"`;
      }

      if (recipientIds.length > 0) {
        await createNotifications(
          recipientIds,
          "info",
          notifTitle,
          notifMessage,
          "call_report_discussion",
          id,
          user.id
        );
      }
    } catch (notifError) {
      logger.error("Notification error:", notifError);
    }

    return NextResponse.json({ discussion }, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/call-reports/[id]/discussions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
