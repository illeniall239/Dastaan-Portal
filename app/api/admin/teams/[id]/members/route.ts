import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignUsersToTeamSchema, removeUsersFromTeamSchema } from "@/lib/validations/teams";
import { logAdminAction, getRequestContext } from "@/lib/audit/server";
import { logger } from "@/lib/logger";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

/**
 * GET /api/admin/teams/[id]/members
 * Fetch all members of a team
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const { id } = await params;
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

    const teamId = id;
    const adminClient = createAdminClient();

    // Verify team exists
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Fetch team members
    const { data: members, error } = await adminClient
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        department,
        position,
        status,
        created_at
      `)
      .eq('team_id', teamId)
      .order('name');

    if (error) {
      logger.error("Error fetching team members", { error, context: "GET /api/admin/teams/[id]/members" });
      return NextResponse.json(
        { error: "Failed to fetch team members" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      team: { id: team.id, name: team.name },
      members: members || [],
      total: members?.length || 0,
    });
  } catch (error) {
    logger.error("Error in GET /api/admin/teams/[id]/members", { error, context: "GET /api/admin/teams/[id]/members" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/teams/[id]/members
 * Assign users to a team (bulk operation)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.strict);
    if (!rate.success) return rate.response!;

    const { id } = await params;
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

    const teamId = id;
    const adminClient = createAdminClient();

    // Verify team exists
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = assignUsersToTeamSchema.safeParse({
      ...body,
      team_id: teamId,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { user_ids } = validation.data;

    // Verify all users exist
    const { data: usersToAssign, error: usersError } = await adminClient
      .from('users')
      .select('id, name, email, team_id')
      .in('id', user_ids);

    if (usersError) {
      logger.error("Error fetching users", { error: usersError, context: "POST /api/admin/teams/[id]/members" });
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    if (!usersToAssign || usersToAssign.length !== user_ids.length) {
      const foundIds = usersToAssign?.map(u => u.id) || [];
      const missingIds = user_ids.filter(id => !foundIds.includes(id));
      return NextResponse.json(
        {
          error: "Some users not found",
          missing_user_ids: missingIds,
        },
        { status: 400 }
      );
    }

    // Track users being reassigned from other teams
    const usersWithPreviousTeams = usersToAssign.filter(u => u.team_id && u.team_id !== teamId);

    // Assign users to team (bulk update)
    const { data: updatedUsers, error: updateError } = await adminClient
      .from('users')
      .update({ team_id: teamId })
      .in('id', user_ids)
      .select('id, name, email');

    if (updateError) {
      logger.error("Error assigning users to team", { error: updateError, context: "POST /api/admin/teams/[id]/members" });
      return NextResponse.json(
        { error: "Failed to assign users to team" },
        { status: 500 }
      );
    }

    // Log admin action for each user
    const requestContext = getRequestContext(request);
    for (const assignedUser of updatedUsers || []) {
      const previousTeam = usersToAssign.find(u => u.id === assignedUser.id)?.team_id;

      await logAdminAction({
        entityType: "user",
        entityId: assignedUser.id,
        action: previousTeam ? "team_reassigned" : "team_assigned",
        performedBy: user.id,
        details: {
          ...requestContext,
          teamId,
          teamName: team.name,
          previousTeamId: previousTeam || null,
          userName: assignedUser.name,
          userEmail: assignedUser.email,
        },
      }).catch(err => {
        logger.error("Failed to log admin action", { error: err, context: "POST /api/admin/teams/[id]/members" });
        // Don't fail the request if logging fails
      });
    }

    // Refresh materialized views
    const { error: refreshError } = await adminClient.rpc('refresh_all_team_views');
    if (refreshError) {
      logger.error("Failed to refresh team views", { error: refreshError, context: "POST /api/admin/teams/[id]/members" });
      // Don't fail the request if refresh fails
    }

    return NextResponse.json({
      message: `Successfully assigned ${updatedUsers?.length || 0} user(s) to team`,
      team: { id: team.id, name: team.name },
      assigned_users: updatedUsers,
      reassigned_count: usersWithPreviousTeams.length,
    });
  } catch (error) {
    logger.error("Error in POST /api/admin/teams/[id]/members", { error, context: "POST /api/admin/teams/[id]/members" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/teams/[id]/members
 * Remove users from a team
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.strict);
    if (!rate.success) return rate.response!;

    const { id } = await params;
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

    const teamId = id;
    const adminClient = createAdminClient();

    // Verify team exists
    const { data: team, error: teamError } = await adminClient
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = removeUsersFromTeamSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { user_ids } = validation.data;

    // Verify all users exist and belong to this team
    const { data: usersToRemove, error: usersError } = await adminClient
      .from('users')
      .select('id, name, email, team_id')
      .in('id', user_ids);

    if (usersError) {
      logger.error("Error fetching users for removal", { error: usersError, context: "DELETE /api/admin/teams/[id]/members" });
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    if (!usersToRemove || usersToRemove.length === 0) {
      return NextResponse.json(
        { error: "No users found with the provided IDs" },
        { status: 400 }
      );
    }

    // Check if all users belong to this team
    const usersNotInTeam = usersToRemove.filter(u => u.team_id !== teamId);
    if (usersNotInTeam.length > 0) {
      return NextResponse.json(
        {
          error: "Some users are not members of this team",
          non_member_ids: usersNotInTeam.map(u => u.id),
        },
        { status: 400 }
      );
    }

    // Remove users from team (set team_id to null)
    const { data: updatedUsers, error: updateError } = await adminClient
      .from('users')
      .update({ team_id: null })
      .in('id', user_ids)
      .select('id, name, email');

    if (updateError) {
      logger.error("Error removing users from team", { error: updateError, context: "DELETE /api/admin/teams/[id]/members" });
      return NextResponse.json(
        { error: "Failed to remove users from team" },
        { status: 500 }
      );
    }

    // Log admin action for each user
    const requestContext = getRequestContext(request);
    for (const removedUser of updatedUsers || []) {
      await logAdminAction({
        entityType: "user",
        entityId: removedUser.id,
        action: "team_removed",
        performedBy: user.id,
        details: {
          ...requestContext,
          teamId,
          teamName: team.name,
          userName: removedUser.name,
          userEmail: removedUser.email,
        },
      }).catch(err => {
        logger.error("Failed to log admin action", { error: err, context: "DELETE /api/admin/teams/[id]/members" });
        // Don't fail the request if logging fails
      });
    }

    // Refresh materialized views
    const { error: refreshError } = await adminClient.rpc('refresh_all_team_views');
    if (refreshError) {
      logger.error("Failed to refresh team views", { error: refreshError, context: "DELETE /api/admin/teams/[id]/members" });
      // Don't fail the request if refresh fails
    }

    return NextResponse.json({
      message: `Successfully removed ${updatedUsers?.length || 0} user(s) from team`,
      team: { id: team.id, name: team.name },
      removed_users: updatedUsers,
    });
  } catch (error) {
    logger.error("Error in DELETE /api/admin/teams/[id]/members", { error, context: "DELETE /api/admin/teams/[id]/members" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
