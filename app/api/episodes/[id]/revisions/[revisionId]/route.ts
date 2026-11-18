import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { idParamSchema } from "@/lib/validations/uuid-params";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/episodes/[id]/revisions/[revisionId]
 * Update initial assessment for an episode revision
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> }
) {
  const { id, revisionId } = await params;

  const idValidation = idParamSchema.safeParse({ id });
  const revisionIdValidation = idParamSchema.safeParse({ id: revisionId });
  if (!idValidation.success || !revisionIdValidation.success) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  try {
    // Check user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !userData?.role ||
      !["content_manager", "content_creator", "admin", "management", "programmer", "gcm"].includes(userData.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updatePayload: Record<string, any> = {};

    // Handle initial_assessment
    if (body.initial_assessment !== undefined) {
      const score = body.initial_assessment;
      if (typeof score !== "number" || score < 1 || score > 10) {
        return NextResponse.json(
          { error: "initial_assessment must be a number between 1 and 10" },
          { status: 400 }
        );
      }
      updatePayload.initial_assessment = score;
      updatePayload.assessed_by = user.id;
      updatePayload.assessed_at = new Date().toISOString();
    }

    // Handle original_submission_date
    if ("original_submission_date" in body) {
      const dateVal = body.original_submission_date;
      if (dateVal !== null && (typeof dateVal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateVal))) {
        return NextResponse.json(
          { error: "original_submission_date must be a YYYY-MM-DD string or null" },
          { status: 400 }
        );
      }
      updatePayload.original_submission_date = dateVal;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: revision, error } = await supabase
      .from("episode_revisions")
      .update(updatePayload)
      .eq("id", revisionId)
      .eq("episode_id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating episode revision assessment:", error);
      return NextResponse.json(
        { error: "Failed to update assessment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ revision });
  } catch (error) {
    logger.error("Error in PATCH /api/episodes/[id]/revisions/[revisionId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
