import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { episodicEvaluationSchema } from "@/lib/validations/episodic-evaluations";
import { episodicEvaluationsQuerySchema } from "@/lib/validations/query-params";
import { parsePaginationParams, applyPagination, createPaginatedResponse } from "@/lib/utils/pagination";
import { revalidatePath } from 'next/cache';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";
import { createNotifications, getUserIdsByRoles, excludeUserFromList } from "@/lib/notifications/server";

/**
 * POST /api/episodic-evaluations
 * Create a new episodic evaluation
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
    if (!rate.success) return rate.response!;

  // Check user role and evaluation access (use admin client to bypass RLS
  // on users table — the user is already authenticated above)
  const adminClient = createAdminClient();
  const { data: userData, error: userQueryError } = await adminClient
    .from("users")
    .select("role, can_evaluate")
    .eq("id", user.id)
    .single();

  if (userQueryError) {
    logger.error("User role query failed", { error: userQueryError, userId: user.id, context: "POST /api/episodic-evaluations" });
    return NextResponse.json(
      { error: "Failed to verify user permissions", details: userQueryError.message },
      { status: 500 }
    );
  }

  if (!userData || !["evaluator", "programmer", "admin", "management", "executive", "content_manager"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Only evaluators and management can create episodic evaluations" },
      { status: 403 }
    );
  }

  if ((userData as any).can_evaluate === false) {
    return NextResponse.json({ error: "Evaluation access has been revoked" }, { status: 403 });
  }

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

    // Check for duplicate evaluation
    // Programmers share one evaluation per episode as a team — block if any programmer already evaluated it
    // All other roles block only if the current user already evaluated it
    let duplicateQuery = adminClient
      .from("episodic_evaluations")
      .select("id, evaluator:users!evaluator_id(role)")
      .eq("episode_id", evaluationData.episode_id);

    if (userData.role !== "programmer") {
      duplicateQuery = (duplicateQuery as any).eq("evaluator_id", user.id);
    }

    if (evaluationData.revision_id) {
      duplicateQuery = duplicateQuery.eq("revision_id", evaluationData.revision_id);
    } else {
      duplicateQuery = duplicateQuery.is("revision_id", null);
    }

    if (evaluationData.cross_team_share_id) {
      duplicateQuery = duplicateQuery.eq("cross_team_share_id", evaluationData.cross_team_share_id);
    } else {
      duplicateQuery = duplicateQuery.is("cross_team_share_id", null);
    }

    const { data: existingEvals } = await duplicateQuery.limit(10);

    const existingEvaluation = userData.role === "programmer"
      ? (existingEvals || []).find((e: any) => e.evaluator?.role === "programmer")
      : (existingEvals || [])[0];

    if (existingEvaluation) {
      return NextResponse.json(
        { error: "This episode has already been evaluated" + (evaluationData.revision_id ? " for this revision" : "") + (userData.role === "programmer" ? " by the programming team" : "") },
        { status: 409 }
      );
    }

    // Insert episodic evaluation
    // Note: pages_score, scenes_score, overall_average, and overall_grade
    // will be auto-calculated by the database trigger
    const { data: evaluation, error: insertError } = await adminClient
      .from("episodic_evaluations")
      .insert({
        episode_id: evaluationData.episode_id,
        evaluator_id: user.id,
        revision_id: evaluationData.revision_id || null,
        cross_team_share_id: evaluationData.cross_team_share_id || null,
        no_of_pages: evaluationData.no_of_pages,
        no_of_scenes: evaluationData.no_of_scenes,
        events: evaluationData.events || [],
        freeze_ending_scene: evaluationData.freeze_ending_scene || null,
        summary_analysis: evaluationData.summary_analysis || null,
        remarks: evaluationData.remarks || null,
        // 9 scoring criteria
        conflict_of_content_score: evaluationData.conflict_of_content_score,
        characterization_score: evaluationData.characterization_score,
        story_progression_score: evaluationData.story_progression_score,
        main_event_score: evaluationData.main_event_score,
        small_event_score: evaluationData.small_event_score,
        dragness_score: evaluationData.dragness_score,
        freezes_score: evaluationData.freezes_score,
        whats_next_element_score: evaluationData.whats_next_element_score,
        overall_assessment_score: evaluationData.overall_assessment_score,
        // Per-criterion comments
        conflict_of_content_comment: evaluationData.conflict_of_content_comment || null,
        characterization_comment: evaluationData.characterization_comment || null,
        story_progression_comment: evaluationData.story_progression_comment || null,
        main_event_comment: evaluationData.main_event_comment || null,
        small_event_comment: evaluationData.small_event_comment || null,
        dragness_comment: evaluationData.dragness_comment || null,
        freezes_comment: evaluationData.freezes_comment || null,
        whats_next_element_comment: evaluationData.whats_next_element_comment || null,
        overall_assessment_comment: evaluationData.overall_assessment_comment || null,
        // Qualitative remarks
        scenes_remarks: evaluationData.scenes_remarks || null,
        characterization_remarks: evaluationData.characterization_remarks || null,
        time_spent_minutes: evaluationData.time_spent_minutes || null,
        started_at: evaluationData.started_at || null,
        // Final decision
        decision: evaluationData.decision || null,
        decision_notes: evaluationData.decision_notes || null,
        // Feedback communication
        feedback_text: evaluationData.feedback_text || null,
        feedback_attachment_url: evaluationData.feedback_attachment_url || null,
        feedback_attachment_name: evaluationData.feedback_attachment_name || null,
        feedback_attachments: evaluationData.feedback_attachments || [],
      })
      .select(`
        *,
        evaluator:users!evaluator_id(name, email),
        episode:episodes(
          *,
          call_report:call_reports(working_title, writer_name, call_report_writers(writer:writers(name), display_order)),
          story:stories(title, status)
        )
      `)
      .single();

    if (insertError) {
      logger.error("Error creating episodic evaluation", { error: insertError, context: "POST /api/episodic-evaluations" });
      return NextResponse.json(
        { error: insertError.message || "Failed to create episodic evaluation" },
        { status: 500 }
      );
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "episodic_evaluation",
      entityId: evaluation.id,
      action: "created",
      performedBy: user.id,
      details: { ...requestContext, newValues: { episode_id: evaluationData.episode_id, conflict_of_content_score: evaluationData.conflict_of_content_score, characterization_score: evaluationData.characterization_score, story_progression_score: evaluationData.story_progression_score, overall_assessment_score: evaluationData.overall_assessment_score } },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    // Notify the team about the new episodic evaluation (anonymous — no evaluator name revealed)
    try {
      const recipientIds = await getUserIdsByRoles(["management", "content_manager", "content_creator"]);
      const filtered = excludeUserFromList(recipientIds, user.id);
      if (filtered.length > 0) {
        const epNum = (evaluation.episode as any)?.episode_number;
        const dramaTitle = (evaluation.episode as any)?.call_report?.working_title || "Unknown";
        const epLabel = epNum ? `EP${epNum}` : "Episode";
        await createNotifications(
          filtered,
          "success",
          `New episodic evaluation: ${dramaTitle} — ${epLabel}`,
          `${epLabel} of "${dramaTitle}" has been evaluated. Review the scores in the evaluation section.`,
          "episode",
          evaluationData.episode_id,
          user.id
        );
      }
    } catch (notifErr) {
      logger.error("Failed to send episodic evaluation notifications", { error: notifErr });
    }

    // Revalidate evaluation list pages to show new evaluations immediately
    revalidatePath('/content-department/episodic-evaluations');
    revalidatePath('/evaluator/episodic-evaluations');

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
  try {
    const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

  // Check user role (use admin client to bypass RLS on users table)
  const adminClient2 = createAdminClient();
  const { data: userData, error: userQueryError } = await adminClient2
    .from("users")
    .select("role, team_id")
    .eq("id", user.id)
    .single();

  if (userQueryError) {
    logger.error("User role query failed", { error: userQueryError, userId: user.id, context: "GET /api/episodic-evaluations" });
    return NextResponse.json(
      { error: "Failed to verify user permissions", details: userQueryError.message },
      { status: 500 }
    );
  }

  if (!userData || !["evaluator", "programmer", "content_manager", "admin"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  // Determine if programmer is on a management team (use admin client to bypass RLS on teams)
  let isRestrictedProgrammer = false;
  if (userData.role === "programmer" && userData.team_id) {
    const adminClientForCheck = createAdminClient();
    const { data: team } = await adminClientForCheck
      .from("teams")
      .select("team_type")
      .eq("id", userData.team_id)
      .single();
    isRestrictedProgrammer = team?.team_type === "management";
  }

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
          call_report:call_reports(working_title, writer_name, call_report_writers(writer:writers(name), display_order)),
          story:stories(title, status)
        )
      `, { count: "exact" });

    // For evaluators, only show their own evaluations
    // For restricted programmers (management-team), show only their team's evaluations
    // For regular programmers, show all programmer-role evaluations
    // For content_manager and admin, show all
    if (userData.role === "evaluator") {
      query = query.eq("evaluator_id", user.id);
    } else if (userData.role === "programmer" && isRestrictedProgrammer && userData.team_id) {
      // Fetch team member IDs then filter
      const { data: teamMembers } = await supabase
        .from("users")
        .select("id")
        .eq("team_id", userData.team_id);
      const teamMemberIds = (teamMembers || []).map((u: any) => u.id);
      if (teamMemberIds.length > 0) {
        query = query.in("evaluator_id", teamMemberIds);
      } else {
        query = query.eq("evaluator_id", user.id);
      }
    } else if (userData.role === "programmer") {
      // Need to re-build query with !inner join on users to filter by their role
      query = supabase
        .from("episodic_evaluations")
        .select(`
          *,
          evaluator:users!evaluator_id!inner(name, email, role),
          episode:episodes(
            *,
            call_report:call_reports(working_title, writer_name, call_report_writers(writer:writers(name), display_order)),
            story:stories(title, status)
          )
        `, { count: "exact" })
        .eq("evaluator.role", "programmer");
    }

    // Apply filters
    if (episodeId) {
      query = query.eq("episode_id", episodeId);
    }

    // Apply pagination and sorting
    query = applyPagination(query, paginationParams);

    const { data: evaluations, error, count } = await query;

    if (error) {
      logger.error("Error fetching episodic evaluations", { error, context: "GET /api/episodic-evaluations" });
      return NextResponse.json(
        { error: "Failed to fetch episodic evaluations" },
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
