import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireApiAuth } from "@/lib/api/auth";
import { applyRateLimit, addRateLimitHeaders } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.standard);
    if (!rate.success) return rate.response!;

    const auth = await requireApiAuth([
      "content_manager", "evaluator", "programmer", "management", "executive"
    ]);
    if (!auth.success) return auth.response;

    // Parse request body
    const body = await request.json();
    const { status, remarks } = body;

    if (!status && remarks === undefined) {
      return NextResponse.json(
        { error: "Status or remarks is required" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString()
    };
    if (status) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    // Update the call report using server client (RLS allows updates for authenticated users with correct role)
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("call_reports")
      .update(updateData)
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

    return addRateLimitHeaders(
      NextResponse.json({ success: true, data }),
      rate.result
    );

  } catch (error) {
    logger.error("Error in PATCH /api/call-reports/[id]/status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
