import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTeamSchema } from "@/lib/validations/teams";
import { logAdminAction, getRequestContext } from "@/lib/audit/server";
import { logger } from "@/lib/logger";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

/**
 * GET /api/admin/teams
 * Fetch all teams with hierarchy information
 */
export async function GET(request: Request) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    // Verify admin authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all teams with team head information
    const adminClient = createAdminClient();
    const { data: teams, error } = await adminClient
      .from('teams')
      .select(`
        id,
        name,
        description,
        parent_team_id,
        team_type,
        team_head_id,
        created_at,
        updated_at,
        team_head:users!team_head_id(id, name, email, role)
      `)
      .order('name');

    if (error) {
      logger.error("Error fetching teams", { error, context: "GET /api/admin/teams" });
      return NextResponse.json(
        { error: "Failed to fetch teams" },
        { status: 500 }
      );
    }

    // Fetch member count for each team
    const teamsWithCounts = await Promise.all(
      (teams || []).map(async (team) => {
        const { count } = await adminClient
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
          .eq('status', 'active');

        return {
          ...team,
          member_count: count || 0,
        };
      })
    );

    return NextResponse.json({ teams: teamsWithCounts });
  } catch (error) {
    logger.error("Error in GET /api/admin/teams", { error, context: "GET /api/admin/teams" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/teams
 * Create a new team
 */
export async function POST(request: Request) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.strict);
    if (!rate.success) return rate.response!;

    // Verify admin authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate request body
    const body = await request.json();
    const validation = createTeamSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { name, description, parent_team_id, team_type, team_head_id } = validation.data;

    // Convert empty strings to null
    const parentTeamId = parent_team_id && parent_team_id !== '' ? parent_team_id : null;
    const teamHeadId = team_head_id && team_head_id !== '' ? team_head_id : null;
    const teamDescription = description && description !== '' ? description : null;

    // Check for circular reference if parent is specified
    if (parentTeamId) {
      const adminClient = createAdminClient();

      // Verify parent team exists
      const { data: parentTeam, error: parentError } = await adminClient
        .from('teams')
        .select('id')
        .eq('id', parentTeamId)
        .single();

      if (parentError || !parentTeam) {
        return NextResponse.json(
          { error: "Parent team not found" },
          { status: 400 }
        );
      }
    }

    // Verify team head exists if specified
    if (teamHeadId) {
      const adminClient = createAdminClient();
      const { data: teamHead, error: headError } = await adminClient
        .from('users')
        .select('id, name')
        .eq('id', teamHeadId)
        .single();

      if (headError || !teamHead) {
        return NextResponse.json(
          { error: "Team head user not found" },
          { status: 400 }
        );
      }
    }

    // Create the team
    const adminClient = createAdminClient();
    const { data: newTeam, error: createError } = await adminClient
      .from('teams')
      .insert({
        name,
        description: teamDescription,
        parent_team_id: parentTeamId,
        team_type,
        team_head_id: teamHeadId,
      })
      .select()
      .single();

    if (createError) {
      logger.error("Error creating team", { error: createError, context: "POST /api/admin/teams" });

      // Check for unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: "A team with this name already exists" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create team" },
        { status: 500 }
      );
    }

    // Log admin action
    const requestContext = getRequestContext(request);
    await logAdminAction({
      entityType: "team",
      entityId: newTeam.id,
      action: "created",
      performedBy: user.id,
      details: {
        ...requestContext,
        newValues: {
          name,
          description: teamDescription,
          parent_team_id: parentTeamId,
          team_type,
          team_head_id: teamHeadId,
        },
      },
    });

    // Refresh materialized views
    const { error: refreshError } = await adminClient.rpc('refresh_all_team_views');
    if (refreshError) {
      logger.error("Failed to refresh team views", { error: refreshError, context: "POST /api/admin/teams" });
      // Don't fail the request if refresh fails
    }

    return NextResponse.json({ team: newTeam }, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/admin/teams", { error, context: "POST /api/admin/teams" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
