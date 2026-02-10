import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

/**
 * PATCH /api/call-reports/[id]/writers/[writerId]
 * Update contact information for a specific writer
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; writerId: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

    const supabase = await createClient();
    const { id, writerId } = await params;
    const body = await request.json();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract update fields
    const { writer_email, writer_phone } = body;

    // Build update object
    const updateData: {
      writer_email?: string | null;
      writer_phone?: string | null;
    } = {};
    if (writer_email !== undefined) updateData.writer_email = writer_email || null;
    if (writer_phone !== undefined) updateData.writer_phone = writer_phone || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update writer
    const { data, error } = await supabase
      .from("call_report_writers")
      .update(updateData)
      .eq("call_report_id", id)
      .eq("writer_id", writerId)
      .select()
      .single();

    if (error) {
      logger.error("Error updating writer:", error);
      return NextResponse.json(
        { error: "Failed to update writer contact info" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Writer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Writer contact info updated successfully",
      writer: data
    });
  } catch (error) {
    logger.error("Error in PATCH /api/call-reports/[id]/writers/[writerId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/call-reports/[id]/writers/[writerId]
 * Remove a writer from a call report
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; writerId: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

    const supabase = await createClient();
    const { id, writerId } = await params;

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete writer from call report
    const { error } = await supabase
      .from("call_report_writers")
      .delete()
      .eq("call_report_id", id)
      .eq("writer_id", writerId);

    if (error) {
      logger.error("Error deleting writer:", error);
      return NextResponse.json(
        { error: "Failed to remove writer" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Writer removed successfully"
    });
  } catch (error) {
    logger.error("Error in DELETE /api/call-reports/[id]/writers/[writerId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
