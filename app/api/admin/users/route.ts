import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminCreateUserSchema, departmentToRole } from "@/lib/validations/auth";
import { applyRateLimit, addRateLimitHeaders, handleApiError, withApiPerf } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAdminAction, getRequestContext } from "@/lib/audit/server";
import { parseAuthError, createErrorResponse } from "@/lib/error-handler";

/**
 * GET /api/admin/users
 * Fetch all users
 */
export async function GET(request: Request) {
  try {
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

    // Fetch all users
    const adminClient = createAdminClient();
    const { data: users, error } = await adminClient
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        department,
        position,
        status,
        team_id,
        created_at,
        team:teams!team_id(
          id,
          name,
          team_head:users!team_head_id(
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error("Error fetching users:", { error, context: "GET /api/admin/users" });
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    logger.error("Error in GET /api/admin/users:", { error });
    return NextResponse.json(
      { error: "An error occurred while fetching users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Apply strict rate limiting: 10 requests per minute for user creation
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.strict);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  return withApiPerf(async () => {
    try {
    // Use regular client to verify the current user is an admin
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = adminCreateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Invalid user data provided",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { name, email, password, position, department, team_id } = validation.data;

    // Map department to role
    let role: string;
    if (department === "admin") {
      role = "admin";
    } else if (department === "content_head") {
      role = "content_head";
    } else if (department === "gcm") {
      role = "gcm";
    } else {
      role = departmentToRole(department);
    }

    // Use admin client with service role key for user creation
    // This bypasses RLS and has full admin privileges
    const adminClient = createAdminClient();

    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email for admin-created users
      user_metadata: {
        name,
        position: position || undefined, // Convert empty string to undefined
        role,
        department,
        team_id: team_id || undefined, // Convert empty string to undefined
        admin_created: true, // Flag to bypass email domain validation
      },
    });

    if (authError) {
      const parsedError = parseAuthError(authError, {
        operation: 'auth_user_creation',
        email,
        details: { role, department },
      });

      logger.errorWithContext('Auth user creation failed', authError, parsedError.context);
      return createErrorResponse(parsedError, 500);
    }

    // Note: Profile creation happens via trigger (on_auth_user_created)
    // Team creation happens via trigger (users_auto_create_team_trigger) for evaluators
    // Both triggers run automatically, errors will be captured in auth creation response

    // Special handling for GCM users: always assign to shared GCM team, overriding any selection
    if (role === 'gcm') {
      // Get the shared GCM team
      const { data: gcmTeam, error: teamError } = await adminClient
        .from('teams')
        .select('id')
        .eq('name', 'GCM Team')
        .single();

      if (gcmTeam?.id) {
        const { error: updateError } = await adminClient
          .from('users')
          .update({ team_id: gcmTeam.id })
          .eq('id', newUser.user.id);

        if (updateError) {
          logger.dbError('gcm_team_assignment', updateError, {
            userId: newUser.user.id,
            teamId: gcmTeam.id,
            email,
          });
          // Don't fail - user created successfully
        }
      } else {
        logger.warn('Shared GCM team not found for user assignment', {
          userId: newUser.user.id,
          email,
          role: 'gcm',
        });
      }
    } else if (role === 'programmer') {
      // Programmer users always belong to the shared Programming Team
      const { data: programmingTeam } = await adminClient
        .from('teams')
        .select('id')
        .eq('name', 'Programming Team')
        .single();

      if (programmingTeam?.id) {
        const { error: updateError } = await adminClient
          .from('users')
          .update({ team_id: programmingTeam.id })
          .eq('id', newUser.user.id);

        if (updateError) {
          logger.dbError('programmer_team_assignment', updateError, {
            userId: newUser.user.id,
            teamId: programmingTeam.id,
            email,
          });
        }
      } else {
        logger.warn('Programming Team not found for user assignment', {
          userId: newUser.user.id,
          email,
          role: 'programmer',
        });
      }
    } else {
      // For non-GCM users, update team_id if explicitly provided and not auto-created
      if (team_id) {
        const { error: updateError } = await adminClient
          .from('users')
          .update({ team_id })
          .eq('id', newUser.user.id);

        if (updateError) {
          logger.dbError('team_assignment', updateError, {
            userId: newUser.user.id,
            teamId: team_id,
            email,
          });
          // Don't fail - user created successfully
        }
      }
    }

    // Log admin action for audit trail
    const requestContext = getRequestContext(request);
    await logAdminAction({
      entityType: "user",
      entityId: newUser.user.id,
      action: "created",
      performedBy: user.id,
      details: {
        ...requestContext,
        newValues: {
          email,
          role,
          department,
          position,
          name,
          team_id: team_id || null,
        },
      },
    });

    const response = NextResponse.json(newUser);
    return addRateLimitHeaders(response, rateLimitResult.result);
    } catch (error) {
      logger.errorWithContext('Unexpected error in user creation', error, {
        operation: 'create_user_endpoint',
      });
      return createErrorResponse({
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        technicalDetails: error instanceof Error ? error.message : String(error),
        context: { operation: 'create_user_endpoint' },
      }, 500);
    }
  });
}
