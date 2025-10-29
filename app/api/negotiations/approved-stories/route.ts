import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  applyRateLimit,
  addRateLimitHeaders,
} from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

/**
 * GET /api/negotiations/approved-stories
 * Fetch all approved stories eligible for negotiation
 */
export async function GET(request: Request) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !userData ||
    !["content_manager", "evaluator", "admin"].includes(userData.role)
  ) {
    return NextResponse.json(
      { error: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("stories")
      .select("id, story_id, title, writer_originator_name, genre, status")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching approved stories:", error);
      return NextResponse.json(
        { error: "Failed to fetch approved stories", details: error.message },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      stories: data || [],
      count: data?.length || 0,
    });

    return addRateLimitHeaders(res, rate.result);
  } catch (error) {
    console.error("Error in GET /api/negotiations/approved-stories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
