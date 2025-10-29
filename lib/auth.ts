// This file should only contain server-side auth functions
// For client-side auth operations, use the supabase client directly in components
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserSession, setUserSession } from "@/lib/session";
import { logger } from "@/lib/logger";

// Cache getCurrentUser to prevent duplicate database queries within a single request
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Try to get user data from session cookie first (performance optimization)
  const sessionUser = await getUserSession();
  if (sessionUser && sessionUser.id === user.id) {
    // Cookie is valid and matches current user - return it
    // Note: created_at is not cached in session for performance
    return {
      ...sessionUser,
      department: sessionUser.department,
      // created_at is omitted (undefined) when using cached session
    };
  }

  // Fall back to DB query if no valid session cookie
  
  
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, email, name, role, position, department, created_at")
    .eq("id", user.id)
    .single();
  

  if (profileError) {
    logger.error("❌ [getCurrentUser] Error fetching user profile:", profileError);
    return null;
  }

  // Note: We cannot update session cookie from server components
  // The session cookie is updated via middleware or route handlers
  // This prevents the "Cookies can only be modified in a Server Action or Route Handler" error

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
