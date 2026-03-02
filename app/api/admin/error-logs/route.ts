import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit, addRateLimitHeaders } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/error-logs
 * Fetch error logs with optional filtering. Admin only.
 *
 * Query params:
 *   limit, offset, route, userId, statusCode, from, to
 */
export async function GET(request: Request) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);
  const offset = parseInt(searchParams.get("offset") || "0");
  const routeFilter = searchParams.get("route") || null;
  const userIdFilter = searchParams.get("userId") || null;
  const statusCodeFilter = searchParams.get("statusCode") || null;
  const from = searchParams.get("from") || null;
  const to = searchParams.get("to") || null;

  try {
    const adminSupabase = createAdminClient();

    let query = adminSupabase
      .from("error_logs")
      .select("*", { count: "exact" })
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (routeFilter) query = query.ilike("route", `%${routeFilter}%`);
    if (userIdFilter) query = query.eq("user_id", userIdFilter);
    if (statusCodeFilter) query = query.eq("status_code", parseInt(statusCodeFilter));
    if (from) query = query.gte("timestamp", from);
    if (to) query = query.lte("timestamp", to);

    const { data: logs, count, error } = await query;

    if (error) throw error;

    // Enrich with user name/email/role
    const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))];
    const userMap = new Map<string, { name: string; email: string; role: string }>();

    if (userIds.length > 0) {
      const { data: users } = await adminSupabase
        .from("users")
        .select("id, name, email, role")
        .in("id", userIds);
      users?.forEach(u => userMap.set(u.id, u));
    }

    // Stats for last 24 hours
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: errorsToday } = await adminSupabase
      .from("error_logs")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", since24h);

    const { data: routeStats } = await adminSupabase
      .from("error_logs")
      .select("route")
      .gte("timestamp", since24h);
    const uniqueRoutes = new Set(routeStats?.map(r => r.route).filter(Boolean)).size;

    const { data: userStats } = await adminSupabase
      .from("error_logs")
      .select("user_id")
      .gte("timestamp", since24h)
      .not("user_id", "is", null);
    const uniqueUsers = new Set(userStats?.map(r => r.user_id)).size;

    const enrichedLogs = (logs || []).map(log => ({
      ...log,
      user: log.user_id ? userMap.get(log.user_id) || null : null,
    }));

    return addRateLimitHeaders(
      NextResponse.json({
        logs: enrichedLogs,
        stats: {
          errors_today: errorsToday ?? 0,
          unique_routes_today: uniqueRoutes,
          unique_users_today: uniqueUsers,
        },
        pagination: {
          total: count ?? 0,
          limit,
          offset,
          hasMore: offset + limit < (count ?? 0),
        },
      }),
      rate.result
    );
  } catch (error) {
    console.error("Error fetching error logs:", error);
    return NextResponse.json({ error: "Failed to fetch error logs" }, { status: 500 });
  }
}
