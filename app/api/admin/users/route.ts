import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminCreateUserSchema, departmentToRole } from "@/lib/validations/auth";
import { applyRateLimit, addRateLimitHeaders, handleApiError, withApiPerf } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAdminAction, getRequestContext } from "@/lib/audit/server";

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

    const { name, email, password, position, department } = validation.data;

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
