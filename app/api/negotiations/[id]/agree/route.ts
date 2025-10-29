import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  applyRateLimit,
  addRateLimitHeaders,
} from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

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
      console.error("Error marking negotiation as agreed:", error);
      return NextResponse.json(
        {
          error: "Failed to mark negotiation as agreed",
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

    // Update story status to 'in_legal_review'
    const { error: storyError } = await supabase
      .from("stories")
      .update({
        status: "in_legal_review",
        current_stage: "legal_review",
      })
      .eq("id", data.story_id);

    if (storyError) {
      console.error("Error updating story status:", storyError);
      // Continue even if story update fails
    }

    const res = NextResponse.json({
      message: "Negotiation marked as agreed successfully",
      negotiation: data,
    });

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    console.error("Error in POST /api/negotiations/[id]/agree:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
