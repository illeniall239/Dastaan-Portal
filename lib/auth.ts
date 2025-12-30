// This file should only contain server-side auth functions
// For client-side auth operations, use the supabase client directly in components
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserSession, setUserSession } from "@/lib/session";
import { logger } from "@/lib/logger";

// Cache getCurrentUser to prevent duplicate database queries within a single request
// IMPORTANT: This relies on proxy.ts (Next.js 16 middleware) to maintain the session cookie
// proxy.ts handles auth checks and DB queries, this function just reads from the cookie
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get user data from session cookie (set by proxy.ts)
  const sessionUser = await getUserSession();
  if (sessionUser && sessionUser.id === user.id) {
    // Cookie is valid and matches current user - return it
    return {
      ...sessionUser,
      department: sessionUser.department,
      // created_at is omitted (undefined) when using cached session
    };
  }

  // If no session cookie, proxy.ts should have redirected to login
  // This shouldn't happen in normal flow, but log for debugging
  logger.warn("⚠️ [getCurrentUser] No session cookie found - proxy.ts may not be running correctly");

  // Emergency fallback: query DB (this indicates proxy.ts isn't working)
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, name, role, position, department, created_at")
    .eq("id", user.id)
    .single();

  if (profileError) {
    logger.error("❌ [getCurrentUser] Error fetching user profile:", profileError);
    return null;
  }

  return profile;
});

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return user;
}
