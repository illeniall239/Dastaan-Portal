import { createClient } from "@/lib/supabase/server";
import { clearUserSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";
import { extractUserContext } from "@/lib/logger/context";

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

    const userContext = extractUserContext(request);

    if (user) {
      await supabase.auth.signOut();
      // Clear session cookie
      await clearUserSession();

      // Log successful logout
      logger.info(`User signed out successfully - userId: ${user.id}, ip: ${userContext.ipAddress}`);
    } else {
      logger.warn(`Signout attempt with no active session - ip: ${userContext.ipAddress}`);
    }

    revalidatePath("/", "layout");

    const response = NextResponse.json({ success: true });
    return addRateLimitHeaders(withCors(request, response), rateLimitResult.result);
  } catch (error) {
    const ctx = extractUserContext(request);
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Signout failed - error: ${errorMsg}, ip: ${ctx.ipAddress}`);
    return withCors(request, NextResponse.json(
      { error: "Failed to sign out" },
      { status: 500 }
    ));
  }
}
