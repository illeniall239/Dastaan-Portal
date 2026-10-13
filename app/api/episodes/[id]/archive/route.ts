import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { createNotifications } from "@/lib/notifications/server";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export const dynamic = "force-dynamic";

const ARCHIVE_ROLES = ["content_creator", "content_manager", "evaluator", "admin"];
const NOTIFY_TEAM_TYPES = ["programmer", "management", "gcm"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rate = await applyRateLimit(request, RateLimitPresets.strict, user.id);
  if (!rate.success) return rate.response!;

  const { data: profile } = await supabase
    .from("users")
    .select("role, team_id, name")
    .eq("id", user.id)
    .single();
  if (!profile || !ARCHIVE_ROLES.includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const archive = body.archive === true;

  const admin = createAdminClient();

  // Fetch episode with project info
  const { data: episode, error: epErr } = await admin
    .from("episodes")
    .select("id, episode_number, logged_by, team_id, call_report_id, archived_at, call_report:call_reports!inner(working_title, team_id)")
    .eq("id", id)
    .single();

  if (epErr || !episode)
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });

  const crData = Array.isArray(episode.call_report) ? episode.call_report[0] : episode.call_report;
  const projectTeamId = crData?.team_id || episode.team_id;

  // Permission: must be on same team (or admin)
  if (profile.role !== "admin" && profile.team_id !== projectTeamId)
    return NextResponse.json({ error: "Forbidden — not your team" }, { status: 403 });

  // Already in desired state?
  if (archive && episode.archived_at)
    return NextResponse.json({ message: "Already archived" });
  if (!archive && !episode.archived_at)
    return NextResponse.json({ message: "Already active" });

  // Update all versions of this episode (same project + episode_number)
  const updateData = archive
    ? { archived_at: new Date().toISOString(), archived_by: user.id }
    : { archived_at: null, archived_by: null };

  let updateQuery = admin
    .from("episodes")
    .update(updateData)
    .eq("episode_number", episode.episode_number);

  if (episode.call_report_id) {
    updateQuery = updateQuery.eq("call_report_id", episode.call_report_id);
  } else {
    updateQuery = updateQuery.eq("id", id);
  }

  const { error: updateErr } = await updateQuery;
  if (updateErr)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  // Audit
  const ctx = getRequestContext(request);
  await logAuditAction({
    entityType: "episode",
    entityId: id,
    action: archive ? "archived" : "unarchived",
    performedBy: user.id,
    details: { ...ctx, episodeNumber: episode.episode_number, project: crData?.working_title },
  }).catch(() => {});

  // Notify: same team + oversight teams
  const action = archive ? "archived" : "restored";
  const title = `Episode ${archive ? "Archived" : "Restored"}`;
  const message = `EP ${episode.episode_number} of "${crData?.working_title || "Unknown"}" was ${action} by ${profile.name || "a team member"}`;

  try {
    // Get users to notify: same content team + oversight teams
    const { data: usersToNotify } = await admin
      .from("users")
      .select("id, team_id, role")
      .eq("is_active", true);

    if (usersToNotify) {
      // Get oversight team IDs
      const { data: oversightTeams } = await admin
        .from("teams")
        .select("id, team_type")
        .in("team_type", NOTIFY_TEAM_TYPES);

      const oversightTeamIds = new Set((oversightTeams || []).map((t: any) => t.id));

      const recipientIds = usersToNotify
        .filter((u: any) => {
          if (u.id === user.id) return false; // don't notify yourself
          if (u.team_id === projectTeamId) return true; // same content team
          if (oversightTeamIds.has(u.team_id)) return true; // oversight
          if (u.role === "admin") return true;
          return false;
        })
        .map((u: any) => u.id);

      if (recipientIds.length > 0) {
        await createNotifications(recipientIds, "info", title, message, "episode", id, user.id);
      }
    }
  } catch (notifErr) {
    console.error("Archive notification error:", notifErr);
  }

  return NextResponse.json({ success: true, archived: archive });
}
