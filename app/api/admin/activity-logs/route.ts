import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit, addRateLimitHeaders } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";

export const dynamic = "force-dynamic";

function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
  if (!rate.success) return rate.response!;

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);
  const offset = parseInt(searchParams.get("offset") || "0");
  const typeFilter = searchParams.get("type") || null;
  const userIdFilter = searchParams.get("userId") || null;
  const routeFilter = searchParams.get("route") || null;
  const from = searchParams.get("from") || null;
  const to = searchParams.get("to") || null;

  try {
    const adminSupabase = createAdminClient();

    let query = adminSupabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (typeFilter && typeFilter !== "all") query = query.eq("type", typeFilter);
    if (userIdFilter) query = query.eq("user_id", userIdFilter);
    if (routeFilter) {
      const sanitized = escapeIlike(routeFilter.slice(0, 200));
      query = query.ilike("route", `%${sanitized}%`);
    }
    if (from) query = query.gte("timestamp", from);
    if (to) query = query.lte("timestamp", to);

    const { data: logs, count, error } = await query;
    if (error) throw error;

    // Enrich with user info
    const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))];
    const userMap = new Map<string, { name: string; email: string; role: string }>();
    if (userIds.length > 0) {
      const { data: users } = await adminSupabase
        .from("users").select("id, name, email, role").in("id", userIds);
      users?.forEach(u => userMap.set(u.id, u));
    }

    // 24h stats
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [pvRes, clRes, ceRes] = await Promise.all([
      adminSupabase.from("activity_logs").select("*", { count: "exact", head: true }).eq("type", "page_view").gte("timestamp", since24h),
      adminSupabase.from("activity_logs").select("*", { count: "exact", head: true }).eq("type", "click").gte("timestamp", since24h),
      adminSupabase.from("activity_logs").select("*", { count: "exact", head: true }).eq("type", "client_error").gte("timestamp", since24h),
    ]);

    if (pvRes.error) console.error("[activity-logs] page_view stats:", pvRes.error.message);
    if (clRes.error) console.error("[activity-logs] click stats:", clRes.error.message);
    if (ceRes.error) console.error("[activity-logs] client_error stats:", ceRes.error.message);

    const enrichedLogs = (logs || []).map(log => ({
      ...log,
      user: log.user_id ? userMap.get(log.user_id) || null : null,
    }));

    return addRateLimitHeaders(
      NextResponse.json({
        logs: enrichedLogs,
        stats: {
          page_views_today: pvRes.count ?? 0,
          clicks_today: clRes.count ?? 0,
          client_errors_today: ceRes.count ?? 0,
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
    console.error("Error fetching activity logs:", error);
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
  }
}
