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
 * GET /api/episodes/[id]/discussions
 * Fetch all discussion messages for an episode, oldest first
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
  if (!rate.success) return rate.response!;

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

  try {
    const { data: episode } = await supabase
      .from("episodes")
      .select("id")
      .eq("id", id)
      .single();

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const { data: discussions, error } = await supabase
      .from("episode_discussions")
      .select(`
        id,
        episode_id,
        user_id,
        message,
        revision_id,
        is_system_message,
        created_at,
        updated_at,
        user:users!user_id(name, email, role)
      `)
      .eq("episode_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("Error fetching episode discussions:", error);
      return NextResponse.json({ error: "Failed to fetch discussions" }, { status: 500 });
    }

    return NextResponse.json({ discussions: discussions || [] });
  } catch (error) {
    logger.error("Error in GET /api/episodes/[id]/discussions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/episodes/[id]/discussions
 * Post a new message in the episode discussion thread
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

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

  try {
    const body = await request.json();
    const validation = createDiscussionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation error", details: validation.error.format() },
        { status: 400 }
      );
    }

    // Fetch episode + parent call report for display context
    const { data: episode } = await supabase
      .from("episodes")
      .select("id, episode_number, call_report_id")
      .eq("id", id)
      .single();

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Fetch parent call report for title + logged_by
    let callReportTitle = "";
    let loggedBy: string | null = null;
    if (episode.call_report_id) {
      const { data: callReport } = await supabase
        .from("call_reports")
        .select("working_title, call_report_id, logged_by")
        .eq("id", episode.call_report_id)
        .single();
      if (callReport) {
        callReportTitle = callReport.working_title || callReport.call_report_id || "";
        loggedBy = callReport.logged_by || null;
      }
    }

    // Insert message
    const { data: discussion, error: insertError } = await supabase
      .from("episode_discussions")
      .insert({
        episode_id: id,
        user_id: user.id,
        message: validation.data.message,
      })
      .select(`
        id,
        episode_id,
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
      logger.error("Error creating episode discussion message:", insertError);
      return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
    }

    // Audit log
    try {
      const ctx = await getRequestContext(request);
      await logAuditAction({
        action: "create",
        entityType: "episode_discussion",
        entityId: discussion.id,
        performedBy: user.id,
        details: { episode_id: id, ...ctx },
      });
    } catch (auditError) {
      logger.error("Audit log error:", auditError);
    }

    // Rich notifications
    try {
      const posterUser = discussion.user as { name?: string; email?: string; role?: string } | null;
      const posterName = posterUser?.name || "Someone";
      const posterEmail = posterUser?.email || user.email || "";
      const isMandatoryApprover = (MANDATORY_APPROVER_EMAILS as readonly string[]).includes(posterEmail as string);

      const epNum = episode.episode_number ? `EP${episode.episode_number}` : "Episode";
      const displayTitle = callReportTitle ? `${epNum} — ${callReportTitle}` : epNum;
      const msgPreview = validation.data.message.slice(0, 100) + (validation.data.message.length > 100 ? "…" : "");

      // Get all previous participants in this thread (excluding poster)
      const { data: participants } = await supabase
        .from("episode_discussions")
        .select("user_id")
        .eq("episode_id", id)
        .neq("user_id", user.id);

      const participantIds = [...new Set(
        (participants || []).map((p: { user_id: string }) => p.user_id)
          .filter((uid): uid is string => Boolean(uid))
      )];

      let recipientIds: string[];
      let notifTitle: string;
      let notifMessage: string;

      if (!isMandatoryApprover) {
        // Non-management replying: notify mandatory approvers in thread + logged_by
        const adminClient = createAdminClient();
        const { data: mandatoryUsers } = await adminClient
          .from("users")
          .select("id")
          .in("email", MANDATORY_APPROVER_EMAILS);

        const mandatoryUserIdSet = new Set((mandatoryUsers || []).map((u: { id: string }) => u.id));
        const mandatoryInThread = participantIds.filter((uid) => mandatoryUserIdSet.has(uid));

        recipientIds = [...new Set([
          ...mandatoryInThread,
          ...(loggedBy ? [loggedBy] : []),
        ])].filter((uid) => uid !== user.id);

        notifTitle = `Feedback reply on ${displayTitle}`;
        notifMessage = `${posterName} replied on ${displayTitle}: "${msgPreview}"`;
      } else {
        // Mandatory approver leaving feedback: notify all thread participants + logged_by
        recipientIds = [...new Set([
          ...participantIds,
          ...(loggedBy ? [loggedBy] : []),
        ])].filter((uid) => uid !== user.id);

        notifTitle = `New feedback on ${displayTitle}`;
        notifMessage = `${posterName} left feedback on ${displayTitle}: "${msgPreview}"`;
      }

      if (recipientIds.length > 0) {
        await createNotifications(
          recipientIds,
          "info",
          notifTitle,
          notifMessage,
          "episode_discussion",
          id,
          user.id
        );
      }
    } catch (notifError) {
      logger.error("Notification error:", notifError);
    }

    return NextResponse.json({ discussion }, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/episodes/[id]/discussions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
