import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

/**
 * GET /api/episodic-evaluations/[id]
 * Get a single episodic evaluation by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
  if (!rate.success) return rate.response!;
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: evaluation, error } = await supabase
      .from("episodic_evaluations")
      .select(`
        *,
        evaluator:users!evaluator_id(name, email),
        episode:episodes(
          *,
          call_report:call_reports(working_title, writer_name),
          story:stories(title, status)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Episodic evaluation not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching episodic evaluation:", error);
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluation", details: error.message },
        { status: 500 }
      );
    }

    // Check if user has permission to view this evaluation
    // Evaluators can only view their own, managers and admins can view all
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const canView =
      evaluation.evaluator_id === user.id ||
      ["content_manager", "admin"].includes(userData.role);

    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to view this evaluation" },
        { status: 403 }
      );
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({ evaluation })), rate.result);

  } catch (error) {
    console.error("Unexpected error:", error);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

/**
 * DELETE /api/episodic-evaluations/[id]
 * Delete an episodic evaluation (only if evaluator owns it or admin)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.strict);
  if (!rate.success) return rate.response!;
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // Check if evaluation exists and get owner
    const { data: evaluation, error: fetchError } = await supabase
      .from("episodic_evaluations")
      .select("evaluator_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Episodic evaluation not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching episodic evaluation:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluation", details: fetchError.message },
        { status: 500 }
      );
    }

    // Check permissions: owner or admin
    const canDelete =
      evaluation.evaluator_id === user.id || userData.role === "admin";

    if (!canDelete) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to delete this evaluation" },
        { status: 403 }
      );
    }

    // Delete the evaluation
    const { error: deleteError } = await supabase
      .from("episodic_evaluations")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting episodic evaluation:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete episodic evaluation", details: deleteError.message },
        { status: 500 }
      );
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({
      message: "Episodic evaluation deleted successfully",
    })), rate.result);

  } catch (error) {
    console.error("Unexpected error:", error);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}

/**
 * PATCH /api/episodic-evaluations/[id]
 * Update an episodic evaluation (only if evaluator owns it or admin)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = await applyRateLimit(request, RateLimitPresets.strict);
  if (!rate.success) return rate.response!;
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // Ensure evaluation exists and get owner
    const { data: existing, error: fetchError } = await supabase
      .from("episodic_evaluations")
      .select("evaluator_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Episodic evaluation not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching episodic evaluation:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluation", details: fetchError.message },
        { status: 500 }
      );
    }

    // Only owner or admin can edit
    const canEdit = existing.evaluator_id === user.id || userData.role === "admin";
    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden - You don't have permission to edit this evaluation" },
        { status: 403 }
      );
    }

    const payload = await request.json();

    // Whitelist updatable fields
    const updatable: Record<string, any> = {};
    const allowedFields = [
      "no_of_pages",
      "no_of_scenes",
      "events",
      "conflict_of_content_score",
      "characterization_score",
      "story_progression_score",
      "freezes_score",
      "whats_next_element_score",
      "overall_average",
      "overall_grade",
      "comments",
    ];
    for (const key of allowedFields) {
      if (key in payload) updatable[key] = payload[key];
    }
    updatable.updated_at = new Date().toISOString();

    const { error: updateError, data: updated } = await supabase
      .from("episodic_evaluations")
      .update(updatable)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating episodic evaluation:", updateError);
      return NextResponse.json(
        { error: "Failed to update episodic evaluation", details: updateError.message },
        { status: 500 }
      );
    }

    return addRateLimitHeaders(withCors(request, NextResponse.json({ evaluation: updated })), rate.result);
  } catch (error) {
    console.error("Unexpected error:", error);
    return withCors(request, NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    ));
  }
}