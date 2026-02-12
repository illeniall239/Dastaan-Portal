import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/meetings/[id] - Fetch a single meeting
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: meeting, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    logger.error("Meeting GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meetings/[id] - Update a meeting
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      "title",
      "meeting_date",
      "duration_minutes",
      "location",
      "notes",
      "agenda",
      "contact_name",
      "contact_email",
      "contact_phone",
      "contact_type",
      "attendees",
      "category",
      "status",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updateData.updated_by = user.id;

    const { data: meeting, error } = await supabase
      .from("meetings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating meeting:", error);
      return NextResponse.json(
        { error: "Failed to update meeting" },
        { status: 500 }
      );
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "meeting",
      entityId: id,
      action: "updated",
      performedBy: user.id,
      details: { ...requestContext, newValues: updateData },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return NextResponse.json({ meeting });
  } catch (error) {
    logger.error("Meeting PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meetings/[id] - Delete a meeting
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("meetings").delete().eq("id", id);

    if (error) {
      logger.error("Error deleting meeting:", error);
      return NextResponse.json(
        { error: "Failed to delete meeting" },
        { status: 500 }
      );
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "meeting",
      entityId: id,
      action: "deleted",
      performedBy: user.id,
      details: { ...requestContext },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Meeting DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
