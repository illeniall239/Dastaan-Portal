import { User, CallReport } from "@/types";

/**
 * Check if user can view private fields (idea_by, developed_by)
 * @param user - Current user
 * @param createdBy - ID of user who created the call report
 * @returns true if user can see private fields
 */
export function canViewPrivateFields(user: User, createdBy: string): boolean {
  // Management and admin can always see
  if (["management", "admin"].includes(user.role)) {
    return true;
  }

  // Creator can see their own
  if (user.id === createdBy) {
    return true;
  }

  return false;
}

/**
 * Sanitize call report data based on user permissions
 * Replaces private fields with "In-House Team" for unauthorized users
 * @param callReport - The call report to sanitize
 * @param user - Current user viewing the report
 * @returns Sanitized call report with privacy rules applied
 */
export function sanitizeCallReportForUser(
  callReport: CallReport,
  user: User
): CallReport {
  const canView = canViewPrivateFields(user, callReport.created_by);

  if (!canView && callReport.category === "content_head_initiative") {
    return {
      ...callReport,
      idea_by: "In-House Team",
      developed_by: "In-House Team"
    };
  }

  return callReport;
}

/**
 * Sanitize an array of call reports based on user permissions
 * @param callReports - Array of call reports to sanitize
 * @param user - Current user viewing the reports
 * @returns Array of sanitized call reports
 */
export function sanitizeCallReportsForUser(
  callReports: CallReport[],
  user: User
): CallReport[] {
  return callReports.map(report => sanitizeCallReportForUser(report, user));
}
