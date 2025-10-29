import { createClient } from "@/lib/supabase/server";
import { clearUserSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Apply rate limiting: 30 requests per minute
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.auth.signOut();
      // Clear session cookie
      await clearUserSession();
    }

    revalidatePath("/", "layout");

    const response = NextResponse.json({ success: true });
    return addRateLimitHeaders(withCors(request, response), rateLimitResult.result);
  } catch (error) {
    console.error("Signout error:", error);
    return withCors(request, NextResponse.json(
      { error: "Failed to sign out" },
      { status: 500 }
    ));
  }
}
