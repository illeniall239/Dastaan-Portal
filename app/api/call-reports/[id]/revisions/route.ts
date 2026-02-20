import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createRevisionSchema = z.object({
  attachment_url: z.string().url().optional().nullable(),
  attachment_name: z.string().max(255).optional().nullable(),
  attachment_type: z.string().max(100).optional().nullable(),
  comment: z.string().max(5000).optional().nullable(),
});

/**
 * GET /api/call-reports/[id]/revisions
 * Get all revisions for a call report
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Aggregate evaluation data per revision
    const revisionIds = (revisions || []).map((r: any) => r.id);
    let evalSummaryMap: Record<string, { count: number; avg: number | null }> = {};

    if (revisionIds.length > 0) {
      const { data: evalData } = await supabase
        .from("evaluator_forms")
        .select("revision_id, average_score")
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
          const revEvals = evalData.filter((e: any) => e.revision_id === revId && e.average_score != null);
          if (revEvals.length > 0) {
            const sum = revEvals.reduce((s: number, e: any) => s + (e.average_score || 0), 0);
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
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

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
      .select("id, call_report_id")
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

    return NextResponse.json({ revision }, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/call-reports/[id]/revisions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
