import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";
import { mustEvaluateOnUpload } from "@/lib/episodes/permissions";
import { oneLinerRows } from "@/lib/meetings/one-liner-rows";
import { COMMERCIAL_POSITIONING_VALUES, AUDIENCE_FOCUS_VALUES } from "@/lib/project-tags";
import {
  oneLinerEvaluationSchema,
  oneLinerEvaluationRow,
  notifyOneLinerEvaluation,
  notifyOneLinerLogged,
  evaluationRequiredMessage,
} from "@/lib/evaluations/evaluate-on-log";

export const dynamic = "force-dynamic";

const opt = (max: number) => z.string().max(max).optional().nullable();

/** The one-liner as the Log One-Liner form sends it. The logger and creator come from the session. */
const oneLinerSchema = z.object({
  category: z.string().max(100),
  writer_name: z.string().max(500),
  writer_email: z.string().max(320).optional().default(""),
  contact_type: opt(50),
  suggested_writer: opt(500),
  contact_phone: opt(50),
  contact_address: opt(1000),
  working_title: z.string().trim().min(1, "Working title is required").max(500),
  director: opt(500),
  total_episodes: z.number().int().min(0).max(1000).optional().nullable(),
  received_episodes: z.number().int().min(0).max(1000).optional().nullable(),
  logline: z.string().trim().min(1, "Logline is required").max(10000),
  logline_image_url: opt(2000),
  short_synopsis: opt(50000),
  episodic_synopsis: opt(200000),
  genre: z.array(z.string().max(100)).max(20).optional(),
  theme: opt(500),
  slot: opt(100),
  content_type: z.enum(["Serial", "Long Serial", "Telefilm", "Mini-serial", "Ramadan Serial", "Series Sitcom", "Soap"]).optional().nullable(),
  commercial_positioning: z.enum(COMMERCIAL_POSITIONING_VALUES).optional().nullable(),
  audience_focus: z.enum(AUDIENCE_FOCUS_VALUES).optional().nullable(),
  idea_by: opt(500),
  developed_by: opt(500),
  management_member_name: opt(500),
  meeting_date: z.string().datetime({ offset: true }),
  duration_minutes: z.number().int().min(0).max(24 * 60).optional().nullable(),
  attendees: z.array(z.string().max(320)).max(100).default([]),
  location: opt(500),
  notes: z.string().max(50000).default(""),
  next_steps: opt(10000),
  status: z.string().max(50),
  overall_rating: z.number().min(1).max(10).optional().nullable(),
  time_spent_minutes: z.number().int().min(0).optional().nullable(),
  form_started_at: z.string().datetime({ offset: true }).optional().nullable(),
  original_submission_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const bodySchema = z.object({
  oneLiner: oneLinerSchema,
  evaluation: z.unknown().optional(),
});

/**
 * POST /api/call-reports
 * Log a one-liner on the server. Roles that must evaluate what they log (MUST_EVALUATE_ROLES) send their
 * evaluation with it: the story, the one-liner and the evaluation are saved in one transaction, or nothing
 * is saved (the database refuses a one-liner from these roles without their evaluation).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  try {
    const admin = createAdminClient();
    const { data: me } = await admin.from("users").select("role, name, team_id, status").eq("id", user.id).single();
    if (!me || me.status === "inactive"
        || !["admin", "management", "content_manager", "content_creator", "evaluator", "programmer", "gcm"].includes(me.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const mustEvaluate = mustEvaluateOnUpload(me.role);
    let evaluationRow: Record<string, unknown> | null = null;
    if (mustEvaluate) {
      const evalParsed = oneLinerEvaluationSchema.safeParse(parsed.data.evaluation);
      if (!evalParsed.success) {
        return NextResponse.json(
          { error: "Evaluate this one-liner before logging it", details: evalParsed.error.format() },
          { status: 400 }
        );
      }
      evaluationRow = oneLinerEvaluationRow(evalParsed.data, user.id);
    }

    // The logger's team (a team head is always a member of their team)
    let teamId: string | null = me.team_id || null;
    if (!teamId) {
      const { data: ownedTeam } = await admin.from("teams").select("id").eq("team_head_id", user.id).maybeSingle();
      teamId = ownedTeam?.id || null;
    }
    if (!teamId) {
      return NextResponse.json(
        { error: "Your account is not assigned to a team yet. Please contact an administrator." },
        { status: 400 }
      );
    }

    const o = parsed.data.oneLiner;
    const { story, callReport } = oneLinerRows(
      {
        ...o,
        contact_type: o.contact_type || undefined,
        suggested_writer: o.suggested_writer || undefined,
        contact_phone: o.contact_phone || undefined,
        contact_address: o.contact_address || undefined,
        director: o.director || undefined,
        total_episodes: o.total_episodes ?? undefined,
        received_episodes: o.received_episodes ?? undefined,
        logline_image_url: o.logline_image_url || undefined,
        short_synopsis: o.short_synopsis || undefined,
        episodic_synopsis: o.episodic_synopsis || undefined,
        theme: o.theme || undefined,
        slot: o.slot || undefined,
        content_type: o.content_type || undefined,
        commercial_positioning: o.commercial_positioning || undefined,
        audience_focus: o.audience_focus || undefined,
        idea_by: o.idea_by || undefined,
        developed_by: o.developed_by || undefined,
        management_member_name: o.management_member_name || undefined,
        duration_minutes: o.duration_minutes ?? undefined,
        location: o.location || undefined,
        next_steps: o.next_steps || undefined,
        overall_rating: o.overall_rating ?? undefined,
        time_spent_minutes: o.time_spent_minutes ?? undefined,
        form_started_at: o.form_started_at || undefined,
        original_submission_date: o.original_submission_date || undefined,
        // From the session, never the request
        logged_by: me.name || user.email || "Unknown",
        created_by: user.id,
      },
      teamId,
      new Date().toISOString()
    );

    const { data: saved, error: saveError } = await admin.rpc("log_call_report_with_evaluation", {
      p_story: story,
      p_call_report: callReport,
      p_evaluation: evaluationRow,
    });

    if (saveError || !saved) {
      const required = evaluationRequiredMessage(saveError);
      if (required) return NextResponse.json({ error: required }, { status: 400 });
      logger.error("Failed to log one-liner", { error: saveError });
      return NextResponse.json({ error: "Failed to log the one-liner" }, { status: 500 });
    }

    const savedCallReport = (saved as any).call_report;
    const savedEvaluation = (saved as any).evaluation as { id: string } | null;
    const ctx = getRequestContext(request);

    await logAuditAction({
      entityType: "call_report",
      entityId: savedCallReport.id,
      action: "created_call_report",
      performedBy: user.id,
      details: { ...ctx, title: savedCallReport.working_title, writer: savedCallReport.writer_name, category: savedCallReport.category },
    }).catch((err) => logger.error("Audit log failed", { error: err }));

    await notifyOneLinerLogged(savedCallReport.id, user.id)
      .catch((err) => logger.error("Failed to send one-liner logged notifications", { error: err }));

    if (savedEvaluation) {
      await logAuditAction({
        entityType: "evaluator_form",
        entityId: savedEvaluation.id,
        action: "created",
        performedBy: user.id,
        details: { ...ctx, call_report_id: savedCallReport.id, logged_with_one_liner: true },
      }).catch((err) => logger.error("Audit log failed", { error: err }));
      await notifyOneLinerEvaluation(savedCallReport.id, user.id)
        .catch((err) => logger.error("Failed to send one-liner evaluation notifications", { error: err }));
    }

    return NextResponse.json({ callReport: savedCallReport, evaluation: savedEvaluation }, { status: 201 });
  } catch (error) {
    logger.error("Unexpected error logging one-liner", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
