import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { z } from "zod";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

const approvalSchema = z.object({
  approval_status: z.enum(["approved", "rejected", "needs_revision"]),
});

/**
 * PATCH /api/episodes/[id]/approval
 * Set the approval status of an episode
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const { id } = await params;

  const paramValidation = idParamSchema.safeParse({ id });
  if (!paramValidation.success) {
    return NextResponse.json(
      { error: "Invalid ID format" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role — only content_manager, management, and admin can approve
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["content_manager", "management", "admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden: Only content managers, management, and admins can set approval status" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = approvalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("episodes")
      .update({
        approval_status: parsed.data.approval_status,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error setting approval status:", error);
      return NextResponse.json({ error: "Failed to update approval status" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Audit log the approval action
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "episode",
      entityId: id,
      action: "approval_set",
      performedBy: user.id,
      details: {
        ...requestContext,
        newValues: { approval_status: parsed.data.approval_status },
      },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    logger.error("Error in PATCH /api/episodes/[id]/approval:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
