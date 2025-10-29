import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit, addRateLimitHeaders } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

export async function GET(request: Request) {
  // Apply rate limiting: 30 requests per minute for user search
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get search query from URL params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      const response = NextResponse.json({ users: [] });
      return addRateLimitHeaders(response, rateLimitResult.result);
    }

    // Search users by name or email (case-insensitive)
    // Use ilike for case-insensitive search
    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, email, role, department")
      .ilike("name", `%${query}%`)
      .limit(10)
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ Supabase error searching users:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { error: "Failed to search users", details: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Found users:", users?.length || 0);
    const response = NextResponse.json({ users: users || [] });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error: any) {
    console.error("❌ Unexpected error in user search:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
