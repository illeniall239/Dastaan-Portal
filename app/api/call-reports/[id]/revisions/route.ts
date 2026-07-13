import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";
import { createNotifications, excludeUserFromList } from "@/lib/notifications/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createRevisionSchema = z.object({
  attachment_url: z.string().url().optional().nullable(),
  attachment_name: z.string().max(255).optional().nullable(),
  attachment_type: z.string().max(100).optional().nullable(),
  comment: z.string().max(5000).optional().nullable(),
  original_submission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

/**
 * GET /api/call-reports/[id]/revisions
 * Get all revisions for a call report
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
    // Verify call report exists
    const { data: callReport, error: callReportError } = await supabase
      .from("call_reports")
      .select("id")
      .eq("id", id)
      .single();

    if (callReportError || !callReport) {
      return NextResponse.json({ error: "Call report not found" }, { status: 404 });
    }

    const { data: revisions, error } = await supabase
      .from("call_report_revisions")
      .select(
        `
        *,
        uploaded_by_user:users!uploaded_by(name, email)
      `
      )
      .eq("call_report_id", id)
      .order("revision_number", { ascending: true });

    if (error) {
      logger.error("Error fetching call report revisions:", error);
      return NextResponse.json(
        { error: "Failed to fetch revisions" },
        { status: 500 }
      );
    }

    // Aggregate full evaluation data per revision
    const revisionIds = (revisions || []).map((r: any) => r.id);
    let evalsByRevision: Record<string, any[]> = {};

    if (revisionIds.length > 0) {
      const { data: evalData } = await supabase
        .from("evaluator_forms")
        .select(
          `
          id, revision_id, average_score,
          conflict_of_content_score, conflict_of_content_comment,
          characterization_score, characterization_comment,
          story_progression_score, story_progression_comment,
          whats_next_element_score, whats_next_element_comment,
          overall_oneliner_grade_score, overall_oneliner_grade_comment,
          decision, decision_notes, comments, big_idea, theme, submitted_at,
          evaluator:users!evaluator_id(name, email)
        `
        )
        .in("revision_id", revisionIds)
        .not("revision_id", "is", null)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: true });

      if (evalData) {
        for (const ev of evalData) {
          if (!ev.revision_id) continue;
          if (!evalsByRevision[ev.revision_id]) evalsByRevision[ev.revision_id] = [];
          evalsByRevision[ev.revision_id].push({
            id: ev.id,
            evaluator_name: (ev.evaluator as any)?.name || "Unknown",
            evaluator_email: (ev.evaluator as any)?.email || "",
            average_score: ev.average_score ?? null,
            conflict_of_content_score: ev.conflict_of_content_score ?? null,
            conflict_of_content_comment: ev.conflict_of_content_comment || null,
            characterization_score: ev.characterization_score ?? null,
            characterization_comment: ev.characterization_comment || null,
            story_progression_score: ev.story_progression_score ?? null,
            story_progression_comment: ev.story_progression_comment || null,
            whats_next_element_score: ev.whats_next_element_score ?? null,
            whats_next_element_comment: ev.whats_next_element_comment || null,
            overall_oneliner_grade_score: ev.overall_oneliner_grade_score ?? null,
            overall_oneliner_grade_comment: ev.overall_oneliner_grade_comment || null,
            decision: ev.decision || null,
            decision_notes: ev.decision_notes || null,
            comments: ev.comments || null,
            big_idea: ev.big_idea || null,
            theme: ev.theme || null,
            submitted_at: ev.submitted_at || null,
          });
        }
      }
    }

    const enrichedRevisions = (revisions || []).map((r: any) => {
      const revEvals = evalsByRevision[r.id] || [];
      const evalsWithScore = revEvals.filter((e: any) => e.average_score != null);
      const avg =
        evalsWithScore.length > 0
          ? Number(
              (
                evalsWithScore.reduce((s: number, e: any) => s + e.average_score, 0) /
                evalsWithScore.length
              ).toFixed(2)
            )
          : null;
      return {
        ...r,
        evaluation_count: revEvals.length,
        average_evaluation_score: avg,
        evaluations: revEvals,
      };
    });

    return NextResponse.json({ revisions: enrichedRevisions });
  } catch (error) {
    logger.error("Error in GET /api/call-reports/[id]/revisions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/call-reports/[id]/revisions
 * Create a new revision for a call report
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

    // Verify call report exists
    const { data: callReport, error: callReportError } = await supabase
      .from("call_reports")
      .select("id, call_report_id, working_title, writer_name")
      .eq("id", id)
      .single();

    if (callReportError || !callReport) {
      return NextResponse.json({ error: "Call report not found" }, { status: 404 });
    }

    // Auto-calculate next revision number
    const { data: maxRevision } = await supabase
      .from("call_report_revisions")
      .select("revision_number")
      .eq("call_report_id", id)
      .order("revision_number", { ascending: false })
      .limit(1)
      .single();

    const nextRevisionNumber = (maxRevision?.revision_number || 0) + 1;

    // Insert revision
    const { data: revision, error: insertError } = await supabase
      .from("call_report_revisions")
      .insert({
        call_report_id: id,
        revision_number: nextRevisionNumber,
        attachment_url: validation.data.attachment_url || null,
        attachment_name: validation.data.attachment_name || null,
        attachment_type: validation.data.attachment_type || null,
        comment: validation.data.comment || null,
        original_submission_date: validation.data.original_submission_date || null,
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
      logger.error("Error creating call report revision:", insertError);
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
        entityType: "call_report_revision",
        entityId: revision.id,
        performedBy: user.id,
        details: {
          call_report_id: id,
          revision_number: nextRevisionNumber,
          attachment_name: validation.data.attachment_name,
          ...ctx,
        },
      });
    } catch (auditError) {
      logger.error("Audit log error:", auditError);
    }

    // Fetch uploader name and team for both notification and discussion thread
    const { data: uploaderUser } = await supabase
      .from("users")
      .select("name, team_id")
      .eq("id", user.id)
      .single();
    const uploaderNameForNotif = uploaderUser?.name || "Someone";

    // Notify relevant teams: programming, management, content dev, and uploader's team
    try {
      const admin = createAdminClient();

      // Get teams by type: production (programming), management (content dev + mgmt)
      const { data: relevantTeams } = await admin
        .from("teams")
        .select("id")
        .in("team_type", ["production", "management", "programmer"]);
      const relevantTeamIds = (relevantTeams || []).map((t: { id: string }) => t.id);

      // Add uploader's team if not already included
      if (uploaderUser?.team_id && !relevantTeamIds.includes(uploaderUser.team_id)) {
        relevantTeamIds.push(uploaderUser.team_id);
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
        const displayId = callReport.call_report_id || id;
        const titleLabel = (callReport as any).working_title ? ` — "${(callReport as any).working_title}"` : ` (${displayId})`;
        const writerLabel = (callReport as any).writer_name ? `, writer: ${(callReport as any).writer_name}` : "";
        await createNotifications(
          recipients,
          "info",
          `New revision uploaded${titleLabel}`,
          `${uploaderNameForNotif} uploaded revision ${nextRevisionNumber}${titleLabel}${writerLabel}.`,
          "call_report",
          id,
          user.id
        );
      }
    } catch (notifErr) {
      logger.error("Failed to send revision notifications", { error: notifErr });
    }

    // Auto-post system message in the discussion thread
    try {
      const uploaderName = uploaderUser?.name || "Someone";
      const revisionComment = validation.data.comment;
      const commentSnippet = revisionComment
        ? ` — "${revisionComment.slice(0, 80)}${revisionComment.length > 80 ? "…" : ""}"`
        : "";

      await supabase.from("call_report_discussions").insert({
        call_report_id: id,
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
    logger.error("Error in POST /api/call-reports/[id]/revisions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
