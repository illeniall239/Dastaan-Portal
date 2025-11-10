import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit, addRateLimitHeaders, handleApiError } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { searchQuerySchema } from "@/lib/validations/query-params";
import { UserRepository } from "@/lib/repositories/user-repository";

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

    // Get and validate search query from URL params
    const { searchParams } = new URL(request.url);
    const rawQuery = {
      q: searchParams.get("q") || undefined,
    };

    // Validate query parameters
    const validation = searchQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      const response = NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateLimitResult.result);
    }

    const query = validation.data.q;

    if (!query) {
      const response = NextResponse.json({ users: [] });
      return addRateLimitHeaders(response, rateLimitResult.result);
    }

    // Use UserRepository to search users
    const userRepo = new UserRepository('server');
    const users = await userRepo.searchUsers(query, {
      select: 'id, name, email, role, department',
      order: { column: 'name', ascending: true },
      pagination: { limit: 10 },
    });

    logger.info(`Found ${users.length} users`);
    const response = NextResponse.json({ users });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
