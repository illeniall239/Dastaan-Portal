import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { unauthorizedError, forbiddenError } from "@/lib/api/errors";

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  position?: string;
  department?: string;
}

type AuthSuccess = { success: true; user: AuthenticatedUser };
type AuthFailure = { success: false; response: NextResponse };
type AuthResult = AuthSuccess | AuthFailure;

/**
 * Require authentication (and optionally specific roles) for an API route.
 * Admin always has access when roles are specified.
 *
 * @example
 * const auth = await requireApiAuth(["content_manager", "evaluator"]);
 * if (!auth.success) return auth.response;
 * const { user } = auth;
 */
export async function requireApiAuth(
  allowedRoles?: string[]
): Promise<AuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, response: unauthorizedError() };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const effectiveRoles = allowedRoles.includes("admin")
      ? allowedRoles
      : [...allowedRoles, "admin"];

    if (!effectiveRoles.includes(user.role)) {
      return { success: false, response: forbiddenError() };
    }
  }

  return { success: true, user: user as AuthenticatedUser };
}
