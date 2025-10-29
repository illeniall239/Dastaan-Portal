import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UserRole } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the appropriate redirect path based on user role
 * All roles are assigned by admins, so we can trust the role field
 */
export function getRoleBasedRedirect(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "management":
      return "/management";
    case "content_manager":
    case "content_creator":
      return "/content-department";
    case "evaluator":
      return "/evaluator";
    case "executive":
    case "legal":
    case "finance":
    default:
      return "/dashboard";
  }
}
