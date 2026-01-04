import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateTeamSchema } from "@/lib/validations/teams";
import { logAdminAction, getRequestContext } from "@/lib/audit/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/teams/[id]
 * Fetch a single team with full details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Fetch team with full details
    const adminClient = createAdminClient();
    const { data: team, error } = await adminClient
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
        team_head:users!team_head_id(id, name, email, role),
        parent_team:teams!parent_team_id(id, name, team_type)
      `)
      .eq('id', teamId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Team not found" },
          { status: 404 }
        );
      }

      logger.error("Error fetching team", { error, context: "GET /api/admin/teams/[id]" });
      return NextResponse.json(
        { error: "Failed to fetch team" },
        { status: 500 }
      );
    }

    // Fetch member count
    const { count: memberCount } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'active');

    // Fetch sub-teams count
    const { count: subTeamsCount } = await adminClient
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('parent_team_id', teamId);

    return NextResponse.json({
      team: {
        ...team,
        member_count: memberCount || 0,
        sub_teams_count: subTeamsCount || 0,
      },
    });
  } catch (error) {
    logger.error("Error in GET /api/admin/teams/[id]", { error, context: "GET /api/admin/teams/[id]" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/teams/[id]
 * Update team details
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Verify team exists and get current values
    const { data: existingTeam, error: fetchError } = await adminClient
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (fetchError || !existingTeam) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = updateTeamSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Convert empty strings to null
    const processedUpdates: any = {};

    if (updates.name !== undefined) {
      processedUpdates.name = updates.name;
    }

    if (updates.description !== undefined) {
      processedUpdates.description = updates.description && updates.description !== ''
        ? updates.description
        : null;
    }

    if (updates.parent_team_id !== undefined) {
      processedUpdates.parent_team_id = updates.parent_team_id || null;
    }

    if (updates.team_type !== undefined) {
      processedUpdates.team_type = updates.team_type;
    }

    if (updates.team_head_id !== undefined) {
      processedUpdates.team_head_id = updates.team_head_id || null;
    }

    // Validate parent team exists if specified
    if (processedUpdates.parent_team_id) {
      // Check parent team exists
      const { data: parentTeam, error: parentError } = await adminClient
        .from('teams')
        .select('id')
        .eq('id', processedUpdates.parent_team_id)
        .single();

      if (parentError || !parentTeam) {
        return NextResponse.json(
          { error: "Parent team not found" },
          { status: 400 }
        );
      }

      // Check for circular reference using database function
      const { data: circularCheck, error: circularError } = await adminClient
        .rpc('check_team_circular_reference', {
          p_team_id: teamId,
          p_new_parent_id: processedUpdates.parent_team_id,
        });

      if (circularError) {
        logger.error("Error checking circular reference", { error: circularError, context: "PUT /api/admin/teams/[id]" });
        return NextResponse.json(
          { error: "Failed to validate team hierarchy" },
          { status: 500 }
        );
      }

      if (circularCheck === true) {
        return NextResponse.json(
          { error: "Cannot set parent team: this would create a circular reference in the team hierarchy" },
          { status: 400 }
        );
      }
    }

    // Validate team head exists if specified
    if (processedUpdates.team_head_id) {
      const { data: teamHead, error: headError } = await adminClient
        .from('users')
        .select('id, name')
        .eq('id', processedUpdates.team_head_id)
        .single();

      if (headError || !teamHead) {
        return NextResponse.json(
          { error: "Team head user not found" },
          { status: 400 }
        );
      }
    }

    // Update the team
    const { data: updatedTeam, error: updateError } = await adminClient
      .from('teams')
      .update(processedUpdates)
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating team", { error: updateError, context: "PUT /api/admin/teams/[id]" });

      // Check for unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: "A team with this name already exists" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to update team" },
        { status: 500 }
      );
    }

    // Log admin action
    const requestContext = getRequestContext(request);
    await logAdminAction({
      entityType: "team",
      entityId: teamId,
      action: "updated",
      performedBy: user.id,
      details: {
        ...requestContext,
        oldValues: existingTeam,
        newValues: processedUpdates,
      },
    });

    // Refresh materialized views
    const { error: refreshError } = await adminClient.rpc('refresh_all_team_views');
    if (refreshError) {
      logger.error("Failed to refresh team views", { error: refreshError, context: "PUT /api/admin/teams/[id]" });
      // Don't fail the request if refresh fails
    }

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    logger.error("Error in PUT /api/admin/teams/[id]", { error, context: "PUT /api/admin/teams/[id]" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/teams/[id]
 * Delete a team
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Verify team exists and get details for logging
    const { data: existingTeam, error: fetchError } = await adminClient
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (fetchError || !existingTeam) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if team has members
    const { count: memberCount } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'active');

    if (memberCount && memberCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete team with active members",
          message: `This team has ${memberCount} active member(s). Please reassign or remove all members before deleting the team.`
        },
        { status: 400 }
      );
    }

    // Check if team has sub-teams
    const { count: subTeamsCount } = await adminClient
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('parent_team_id', teamId);

    if (subTeamsCount && subTeamsCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete team with sub-teams",
          message: `This team has ${subTeamsCount} sub-team(s). Please reassign or delete all sub-teams before deleting this team.`
        },
        { status: 400 }
      );
    }

    // Delete the team
    const { error: deleteError } = await adminClient
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) {
      logger.error("Error deleting team", { error: deleteError, context: "DELETE /api/admin/teams/[id]" });
      return NextResponse.json(
        { error: "Failed to delete team" },
        { status: 500 }
      );
    }

    // Log admin action
    const requestContext = getRequestContext(request);
    await logAdminAction({
      entityType: "team",
      entityId: teamId,
      action: "deleted",
      performedBy: user.id,
      details: {
        ...requestContext,
        deletedValues: existingTeam,
      },
    });

    // Refresh materialized views
    const { error: refreshError } = await adminClient.rpc('refresh_all_team_views');
    if (refreshError) {
      logger.error("Failed to refresh team views", { error: refreshError, context: "DELETE /api/admin/teams/[id]" });
      // Don't fail the request if refresh fails
    }

    return NextResponse.json({
      message: "Team deleted successfully",
      deletedTeamId: teamId
    });
  } catch (error) {
    logger.error("Error in DELETE /api/admin/teams/[id]", { error, context: "DELETE /api/admin/teams/[id]" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
