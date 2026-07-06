import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";
import { createNotifications, excludeUserFromList } from "@/lib/notifications/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUploadRevision } from "@/lib/episodes/permissions";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createRevisionSchema = z.object({
  attachment_url: z.string().url().optional().nullable(),
  attachment_name: z.string().max(255).optional().nullable(),
  attachment_type: z.string().max(100).optional().nullable(),
  comment: z.string().max(5000).optional().nullable(),
});

/**
 * GET /api/episodes/[id]/revisions
 * Get all revisions for an episode
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
  if (!rate.success) return rate.response!;

  try {
    // Verify episode exists
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("id")
      .eq("id", id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const { data: revisions, error } = await supabase
      .from("episode_revisions")
      .select(
        `
        *,
        uploaded_by_user:users!uploaded_by(name, email)
      `
      )
      .eq("episode_id", id)
      .order("revision_number", { ascending: true });

    if (error) {
      logger.error("Error fetching episode revisions:", error);
      return NextResponse.json(
        { error: "Failed to fetch revisions" },
        { status: 500 }
      );
    }

    // Aggregate evaluation data per revision
    const revisionIds = (revisions || []).map((r: any) => r.id);
    let evalSummaryMap: Record<string, { count: number; avg: number | null }> = {};

    if (revisionIds.length > 0) {
      const { data: evalData } = await supabase
        .from("episodic_evaluations")
        .select("revision_id, overall_average")
        .in("revision_id", revisionIds)
        .not("revision_id", "is", null);

      if (evalData) {
        for (const ev of evalData) {
          if (!ev.revision_id) continue;
          if (!evalSummaryMap[ev.revision_id]) {
            evalSummaryMap[ev.revision_id] = { count: 0, avg: null };
          }
          evalSummaryMap[ev.revision_id].count++;
        }
        // Calculate averages
        for (const revId of Object.keys(evalSummaryMap)) {
          const revEvals = evalData.filter((e: any) => e.revision_id === revId && e.overall_average != null);
          if (revEvals.length > 0) {
            const sum = revEvals.reduce((s: number, e: any) => s + (e.overall_average || 0), 0);
            evalSummaryMap[revId].avg = Number((sum / revEvals.length).toFixed(2));
          }
        }
      }
    }

    const enrichedRevisions = (revisions || []).map((r: any) => ({
      ...r,
      evaluation_count: evalSummaryMap[r.id]?.count || 0,
      average_evaluation_score: evalSummaryMap[r.id]?.avg ?? null,
    }));

    return NextResponse.json({ revisions: enrichedRevisions });
  } catch (error) {
    logger.error("Error in GET /api/episodes/[id]/revisions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/episodes/[id]/revisions
 * Create a new revision for an episode
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  try {
    // Parse and validate body
    const body = await request.json();
    const validation = createRevisionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation error", details: validation.error.format() },
        { status: 400 }
      );
    }

    // Verify episode exists
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("id, episode_number, call_report_id, story_id, logged_by")
      .eq("id", id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Permission check — fetch user role/team and episode's team context
    const { data: userData } = await supabase
      .from("users")
      .select("role, team_id")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    let episodeTeamId: string | null = null;
    if (episode.call_report_id) {
      const { data: crData } = await supabase
        .from("call_reports")
        .select("team_id")
        .eq("id", episode.call_report_id)
        .single();
      episodeTeamId = crData?.team_id || null;
    }

    if (!canUploadRevision(
      user.id,
      userData.role,
      { logged_by: episode.logged_by, call_report: { team_id: episodeTeamId } },
      userData.team_id,
    )) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to upload revisions for this episode" },
        { status: 403 },
      );
    }

    // Auto-calculate next revision number
    const { data: maxRevision } = await supabase
      .from("episode_revisions")
      .select("revision_number")
      .eq("episode_id", id)
      .order("revision_number", { ascending: false })
      .limit(1)
      .single();

    const nextRevisionNumber = (maxRevision?.revision_number || 0) + 1;

    // Insert revision
    const { data: revision, error: insertError } = await supabase
      .from("episode_revisions")
      .insert({
        episode_id: id,
        revision_number: nextRevisionNumber,
        attachment_url: validation.data.attachment_url || null,
        attachment_name: validation.data.attachment_name || null,
        attachment_type: validation.data.attachment_type || null,
        comment: validation.data.comment || null,
        uploaded_by: user.id,
      })
      .select(
        `
        *,
        uploaded_by_user:users!uploaded_by(name, email)
      `
      )
      .single();

    if (insertError) {
      logger.error("Error creating episode revision:", insertError);
      return NextResponse.json(
        { error: "Failed to create revision" },
        { status: 500 }
      );
    }

    // Audit log
    try {
      const ctx = await getRequestContext(request);
      await logAuditAction({
        action: "create",
        entityType: "episode_revision",
        entityId: revision.id,
        performedBy: user.id,
        details: {
          episode_id: id,
          revision_number: nextRevisionNumber,
          attachment_name: validation.data.attachment_name,
          ...ctx,
        },
      });
    } catch (auditError) {
      logger.error("Audit log error:", auditError);
    }

    // Notify relevant teams: programming, management, content dev, and uploader's team
    try {
      const admin = createAdminClient();

      // Get teams by type: production (programming), management (content dev + mgmt)
      const { data: relevantTeams } = await admin
        .from("teams")
        .select("id")
        .in("team_type", ["production", "management"]);
      const relevantTeamIds = (relevantTeams || []).map((t: { id: string }) => t.id);

      // Add uploader's team if not already included
      if (userData.team_id && !relevantTeamIds.includes(userData.team_id)) {
        relevantTeamIds.push(userData.team_id);
      }

      // Get all users from these teams + management role users
      const [{ data: teamUsers }, { data: mgmtUsers }] = await Promise.all([
        relevantTeamIds.length > 0
          ? admin.from("users").select("id").in("team_id", relevantTeamIds).eq("status", "active")
          : Promise.resolve({ data: [] }),
        admin.from("users").select("id").eq("role", "management").eq("status", "active"),
      ]);

      const recipientSet = new Set<string>();
      (teamUsers || []).forEach((u: { id: string }) => recipientSet.add(u.id));
      (mgmtUsers || []).forEach((u: { id: string }) => recipientSet.add(u.id));

      const recipients = excludeUserFromList([...recipientSet], user.id);

      if (recipients.length > 0) {
        const epLabel = episode.episode_number ? `EP${episode.episode_number}` : "Episode";
        await createNotifications(
          recipients,
          "info",
          `New revision: ${epLabel}`,
          `Revision ${nextRevisionNumber} has been uploaded for ${epLabel}.`,
          "episode",
          id,
          user.id
        );
      }
    } catch (notifErr) {
      logger.error("Failed to send episode revision notifications", { error: notifErr });
    }

    // Auto-post system message in the episode discussion thread
    try {
      const { data: uploaderUser } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();
      const uploaderName = uploaderUser?.name || "Someone";
      const revisionComment = validation.data.comment;
      const commentSnippet = revisionComment
        ? ` — "${revisionComment.slice(0, 80)}${revisionComment.length > 80 ? "…" : ""}"`
        : "";

      await supabase.from("episode_discussions").insert({
        episode_id: id,
        user_id: user.id,
        revision_id: revision.id,
        message: `📄 Revision ${revision.revision_number} uploaded by ${uploaderName}${commentSnippet}`,
        is_system_message: true,
      });
    } catch {
      // Non-fatal — don't fail the whole request
    }

    return NextResponse.json({ revision }, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/episodes/[id]/revisions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
