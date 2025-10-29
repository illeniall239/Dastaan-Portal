import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { episodicEvaluationSchema } from "@/lib/validations/episodic-evaluations";

/**
 * POST /api/episodic-evaluations
 * Create a new episodic evaluation
 */
export async function POST(request: Request) {
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

  if (!userData || !["evaluator", "admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Only evaluators can create episodic evaluations" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const validation = episodicEvaluationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const evaluationData = validation.data;

    // Check if episode exists
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("id")
      .eq("id", evaluationData.episode_id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: "Episode not found" },
        { status: 404 }
      );
    }

    // Check if evaluator has already evaluated this episode
    const { data: existingEvaluation } = await supabase
      .from("episodic_evaluations")
      .select("id")
      .eq("episode_id", evaluationData.episode_id)
      .eq("evaluator_id", user.id)
      .maybeSingle();

    if (existingEvaluation) {
      return NextResponse.json(
        { error: "You have already evaluated this episode" },
        { status: 409 }
      );
    }

    // Insert episodic evaluation
    // Note: pages_score, scenes_score, overall_average, and overall_grade
    // will be auto-calculated by the database trigger
    const { data: evaluation, error: insertError } = await supabase
      .from("episodic_evaluations")
      .insert({
        episode_id: evaluationData.episode_id,
        evaluator_id: user.id,
        no_of_pages: evaluationData.no_of_pages,
        no_of_scenes: evaluationData.no_of_scenes,
        events: evaluationData.events || [],
        conflict_of_content_score: evaluationData.conflict_of_content_score,
        characterization_score: evaluationData.characterization_score,
        story_progression_score: evaluationData.story_progression_score,
        freezes_score: evaluationData.freezes_score,
        whats_next_element_score: evaluationData.whats_next_element_score,
      })
      .select(`
        *,
        evaluator:users!evaluator_id(name, email),
        episode:episodes(
          *,
          call_report:call_reports(working_title, writer_name),
          story:stories(title, status)
        )
      `)
      .single();

    if (insertError) {
      console.error("Error creating episodic evaluation:", insertError);
      return NextResponse.json(
        { error: "Failed to create episodic evaluation", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Episodic evaluation created successfully",
        evaluation,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/episodic-evaluations
 * List episodic evaluations for current evaluator
 */
export async function GET(request: Request) {
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

  if (!userData || !["evaluator", "content_manager", "admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get("episode_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("episodic_evaluations")
      .select(`
        *,
        evaluator:users!evaluator_id(name, email),
        episode:episodes(
          *,
          call_report:call_reports(working_title, writer_name),
          story:stories(title, status)
        )
      `, { count: "exact" });

    // For evaluators, only show their own evaluations
    // For content_manager and admin, show all
    if (userData.role === "evaluator") {
      query = query.eq("evaluator_id", user.id);
    }

    // Apply filters
    if (episodeId) {
      query = query.eq("episode_id", episodeId);
    }

    // Apply sorting and pagination
    query = query
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: evaluations, error, count } = await query;

    if (error) {
      console.error("Error fetching episodic evaluations:", error);
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluations", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      evaluations,
      total: count,
      limit,
      offset,
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
