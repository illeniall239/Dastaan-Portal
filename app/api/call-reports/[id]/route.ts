import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { updateCallReportSchema } from "@/lib/validations/call-reports";

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
      logger.error(`Error fetching call report: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        { error: "Failed to fetch call report", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ callReport });
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

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // First, check if call report exists and get owner
    const { data: existing, error: fetchError } = await supabase
      .from("call_reports")
      .select("created_by")
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

    // Check permissions: owner or manager/admin
    const canEdit =
      existing.created_by === user.id ||
      ["content_manager", "admin"].includes(userData.role);

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

    const updates = validation.data;

    // Update call report
    const { data: updatedCallReport, error: updateError } = await supabase
      .from("call_reports")
      .update(updates)
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
