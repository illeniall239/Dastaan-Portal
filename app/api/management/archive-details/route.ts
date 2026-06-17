import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { getCombinedArchiveDetails, getArchiveDetailsStats } from '@/lib/management/archive-details';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    const searchParams = request.nextUrl.searchParams;
    const genre = searchParams.get('genre') || undefined;

    const [details, stats] = await Promise.all([
      getCombinedArchiveDetails(genre),
      getArchiveDetailsStats(genre),
    ]);

    return NextResponse.json({
      details,
      stats,
    });
  } catch (error) {
    logger.error(`Error in archive-details API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch archive details' },
      { status: 500 }
    );
  }
}
