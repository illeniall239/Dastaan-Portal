import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateNegotiationSchema } from "@/lib/validations/negotiations";
import {
  applyRateLimit,
  addRateLimitHeaders,
} from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

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
      console.error("Error fetching negotiation:", error);
      return NextResponse.json(
        { error: "Failed to fetch negotiation", details: error.message },
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
    console.error("Error in GET /api/negotiations/[id]:", error);
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
    const validation = updateNegotiationSchema.safeParse(body);

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
      console.error("Error updating negotiation:", error);
      return NextResponse.json(
        { error: "Failed to update negotiation", details: error.message },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      message: "Negotiation updated successfully",
      negotiation: data,
    });

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    console.error("Error in PATCH /api/negotiations/[id]:", error);
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
      console.error("Error deleting negotiation:", error);
      return NextResponse.json(
        { error: "Failed to delete negotiation", details: error.message },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      message: "Negotiation deleted successfully",
    });

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    console.error("Error in DELETE /api/negotiations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
