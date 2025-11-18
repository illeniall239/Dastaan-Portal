import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminCreateUserSchema, departmentToRole } from "@/lib/validations/auth";
import { applyRateLimit, addRateLimitHeaders, handleApiError, withApiPerf } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAdminAction, getRequestContext } from "@/lib/audit/server";

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
      .select('id, name, email, role, department, position, status, team_id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error("Error in GET /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const role = department === "admin" ? "admin" : departmentToRole(department);

    // Use admin client with service role key for user creation
    // This bypasses RLS and has full admin privileges
    const adminClient = createAdminClient();

    const { data: newUser, error } = await adminClient.auth.admin.createUser({
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

    if (error) {
      return NextResponse.json(
        {
          error: "User creation failed",
          message: error.message,
        },
        { status: 500 }
      );
    }

    // Update the user record in public.users table with team_id if provided
    if (team_id) {
      const { error: updateError } = await adminClient
        .from('users')
        .update({ team_id })
        .eq('id', newUser.user.id);

      if (updateError) {
        logger.error("Failed to assign user to team", {
          userId: newUser.user.id,
          teamId: team_id,
          error: updateError,
        });
        // Note: We don't fail the entire request if team assignment fails
        // The user is created successfully, just without a team
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
      return handleApiError(error);
    }
  });
}
