import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { episodicEvaluationSchema } from "@/lib/validations/episodic-evaluations";
import { episodicEvaluationsQuerySchema } from "@/lib/validations/query-params";
import { parsePaginationParams, applyPagination, createPaginatedResponse } from "@/lib/utils/pagination";

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
        summary_analysis: evaluationData.summary_analysis || null,
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
      logger.error(`Error creating episodic evaluation:: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
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
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/episodic-evaluations
 * List episodic evaluations for current evaluator
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Field to sort by (default: submitted_at)
 * - sortOrder: asc or desc (default: desc)
 * - episode_id: Filter by episode
 */
export async function GET(request: NextRequest) {
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
    // Parse pagination parameters
    const paginationParams = parsePaginationParams(request);

    // Parse and validate filter parameters
    const { searchParams } = request.nextUrl;
    const rawFilters = {
      episode_id: searchParams.get("episode_id") || undefined,
    };

    // Validate query parameters
    const validation = episodicEvaluationsQuerySchema.safeParse(rawFilters);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const episodeId = validation.data.episode_id;

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

    // Apply pagination and sorting
    query = applyPagination(query, paginationParams);

    const { data: evaluations, error, count } = await query;

    if (error) {
      logger.error(`Error fetching episodic evaluations: ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluations", details: error.message },
        { status: 500 }
      );
    }

    // Create standardized paginated response
    const response = createPaginatedResponse(
      evaluations || [],
      paginationParams.page,
      paginationParams.limit,
      count || 0
    );

    return NextResponse.json(response);

  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
