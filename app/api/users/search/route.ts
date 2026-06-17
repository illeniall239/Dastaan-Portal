import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit, addRateLimitHeaders, handleApiError } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { searchQuerySchema } from "@/lib/validations/query-params";
import { UserRepository } from "@/lib/repositories/user-repository";

export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply rate limiting: 30 requests per minute for user search
    const rateLimitResult = await applyRateLimit(request, RateLimitPresets.standard, user.id);
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
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

    // Also search writers table
    const { data: writers } = await supabase
      .from('writers')
      .select('id, name, email, phone')
      .eq('status', 'active')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name', { ascending: true })
      .limit(10);

    // Add type indicator to users
    const usersWithType = users.map(user => ({
      ...user,
      type: 'user' as const,
    }));

    // Add type indicator to writers (with role as 'writer')
    const writersWithType = (writers || []).map(writer => ({
      id: writer.id,
      name: writer.name,
      email: writer.email || null,
      role: 'writer',
      department: null,
      type: 'writer' as const,
    }));

    // Combine results (users first, then writers)
    const combined = [...usersWithType, ...writersWithType];

    logger.info(`Found ${users.length} users and ${writers?.length || 0} writers`);
    const response = NextResponse.json({ users: combined });
    return addRateLimitHeaders(response, rateLimitResult.result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
