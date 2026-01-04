import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has permission (content_manager, evaluator, management, executive, or admin)
    if (!["content_manager", "evaluator", "management", "executive", "admin"].includes(userData.role)) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to update status" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Update the call report status
    const { data, error } = await supabase
      .from("call_reports")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating status:", error);
      return NextResponse.json(
        { error: "Failed to update status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    logger.error("Error in PATCH /api/call-reports/[id]/status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
