import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setUserSession } from "@/lib/session";
import { logger } from "@/lib/logger";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

/**
 * POST /api/auth/session
 * Sets user session cookie after successful login
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.strict, user.id);
    if (!rate.success) return rate.response!;

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, name, role, position, department")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    // Record login event in user_sessions
    let sessionId: string | undefined;
    try {
      const adminClient = createAdminClient();
      const { data: newSession } = await adminClient
        .from("user_sessions")
        .insert({ user_id: profile.id })
        .select("id")
        .single();
      sessionId = newSession?.id;
    } catch (err) {
      logger.warn("Failed to record user session:", err);
    }

    // Set session cookie (include sessionId for heartbeat/logout)
    await setUserSession({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      position: profile.position,
      department: profile.department,
      sessionId,
    });

    // Return user profile including role for client-side routing
    return addRateLimitHeaders(withCors(request, NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        position: profile.position,
        department: profile.department,
      }
    })), rate.result);
  } catch (error: any) {
    logger.error("Error setting session:", error);
    return withCors(request, NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    ));
  }
}
