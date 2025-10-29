import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  applyRateLimit,
  addRateLimitHeaders,
} from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

const failSchema = z.object({
  failed_reason: z
    .string()
    .min(1, "Failed reason is required")
    .max(1000, "Failed reason must not exceed 1000 characters"),
});

/**
 * POST /api/negotiations/[id]/fail
 * Mark a negotiation as failed
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const validation = failSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const { failed_reason } = validation.data;

    // Update negotiation status to 'failed'
    const { data, error } = await supabase
      .from("negotiations")
      .update({
        status: "failed",
        failed_reason,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error marking negotiation as failed:", error);
      return NextResponse.json(
        {
          error: "Failed to mark negotiation as failed",
          details: error.message,
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

    // Update story status to 'rejected'
    const { error: storyError } = await supabase
      .from("stories")
      .update({
        status: "rejected",
        current_stage: "rejected",
      })
      .eq("id", data.story_id);

    if (storyError) {
      console.error("Error updating story status:", storyError);
      // Continue even if story update fails
    }

    const res = NextResponse.json({
      message: "Negotiation marked as failed successfully",
      negotiation: data,
    });

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    console.error("Error in POST /api/negotiations/[id]/fail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
