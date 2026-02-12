import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { updateCallReportSchema } from "@/lib/validations/call-reports";
import { sanitizeCallReportForUser } from "@/lib/call-reports/privacy";
import { revalidatePath } from 'next/cache';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

/**
 * GET /api/call-reports/[id]
 * Get a single call report by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format", details: paramValidation.error.format() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;
    const { data: callReport, error } = await supabase
      .from("call_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Call report not found" },
          { status: 404 }
        );
      }
      logger.error("Error fetching call report:", { error, callReportId: id, context: "GET /api/call-reports/[id]" });
      return NextResponse.json(
        { error: "Failed to fetch call report" },
        { status: 500 }
      );
    }

    // Get current user's full profile for privacy check
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Sanitize private fields based on user permissions
    const sanitizedCallReport = sanitizeCallReportForUser(callReport, userData);

    // Fetch writers for this call report
    const { data: writers } = await supabase
      .from("call_report_writers")
      .select(`
        id,
        call_report_id,
        writer_id,
        writer_email,
        writer_phone,
        display_order,
        created_at,
        updated_at,
        writer:writers(name)
      `)
      .eq("call_report_id", id)
      .order("display_order", { ascending: true });

    // Transform writers data
    const transformedWriters = writers?.map(w => ({
      id: w.id,
      call_report_id: w.call_report_id,
      writer_id: w.writer_id,
      writer_name: Array.isArray(w.writer) ? w.writer[0]?.name : (w.writer as any)?.name || "",
      writer_email: w.writer_email,
      writer_phone: w.writer_phone,
      display_order: w.display_order,
      created_at: w.created_at,
      updated_at: w.updated_at,
    })) || [];

    return NextResponse.json({
      callReport: {
        ...sanitizedCallReport,
        writers: transformedWriters
      }
    });
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/call-reports/[id]
 * Update a call report
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format", details: paramValidation.error.format() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role and team
  const { data: userData } = await supabase
    .from("users")
    .select("role, team_id")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;
    // First, check if call report exists and get owner + team
    const { data: existing, error: fetchError } = await supabase
      .from("call_reports")
      .select("created_by, team_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Call report not found" },
          { status: 404 }
        );
      }
      logger.error(`Error fetching call report: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      return NextResponse.json(
        { error: "Failed to fetch call report", details: fetchError.message },
        { status: 500 }
      );
    }

    // TEAM ISOLATION: Check team access first (unless admin/management/programmer)
    const isGlobalUser = ["admin", "management", "programmer"].includes(userData.role);
    const isSameTeam = existing.team_id === userData.team_id;

    if (!isGlobalUser && !isSameTeam) {
      return NextResponse.json(
        { error: "Access denied: This call report belongs to another team" },
        { status: 403 }
      );
    }

    // Check permissions: owner or manager/admin or content_head/creator/evaluator (same team)
    const canEdit =
      existing.created_by === user.id ||
      ["content_manager", "admin", "content_head", "content_creator", "evaluator"].includes(userData.role) ||
      isGlobalUser;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to edit this call report" },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = updateCallReportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const { attachments_to_delete, ...updates } = validation.data;

    // Update call report
    const { data: updatedCallReport, error: updateError } = await supabase
      .from("call_reports")
      .update({ ...updates, updated_by: user.id })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error(`Error updating call report: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
      return NextResponse.json(
        { error: "Failed to update call report", details: updateError.message },
        { status: 500 }
      );
    }

    if (attachments_to_delete && attachments_to_delete.length > 0) {
      const { data: attachments, error: attachmentsError } = await supabase
        .from("attachments")
        .select("id, file_path")
        .eq("entity_type", "call_report")
        .eq("entity_id", id)
        .in("id", attachments_to_delete);

      if (attachmentsError) {
        logger.error(`Error fetching attachments for deletion: ${attachmentsError instanceof Error ? attachmentsError.message : String(attachmentsError)}`);
      } else if (attachments && attachments.length > 0) {
        const filePaths = attachments.map((attachment) => attachment.file_path);

        const { error: storageError } = await supabase.storage
          .from("attachments")
          .remove(filePaths);

        if (storageError) {
          logger.error(`Error deleting attachment files: ${storageError instanceof Error ? storageError.message : String(storageError)}`);
        }

        const { error: deleteError } = await supabase
          .from("attachments")
          .delete()
          .in("id", attachments.map((attachment) => attachment.id));

        if (deleteError) {
          logger.error(`Error deleting attachment records: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
        }
      }
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "call_report",
      entityId: id,
      action: "updated",
      performedBy: user.id,
      details: { ...requestContext, newValues: updates },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    // Revalidate call report list pages to show updated reports immediately
    revalidatePath('/content-department/call-reports');
    revalidatePath('/evaluator/call-reports');
    revalidatePath('/content-department/status-updater');
    revalidatePath('/evaluator/status-updater');

    return NextResponse.json({
      message: "Call report updated successfully",
      callReport: updatedCallReport,
    });
  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
