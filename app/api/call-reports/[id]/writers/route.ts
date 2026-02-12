import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  unauthorizedError,
  notFoundError,
  validationError,
  handleDatabaseError,
  internalError,
  createSuccessResponse,
} from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

/**
 * GET /api/call-reports/[id]/writers
 * Fetch all writers for a call report
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const supabase = await createClient();
    const { id } = await params;

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return unauthorizedError();
    }

    // Fetch writers with JOIN to get writer names
    const { data: writers, error } = await supabase
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

    if (error) {
      logger.error("Error fetching call report writers:", error);
      return handleDatabaseError(error, "fetching call report writers");
    }

    interface WriterData {
      id: string;
      call_report_id: string;
      writer_id: string;
      writer_email: string | null;
      writer_phone: string | null;
      display_order: number;
      created_at: string;
      updated_at: string;
      writer: {
        name: string;
      } | Array<{
        name: string;
      }>;
    }

    // Transform to flatten writer name
    const transformedWriters = writers?.map((w: WriterData) => {
      // Handle writer relation which could be an object (single) or array (multiple)
      // Supabase returns an object for many-to-one relationships
      let writerName = "";
      if (Array.isArray(w.writer)) {
        writerName = w.writer[0]?.name || "";
      } else if (w.writer) {
        writerName = w.writer.name || "";
      }

      return {
        id: w.id,
        call_report_id: w.call_report_id,
        writer_id: w.writer_id,
        writer_name: writerName,
        writer_email: w.writer_email,
        writer_phone: w.writer_phone,
        display_order: w.display_order,
        created_at: w.created_at,
        updated_at: w.updated_at,
      };
    }) || [];

    return NextResponse.json({ writers: transformedWriters });
  } catch (error) {
    logger.error("Error in GET /api/call-reports/[id]/writers:", error);
    return internalError();
  }
}

/**
 * POST /api/call-reports/[id]/writers
 * Add writer(s) to a call report
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return unauthorizedError();
    }

    // Validate request body
    const { writers } = body;
    if (!Array.isArray(writers) || writers.length === 0) {
      return validationError("Writers array is required");
    }

    // Verify call report exists
    const { data: callReport, error: fetchError } = await supabase
      .from("call_reports")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !callReport) {
      return notFoundError("Call report");
    }

    // Prepare writer records for insertion
    const writerRecords = writers.map((writer, index) => ({
      call_report_id: id,
      writer_id: writer.writer_id,
      writer_email: writer.writer_email || null,
      writer_phone: writer.writer_phone || null,
      display_order: writer.display_order !== undefined ? writer.display_order : index,
    }));

    // Insert writers
    const { data: insertedWriters, error: insertError } = await supabase
      .from("call_report_writers")
      .insert(writerRecords)
      .select();

    if (insertError) {
      logger.error("Error inserting writers:", insertError);
      return handleDatabaseError(insertError, "adding writers");
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "call_report_writer",
      entityId: id,
      action: "created",
      performedBy: user.id,
      details: { ...requestContext, newValues: { writers: writerRecords } },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return NextResponse.json(
      { message: "Writers added successfully", writers: insertedWriters },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error in POST /api/call-reports/[id]/writers:", error);
    return internalError();
  }
}

/**
 * PUT /api/call-reports/[id]/writers/reorder
 * Update display order for all writers
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return unauthorizedError();
    }

    // Validate request body
    const { writers } = body;
    if (!Array.isArray(writers) || writers.length === 0) {
      return validationError("Writers array with new order is required");
    }

    interface WriterToReorder {
      id: string;
    }

    // Update display_order for each writer
    const updatePromises = writers.map((writer: WriterToReorder, index: number) =>
      supabase
        .from("call_report_writers")
        .update({ display_order: index })
        .eq("id", writer.id)
        .eq("call_report_id", id)
    );

    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      logger.error("Error reordering writers:", errors);
      return handleDatabaseError(errors[0].error, "reordering writers");
    }

    // Audit log
    const putRequestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "call_report_writer",
      entityId: id,
      action: "bulk_replaced",
      performedBy: user.id,
      details: { ...putRequestContext, newValues: { writers: writers.map((w: WriterToReorder, i: number) => ({ id: w.id, display_order: i })) } },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return NextResponse.json({ message: "Writers reordered successfully" });
  } catch (error) {
    logger.error("Error in PUT /api/call-reports/[id]/writers:", error);
    return internalError();
  }
}
