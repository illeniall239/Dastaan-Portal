import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  applyRateLimit,
  addRateLimitHeaders,
} from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";

const agreeSchema = z.object({
  agreed_price: z.number().positive("Agreed price must be positive"),
  agreed_terms: z
    .string()
    .min(1, "Agreed terms are required")
    .max(5000, "Agreed terms must not exceed 5000 characters"),
});

/**
 * POST /api/negotiations/[id]/agree
 * Mark a negotiation as agreed
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !userData ||
    !["content_manager", "evaluator", "admin"].includes(userData.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validation = agreeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const { agreed_price, agreed_terms } = validation.data;

    // Update negotiation status to 'agreed'
    const { data, error } = await supabase
      .from("negotiations")
      .update({
        status: "agreed",
        agreed_price,
        agreed_terms,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error marking negotiation as agreed", { error, context: "POST /api/contract-terms/[id]/agree" });
      return NextResponse.json(
        {
          error: "Failed to mark negotiation as agreed",
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Negotiation not found" },
        { status: 404 }
      );
    }

    // Update story status to 'in_legal_review'
    const { error: storyError } = await supabase
      .from("stories")
      .update({
        status: "in_legal_review",
        current_stage: "legal_review",
      })
      .eq("id", data.story_id);

    if (storyError) {
      logger.error("Error updating story status", { error: storyError, context: "POST /api/contract-terms/[id]/agree" });
      // Continue even if story update fails
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "negotiation",
      entityId: id,
      action: "agreed",
      performedBy: user.id,
      details: { ...requestContext, newValues: { agreed_price, agreed_terms, status: "agreed" } },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    const res = NextResponse.json({
      message: "Negotiation marked as agreed successfully",
      negotiation: data,
    });

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    logger.error("Error in POST /api/contract-terms/[id]/agree", { error, context: "POST /api/contract-terms/[id]/agree" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
