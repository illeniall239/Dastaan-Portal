import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase Client
 *
 * This client uses the SERVICE ROLE KEY which bypasses Row Level Security (RLS)
 * and has full admin privileges. Use ONLY for admin operations like:
 * - Creating users via auth.admin.createUser()
 * - Deleting users via auth.admin.deleteUser()
 * - Updating user metadata
 * - Other privileged operations
 *
 * WARNING: Never expose this client to the frontend or use it for regular user operations.
 * Only use in API routes that have proper admin authentication checks.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
