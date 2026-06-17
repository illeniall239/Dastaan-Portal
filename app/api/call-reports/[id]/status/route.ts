import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireApiAuth } from "@/lib/api/auth";
import { applyRateLimit, addRateLimitHeaders } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requireApiAuth([
      "content_manager", "evaluator", "programmer", "management", "executive"
    ]);
    if (!auth.success) return auth.response;

    const rate = await applyRateLimit(request, RateLimitPresets.standard, auth.user.id);
    if (!rate.success) return rate.response!;

    // Parse request body
    const body = await request.json();
    const { status, remarks } = body;

    if (status === undefined && remarks === undefined) {
      return NextResponse.json(
        { error: "Status or remarks is required" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, string | null> = {
      updated_at: new Date().toISOString()
    };
    if (status !== undefined) updateData.status = status || null;
    if (remarks !== undefined) updateData.remarks = remarks || null;

    // Update the call report using admin client to bypass the restrictive RLS UPDATE policy
    // (RLS only allows content_manager/admin/creator; management & programmer are blocked via RLS but allowed here)
    const supabase = createAdminClient();
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

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "call_report",
      entityId: id,
      action: "status_changed",
      performedBy: auth.user.id,
      details: { ...requestContext, newValues: { status, remarks } },
    }).catch(err => logger.error("Audit log failed", { error: err }));

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
