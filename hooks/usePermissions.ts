"use client";

import { useAuth } from "./use-auth";

export function useHasRole(allowedRoles: string[]) {
  const { user, loading } = useAuth();

  if (loading) {
    return false; // Or a loading state if you prefer
  }

  if (!user) {
    return false;
  }

  return allowedRoles.includes(user.role);
}
