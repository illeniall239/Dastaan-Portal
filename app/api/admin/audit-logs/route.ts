import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { getAuditLogs } from "@/lib/audit/server";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

/**
 * GET /api/admin/audit-logs
 * Fetch audit logs with optional filtering
 *
 * Query parameters:
 * - entityType: Filter by entity type (e.g., 'user', 'external_evaluation')
 * - action: Filter by action (e.g., 'created', 'updated', 'deleted', 'role_changed')
 * - performedBy: Filter by user ID who performed the action
 * - startDate: Filter by start date (ISO 8601)
 * - endDate: Filter by end date (ISO 8601)
 * - limit: Number of results to return (default: 100, max: 500)
 * - offset: Number of results to skip (default: 0)
 */
export async function GET(request: Request) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const supabase = await createClient();

  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") || undefined;
  const action = searchParams.get("action") || undefined;
  const performedBy = searchParams.get("performedBy") || undefined;
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  const limitStr = searchParams.get("limit");
  const offsetStr = searchParams.get("offset");

  // Parse dates
  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  // Parse pagination
  const limit = limitStr ? Math.min(parseInt(limitStr), 500) : 100;
  const offset = offsetStr ? parseInt(offsetStr) : 0;

  try {
    const { data: logs, count } = await getAuditLogs({
      entityType,
      action,
      performedBy,
      startDate,
      endDate,
      limit,
      offset,
    });

    // Enrich logs with user information
    const userIds = [...new Set(logs.map(log => log.performed_by))];
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email, role")
      .in("id", userIds);

    const userMap = new Map(users?.map(u => [u.id, u]) || []);

    const enrichedLogs = logs.map(log => ({
      ...log,
      performed_by_user: userMap.get(log.performed_by) || null,
    }));

    return addRateLimitHeaders(
      withCors(
        request,
        NextResponse.json({
          logs: enrichedLogs,
          pagination: {
            total: count,
            limit,
            offset,
            hasMore: offset + limit < count,
          },
        })
      ),
      rate.result
    );
  } catch (error) {
    logger.error(`Error fetching audit logs: ${error instanceof Error ? error.message : String(error)}`);
    return withCors(
      request,
      NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 }
      )
    );
  }
}
