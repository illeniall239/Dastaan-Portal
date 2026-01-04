import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { updateContractTermSchema } from "@/lib/validations/contract-terms";
import {
  applyRateLimit,
  addRateLimitHeaders,
} from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { revalidatePath } from 'next/cache';

/**
 * GET /api/negotiations/[id]
 * Fetch a single negotiation by ID
 */
export async function GET(
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

  try {
    const { data, error } = await supabase
      .from("negotiations")
      .select(
        `
        *,
        stories!inner(
          story_id,
          title,
          writer_originator_name,
          genre
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      logger.error("Error fetching negotiation", { error, context: "GET /api/contract-terms/[id]" });
      return NextResponse.json(
        { error: "Failed to fetch negotiation" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Negotiation not found" },
        { status: 404 }
      );
    }

    const res = NextResponse.json({ negotiation: data });
    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    logger.error(`Error in GET /api/negotiations/[id]: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/negotiations/[id]
 * Update an existing negotiation
 */
export async function PATCH(
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
    const validation = updateContractTermSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const updates = validation.data;

    const { data, error } = await supabase
      .from("negotiations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating negotiation", { error, context: "PATCH /api/contract-terms/[id]" });
      return NextResponse.json(
        { error: "Failed to update contract term" },
        { status: 500 }
      );
    }

    // Revalidate contract terms list pages to show updated term immediately
    revalidatePath('/content-department/contract-terms');
    revalidatePath('/evaluator/contract-terms');

    const res = NextResponse.json({
      message: "Contract term updated successfully",
      negotiation: data,
    });

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    logger.error(`Error in PATCH /api/negotiations/[id]: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/negotiations/[id]
 * Delete a negotiation
 */
export async function DELETE(
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

  // Check user role (only admin can delete)
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || userData.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden - Only admins can delete negotiations" },
      { status: 403 }
    );
  }

  try {
    const { error } = await supabase
      .from("negotiations")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Error deleting negotiation", { error, context: "DELETE /api/contract-terms/[id]" });
      return NextResponse.json(
        { error: "Failed to delete contract term" },
        { status: 500 }
      );
    }

    // Revalidate contract terms list pages to show deleted term removed immediately
    revalidatePath('/content-department/contract-terms');
    revalidatePath('/evaluator/contract-terms');

    const res = NextResponse.json({
      message: "Contract term deleted successfully",
    });

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    logger.error(`Error in DELETE /api/negotiations/[id]: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
