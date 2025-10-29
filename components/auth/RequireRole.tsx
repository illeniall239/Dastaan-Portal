"use client";

import { useHasRole } from "@/hooks/usePermissions";
import { ReactNode } from "react";

interface RequireRoleProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireRole({ allowedRoles, children, fallback = null }: RequireRoleProps) {
  const hasRole = useHasRole(allowedRoles);

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
