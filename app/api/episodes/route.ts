import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMultipleEpisodesSchema, episodesQuerySchema } from "@/lib/validations/episodes";
import { withApiPerf, applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { parsePaginationParams, applyPagination, createPaginatedResponse } from "@/lib/utils/pagination";
import { revalidatePath } from 'next/cache';
import { logAuditAction, getRequestContext } from "@/lib/audit/server";
import { createNotifications, getUserIdsByRoles } from "@/lib/notifications/server";
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
  conflictError,
  handleDatabaseError,
  handleValidationError,
  createSuccessResponse,
  internalError,
} from "@/lib/api/errors";

// Force dynamic rendering - prevent Vercel/Next.js from caching GET responses
export const dynamic = 'force-dynamic';

/**
 * POST /api/episodes
 * Create one or multiple episodes
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorizedError();
  }

  // Rate limit POSTs (creation)
  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  // Get user data including team_id for team isolation
  const { data: userData } = await supabase
    .from("users")
    .select("team_id, role, name")
    .eq("id", user.id)
    .single();

  if (!userData || !["content_creator", "content_manager", "gcm", "evaluator", "programmer", "admin"].includes(userData.role)) {
    return forbiddenError();
  }

  const hasGlobalAccess = userData.role && ['admin', 'management', 'programmer'].includes(userData.role);

  try {
    const body = await request.json();
    const validation = createMultipleEpisodesSchema.safeParse(body);

    if (!validation.success) {
      return handleValidationError(validation.error);
    }

    const { call_report_id, story_id, episodes } = validation.data;

    // Verify the source exists and capture title info for notifications
    let storyTitle: string | null = null;
    let writerName: string | null = null;

    if (story_id) {
      const { data: storyExists, error: storyCheckError } = await supabase
        .from("stories")
        .select("id, story_id, working_title, writer_name")
        .eq("id", story_id)
        .single();

      if (storyCheckError || !storyExists) {
        return notFoundError("Story");
      }
      storyTitle = (storyExists as any).working_title || null;
      writerName = (storyExists as any).writer_name || null;
    } else if (call_report_id) {
      const { data: callReportExists, error: crCheckError } = await supabase
        .from("call_reports")
        .select("id, call_report_id, working_title, writer_name")
        .eq("id", call_report_id)
        .single();

      if (crCheckError || !callReportExists) {
        return notFoundError("Call report");
      }
      storyTitle = callReportExists.working_title || null;
      writerName = callReportExists.writer_name || null;
    }

    // Check for duplicate episode numbers within the incoming batch
    const episodeNumbers = episodes.map(ep => ep.episode_number);
    const duplicatesInBatch = episodeNumbers.filter((num, idx) =>
      episodeNumbers.indexOf(num) !== idx
    );

    if (duplicatesInBatch.length > 0) {
      const uniqueDuplicates = [...new Set(duplicatesInBatch)].sort((a, b) => a - b);
      return validationError(
        "Duplicate episode numbers in submission",
        { duplicates: uniqueDuplicates }
      );
    }

    // Check for existing current episodes in database
    // Must filter by is_current=true to avoid false positives from superseded versions
    let existingQuery = supabase
      .from("episodes")
      .select("episode_number")
      .in("episode_number", episodeNumbers)
      .eq("is_current", true);

    if (call_report_id) {
      existingQuery = existingQuery.eq("call_report_id", call_report_id);
    } else if (story_id) {
      existingQuery = existingQuery.eq("story_id", story_id);
    }

    const { data: existingEpisodes, error: checkError } = await existingQuery;

    // Log if there's an error checking for existing episodes (might be RLS issue)
    if (checkError) {
      logger.warn(`Error checking for existing episodes: ${checkError.message}. Proceeding with insert - constraint will catch duplicates.`);
    }

    if (existingEpisodes && existingEpisodes.length > 0) {
      const existingNumbers = existingEpisodes.map(ep => ep.episode_number).sort((a, b) => a - b);
      return conflictError(
        `Episode number(s) ${existingNumbers.join(', ')} already exist for this project`,
        { existingNumbers }
      );
    }

    // Prepare episodes for insertion
    const episodesToInsert = episodes.map((episode) => ({
      call_report_id: call_report_id || null,
      story_id: story_id || null,
      episode_number: episode.episode_number,
      title: episode.title || null,
      attachment_url: episode.attachment_url || null,
      attachment_name: episode.attachment_name || null,
      attachment_type: episode.attachment_type || null,
      additional_info: episode.additional_info || null,
      initial_assessment: episode.initial_assessment || null,
      original_submission_date: (episode as any).original_submission_date || null,
      logged_by: user.id,
    }));

    // Insert episodes
    const { data: createdEpisodes, error } = await supabase
      .from("episodes")
      .insert(episodesToInsert)
      .select();

    if (error) {
      logger.error(`Error creating episodes:`, error);
      logger.error(`Attempted to create episodes for story_id: ${story_id}, call_report_id: ${call_report_id}`);
      logger.error(`Episode numbers attempted: ${episodeNumbers.join(', ')}`);
      logger.error("Full Supabase error:", JSON.stringify(error, null, 2));

      // Handle unique constraint violation for duplicate episode numbers
      // Check both old constraint names and new version-aware constraint names
      if (error.code === '23505' && (
        error.message.includes('unique_episode_per_call_report') ||
        error.message.includes('unique_episode_per_story') ||
        error.message.includes('unique_episode_version_per_call_report') ||
        error.message.includes('unique_episode_version_per_story') ||
        error.message.includes('idx_one_current_per_')
      )) {
        // Try to fetch existing current episodes to provide better error message
        let conflictQuery = supabase
          .from("episodes")
          .select("episode_number")
          .in("episode_number", episodeNumbers)
          .eq("is_current", true);

        if (call_report_id) {
          conflictQuery = conflictQuery.eq("call_report_id", call_report_id);
        } else if (story_id) {
          conflictQuery = conflictQuery.eq("story_id", story_id);
        }

        const { data: conflictingEpisodes } = await conflictQuery;

        if (conflictingEpisodes && conflictingEpisodes.length > 0) {
          const conflictingNumbers = conflictingEpisodes.map(ep => ep.episode_number).sort((a, b) => a - b);
          return conflictError(
            `Episode number(s) ${conflictingNumbers.join(', ')} already exist for this ${call_report_id ? 'call report' : 'story'}`,
            { conflictingNumbers }
          );
        } else {
          // Episodes exist but might be hidden by RLS - provide helpful message
          return conflictError(
            `One or more episode numbers already exist but may not be visible due to permissions`,
            { attemptedNumbers: episodeNumbers.sort((a, b) => a - b) }
          );
        }
      }

      return handleDatabaseError(error, "creating episodes");
    }

    // Audit log each created episode
    const requestContext = getRequestContext(request);
    for (const ep of createdEpisodes) {
      await logAuditAction({
        entityType: "episode",
        entityId: ep.id,
        action: "created",
        performedBy: user.id,
        details: {
          ...requestContext,
          newValues: {
            episode_number: ep.episode_number,
            title: ep.title,
            call_report_id: ep.call_report_id,
            story_id: ep.story_id,
          },
        },
      }).catch(err => logger.error("Audit log failed", { error: err }));
    }

    // Notify team head + management when episodes are logged
    try {
      const adminClient = createAdminClient();
      const teamId = userData.team_id;
      const recipientSet = new Set<string>();

      // Notify the team head of the creator's team
      if (teamId) {
        const { data: teamRecord } = await adminClient
          .from("teams")
          .select("team_head_id")
          .eq("id", teamId)
          .single();
        if (teamRecord?.team_head_id) {
          recipientSet.add(teamRecord.team_head_id);
        }
      }

      // Always notify management, content managers, and programmers
      const mgmtIds = await getUserIdsByRoles(["management", "content_manager", "programmer"]);
      mgmtIds.forEach(id => recipientSet.add(id));

      // Exclude the creator
      recipientSet.delete(user.id);

      const recipients = Array.from(recipientSet);
      if (recipients.length > 0) {
        const count = createdEpisodes.length;
        const epNumbers = createdEpisodes.map(ep => `EP${ep.episode_number}`).join(", ");
        const loggedByName = (userData as any)?.name || "Someone";
        const storyLabel = storyTitle ? ` for "${storyTitle}"` : "";
        const writerLabel = writerName ? ` (writer: ${writerName})` : "";

        await createNotifications(
          recipients,
          "info",
          `New episode${count > 1 ? "s" : ""} logged: ${epNumbers}${storyLabel}`,
          `${loggedByName} logged ${count} episode${count > 1 ? "s" : ""} (${epNumbers})${storyLabel}${writerLabel}.`,
          "episode",
          createdEpisodes[0].id,
          user.id
        );
      }
    } catch (notifErr) {
      logger.error("Failed to send episode creation notifications", { error: notifErr });
    }

    const res = NextResponse.json({
      message: `Successfully created ${createdEpisodes.length} episode(s)`,
      episodes: createdEpisodes,
    }, { status: 201 });

    // Revalidate episode list pages to show new episodes immediately
    revalidatePath('/content-department/episodes');
    revalidatePath('/evaluator/episodes');

    return addRateLimitHeaders(withCors(request, res), rate.result);

  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, internalError());
  }
}

/**
 * GET /api/episodes
 * List episodes with optional filters
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Field to sort by (default: created_at)
 * - sortOrder: asc or desc (default: desc)
 * - call_report_id: Filter by call report
 * - story_id: Filter by story
 * - logged_by: Filter by user who logged the episode
 * - episode_number: Filter by episode number
 * - group_by_project: If "true", paginate by projects instead of episodes
 * - project_limit: Number of projects to fetch (default: 20, used with group_by_project)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorizedError();
  }

  // Rate limit GETs listing/search
  const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
  if (!rate.success) return rate.response!;

  // Get user data including team_id for team isolation
  const { data: userData } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  if (!userData || !["content_creator", "content_manager", "gcm", "evaluator", "programmer", "executive", "management", "admin"].includes(userData.role)) {
    return forbiddenError();
  }

  const hasGlobalAccess = userData.role && ['admin', 'management', 'programmer'].includes(userData.role);

  try {
    // Parse pagination parameters (page, limit, sortBy, sortOrder)
    // Override default sortBy for episodes to use episode_number instead of created_at
    const paginationParams = parsePaginationParams(request, {
      sortBy: "episode_number",
      sortOrder: "asc"
    });

    // Parse and validate filter parameters
    const { searchParams } = request.nextUrl;
    const rawFilters = {
      call_report_id: searchParams.get("call_report_id") || undefined,
      story_id: searchParams.get("story_id") || undefined,
      logged_by: searchParams.get("logged_by") || undefined,
      episode_number: searchParams.get("episode_number") || undefined,
    };

    // Check if client wants evaluation status included (for performance optimization)
    const includeEvaluationStatus = searchParams.get("include_evaluation_status") === "true";

    // Version filtering: default to current versions only
    const currentOnly = searchParams.get("current_only") !== "false";

    // Validate query parameters
    const validation = episodesQuerySchema.safeParse(rawFilters);
    if (!validation.success) {
      return addRateLimitHeaders(
        withCors(request, handleValidationError(validation.error)),
        rate.result
      );
    }

    const filters = validation.data;

    // Check for project-based pagination mode
    const groupByProject = searchParams.get("group_by_project") === "true";
    const projectLimit = Math.min(50, Math.max(1, parseInt(searchParams.get("project_limit") || "20", 10)));
    const projectPage = Math.max(1, parseInt(searchParams.get("project_page") || "1", 10));

    interface EpisodeData {
      id: string;
      episode_number: number;
      title: string | null;
      call_report_id: string | null;
      story_id: string | null;
      attachment_url: string | null;
      attachment_name: string | null;
      attachment_type: string | null;
      additional_info: string | null;
      logged_by: string;
      created_at: string;
      updated_at: string;
      average_initial_assessment?: number | null;
      assessment_count?: number | null;
      logged_by_user?: {
        name: string;
        email: string;
      };
      call_report?: {
        working_title: string;
        writer_name: string;
        team_id: string;
        call_report_writers?: Array<{
          writer_id: string;
          display_order: number;
          writer: {
            name: string;
          } | null;
        }>;
        writer_names?: string[];
      };
      story?: {
        title: string;
        status: string;
      };
      is_evaluated?: boolean;
      evaluated_by_name?: string | null;
    }

    let episodes: EpisodeData[] = [];
    let count: number | null = 0;
    let totalProjects = 0;
    let hasMoreProjects = false;

    if (groupByProject && !filters.call_report_id && !filters.story_id) {
      // Project-based pagination: fetch projects first, then all episodes for those projects

      // Step 1: Get distinct call_report_ids with pagination
      const projectOffset = (projectPage - 1) * projectLimit;

      // Get total count of distinct projects with team filtering
      let allProjectsQuery = supabase
        .from("episodes")
        .select(`
          call_report_id,
          call_report:call_reports!inner(team_id)
        `)
        .not("call_report_id", "is", null)
        .eq("is_current", true);

      // TEAM ISOLATION: Filter through call_reports.team_id
      if (!hasGlobalAccess && userData.team_id) {
        allProjectsQuery = allProjectsQuery.eq("call_report.team_id", userData.team_id);
      }

      const { data: allProjectIds, error: countError } = await allProjectsQuery;

      if (countError) {
        logger.error(`Error counting projects: ${countError.message}`);
        return handleDatabaseError(countError, "counting projects");
      }

      interface ProjectIdEntry {
        call_report_id: string | null;
      }

      // Get unique project IDs
      const uniqueProjectIds = [...new Set((allProjectIds || []).map((e: ProjectIdEntry) => e.call_report_id).filter((id): id is string => id !== null))];
      totalProjects = uniqueProjectIds.length;

      // Get paginated project IDs (we need to sort them somehow - by most recent episode)
      let paginatedProjectsQuery = supabase
        .from("episodes")
        .select(`
          call_report_id,
          created_at,
          call_report:call_reports!inner(team_id)
        `)
        .not("call_report_id", "is", null)
        .eq("is_current", true)
        .order("created_at", { ascending: false });

      // TEAM ISOLATION: Filter through call_reports.team_id
      if (!hasGlobalAccess && userData.team_id) {
        paginatedProjectsQuery = paginatedProjectsQuery.eq("call_report.team_id", userData.team_id);
      }

      const { data: paginatedProjects, error: projectError } = await paginatedProjectsQuery;

      if (projectError) {
        logger.error(`Error fetching projects: ${projectError.message}`);
        return handleDatabaseError(projectError, "fetching projects");
      }

      // Get unique project IDs in order of most recent episode
      const seenProjects = new Set<string>();
      const orderedProjectIds: string[] = [];
      for (const ep of paginatedProjects || []) {
        if (ep.call_report_id && !seenProjects.has(ep.call_report_id)) {
          seenProjects.add(ep.call_report_id);
          orderedProjectIds.push(ep.call_report_id);
        }
      }

      // Slice for current page
      const projectIdsForPage = orderedProjectIds.slice(projectOffset, projectOffset + projectLimit);
      hasMoreProjects = projectOffset + projectLimit < orderedProjectIds.length;

      if (projectIdsForPage.length === 0) {
        // No projects on this page
        episodes = [];
        count = 0;
      } else {
        // Step 2: Fetch ALL episodes for these projects (no episode limit)
        let projectEpisodesQuery = supabase
          .from("episodes")
          .select(`
            *,
            logged_by_user:users!logged_by(name, email),
            call_report:call_reports!inner(
              working_title,
              writer_name,
              team_id,
              original_submission_date,
              call_report_writers:call_report_writers(
                writer_id,
                display_order,
                writer:writers(name)
              )
            ),
            story:stories(title, status)
          `, { count: "exact" })
          .in("call_report_id", projectIdsForPage)
          .eq("is_current", true)
          .order("episode_number", { ascending: true });

        // TEAM ISOLATION: Double-check team filter (should already be filtered by projectIdsForPage)
        if (!hasGlobalAccess && userData.team_id) {
          projectEpisodesQuery = projectEpisodesQuery.eq("call_report.team_id", userData.team_id);
        }

        const { data: projectEpisodes, error: episodesError, count: episodeCount } = await projectEpisodesQuery;

        if (episodesError) {
          logger.error(`Error fetching episodes: ${episodesError.message}`);
          return handleDatabaseError(episodesError, "fetching episodes");
        }

        episodes = projectEpisodes || [];
        count = episodeCount;
      }
    } else {
      // Standard episode-based pagination (original behavior)
      // Build query - include call_report_writers to support multi-writer display
      let query = supabase
        .from("episodes")
        .select(`
          *,
          logged_by_user:users!logged_by(name, email),
          call_report:call_reports(
            working_title,
            writer_name,
            team_id,
            original_submission_date,
            call_report_writers:call_report_writers(
              writer_id,
              display_order,
              writer:writers(name)
            )
          ),
          story:stories(title, status)
        `, { count: "exact" });

      // Apply filters
      if (currentOnly) {
        query = query.eq("is_current", true);
      }
      if (filters.call_report_id) {
        query = query.eq("call_report_id", filters.call_report_id);
      }
      if (filters.story_id) {
        query = query.eq("story_id", filters.story_id);
      }
      if (filters.logged_by) {
        query = query.eq("logged_by", filters.logged_by);
      }
      if (filters.episode_number) {
        query = query.eq("episode_number", filters.episode_number);
      }

      // TEAM ISOLATION: Filter episodes through call_reports.team_id
      // Only apply if not already filtered by specific call_report_id or story_id
      if (!hasGlobalAccess && userData.team_id && !filters.call_report_id && !filters.story_id) {
        query = query.eq("call_report.team_id", userData.team_id);
      }

      // Apply pagination and sorting
      query = applyPagination(query, paginationParams);

      const result = await query;

      if (result.error) {
        logger.error(`Error fetching episodes: ${result.error.message}`);
        return handleDatabaseError(result.error, "fetching episodes");
      }

      episodes = result.data || [];
      count = result.count;
    }

    // Fetch evaluation status if requested (single batch query instead of N+1)
    let evaluationStatusMap: Record<string, { evaluated: boolean; evaluatedByName?: string }> = {};
    if (includeEvaluationStatus && episodes && episodes.length > 0) {
      const episodeIds = episodes.map((ep) => ep.id);

      if (userData.role === "programmer" || userData.role === "management") {
        // Check if user is on a management-type team (team-isolated evaluations)
        let isManagementTeam = false;
        let teamMemberIds: string[] = [];
        const mgmtTeamUserIds = new Set<string>();

        if (userData.team_id) {
          const { data: team } = await createAdminClient()
            .from("teams")
            .select("team_type")
            .eq("id", userData.team_id)
            .single();
          if (team?.team_type === "management") {
            isManagementTeam = true;
            const { data: members } = await createAdminClient()
              .from("users")
              .select("id")
              .eq("team_id", userData.team_id);
            teamMemberIds = (members || []).map(m => m.id);
          }
        }

        // For regular programmers, fetch management-type team user IDs to exclude from eval counts
        if (!isManagementTeam) {
          const { data: mgmtTeams } = await createAdminClient()
            .from("teams")
            .select("id")
            .eq("team_type", "management");
          if (mgmtTeams && mgmtTeams.length > 0) {
            const { data: mgmtUsers } = await createAdminClient()
              .from("users")
              .select("id")
              .in("team_id", mgmtTeams.map((t: any) => t.id));
            for (const u of mgmtUsers || []) {
              mgmtTeamUserIds.add(u.id);
            }
          }
        }

        // Programmers share evaluations — check if any programmer has evaluated each episode
        let evalQuery = supabase
          .from("episodic_evaluations")
          .select("episode_id, evaluator_id, evaluator:users!evaluator_id(name, role)")
          .in("episode_id", episodeIds);

        // Management-type team members only see their own team's evaluations
        if (isManagementTeam) {
          evalQuery = evalQuery.in("evaluator_id", teamMemberIds);
        }

        const { data: evaluations } = await evalQuery;

        if (evaluations) {
          for (const ev of evaluations as any[]) {
            if (isManagementTeam) {
              // Management team: show only their own team's evaluations
              evaluationStatusMap[ev.episode_id] = { evaluated: true, evaluatedByName: ev.evaluator?.name };
            } else if (ev.evaluator?.role === "programmer" && !mgmtTeamUserIds.has(ev.evaluator_id)) {
              // Regular programmer: show only non-management-team programmer evals
              evaluationStatusMap[ev.episode_id] = { evaluated: true, evaluatedByName: ev.evaluator?.name };
            }
          }
        }
      } else {
        const { data: evaluations } = await supabase
          .from("episodic_evaluations")
          .select("episode_id")
          .eq("evaluator_id", user.id)
          .in("episode_id", episodeIds);

        if (evaluations) {
          for (const ev of evaluations as any[]) {
            evaluationStatusMap[ev.episode_id] = { evaluated: true };
          }
        }
      }
    }

    // Fetch revision counts and latest revision attachment for all episodes in batch
    let revisionCountMap: Record<string, number> = {};
    let latestRevisionMap: Record<string, { attachment_url: string | null; attachment_name: string | null; attachment_type: string | null; revision_number: number; initial_assessment: number | null; assessed_by_name: string | null }> = {};
    if (episodes && episodes.length > 0) {
      const episodeIds = episodes.map((ep) => ep.id);
      const { data: revisionData } = await supabase
        .from("episode_revisions")
        .select("episode_id, attachment_url, attachment_name, attachment_type, revision_number, initial_assessment, assessed_by")
        .in("episode_id", episodeIds)
        .order("revision_number", { ascending: false });

      if (revisionData) {
        // Collect unique assessed_by user IDs for batch name lookup
        const assessedByIds = new Set<string>();
        revisionData.forEach((r: any) => {
          if (r.assessed_by) assessedByIds.add(r.assessed_by);
        });

        // Batch fetch assessor names
        let assessorNameMap: Record<string, string> = {};
        if (assessedByIds.size > 0) {
          const { data: assessorData } = await supabase
            .from("users")
            .select("id, name")
            .in("id", Array.from(assessedByIds));
          if (assessorData) {
            assessorData.forEach((u: any) => { assessorNameMap[u.id] = u.name; });
          }
        }

        revisionData.forEach((r: any) => {
          revisionCountMap[r.episode_id] = (revisionCountMap[r.episode_id] || 0) + 1;
          // Keep only the latest revision (first one due to DESC order)
          if (!latestRevisionMap[r.episode_id]) {
            latestRevisionMap[r.episode_id] = {
              attachment_url: r.attachment_url,
              attachment_name: r.attachment_name,
              attachment_type: r.attachment_type,
              revision_number: r.revision_number,
              initial_assessment: r.initial_assessment,
              assessed_by_name: r.assessed_by ? (assessorNameMap[r.assessed_by] || null) : null,
            };
          }
        });
      }
    }

    // Transform episodes to include writer_names array for multi-writer support
    const transformedEpisodes = (episodes || []).map((episode: EpisodeData) => {
      let transformed: EpisodeData = episode;

      // Add writer_names if call_report_writers exists
      if (episode.call_report?.call_report_writers) {
        const writers = episode.call_report.call_report_writers
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .map((w) => w.writer?.name)
          .filter((name): name is string => !!name);

        transformed = {
          ...transformed,
          call_report: {
            ...episode.call_report,
            writer_names: writers,
          },
        };
      }

      // Add evaluation status if requested
      if (includeEvaluationStatus) {
        const evalEntry = evaluationStatusMap[episode.id];
        transformed = {
          ...transformed,
          is_evaluated: !!(evalEntry?.evaluated),
          evaluated_by_name: evalEntry?.evaluatedByName ?? null,
        };
      }

      // Add revision count and latest revision attachment
      (transformed as any).revision_count = revisionCountMap[episode.id] || 0;
      (transformed as any).latest_revision = latestRevisionMap[episode.id] || null;

      return transformed;
    });

    // Create response based on pagination mode
    let response;
    if (groupByProject && !filters.call_report_id && !filters.story_id) {
      // Project-based pagination response
      response = {
        data: transformedEpisodes,
        pagination: {
          currentPage: projectPage,
          pageSize: projectLimit,
          totalItems: count || 0,
          totalProjects,
          hasMoreProjects,
          mode: "project" as const,
        },
      };
    } else {
      // Standard episode-based pagination response
      response = createPaginatedResponse(
        transformedEpisodes,
        paginationParams.page,
        paginationParams.limit,
        count || 0
      );
    }

    return withApiPerf(async () => {
      const res = NextResponse.json(response);
      // Disable caching to ensure fresh data after episodes are created/updated
      res.headers.set('Cache-Control', 'no-store');
      return addRateLimitHeaders(withCors(request, res), rate.result);
    }, request);

  } catch (error) {
    logger.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(request, internalError());
  }
}
