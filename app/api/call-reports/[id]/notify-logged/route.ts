import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { createNotifications, getUserIdsByRoles } from "@/lib/notifications/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/call-reports/[id]/notify-logged
 * Sends the "new one-liner logged" notification, the same way episodes do.
 * One-liners are created client-side (lib/meetings/client.ts), and the notifications
 * table blocks inserts from users, so the notification has to be sent from here.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!idParamSchema.safeParse({ id }).success) {
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
    const adminClient = createAdminClient();
    const { data: callReport } = await adminClient
      .from("call_reports")
      .select("id, working_title, writer_name, created_by, team_id")
      .eq("id", id)
      .single();

    if (!callReport || callReport.created_by !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Announce each one-liner once (created_at comes from the browser's clock, so no time window)
    const { count: alreadySent } = await adminClient
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "call_report")
      .eq("entity_id", callReport.id)
      .like("title", "New one-liner logged%");
    if (alreadySent) {
      return NextResponse.json({ error: "Already notified" }, { status: 409 });
    }

    // Same recipients as a logged episode: the team head + management, content managers, programmers
    const recipientSet = new Set<string>();
    if (callReport.team_id) {
      const { data: teamRecord } = await adminClient
        .from("teams")
        .select("team_head_id")
        .eq("id", callReport.team_id)
        .single();
      if (teamRecord?.team_head_id) recipientSet.add(teamRecord.team_head_id);
    }
    const mgmtIds = await getUserIdsByRoles(["management", "content_manager", "programmer"]);
    mgmtIds.forEach(uid => recipientSet.add(uid));
    recipientSet.delete(user.id);

    const recipients = Array.from(recipientSet);
    if (recipients.length > 0) {
      const { data: loggedBy } = await adminClient.from("users").select("name").eq("id", user.id).single();
      const loggedByName = loggedBy?.name || "Someone";
      const storyLabel = callReport.working_title ? ` for "${callReport.working_title}"` : "";
      const writerLabel = callReport.writer_name ? ` (writer: ${callReport.writer_name})` : "";

      await createNotifications(
        recipients,
        "info",
        `New one-liner logged${storyLabel}`,
        `${loggedByName} logged a one-liner${storyLabel}${writerLabel}.`,
        "call_report",
        callReport.id,
        user.id
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to send one-liner logged notifications", { error });
    // Caller is fire-and-forget; the one-liner itself is already saved
    return NextResponse.json({ success: false });
  }
}
