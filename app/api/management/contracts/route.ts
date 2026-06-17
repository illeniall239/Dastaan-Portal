import { NextRequest, NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { getActiveContracts, getActiveContractsStats } from '@/lib/management/active-contracts';
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

    const [contracts, stats] = await Promise.all([
      getActiveContracts(),
      getActiveContractsStats(),
    ]);

    return NextResponse.json({
      contracts,
      stats,
    });
  } catch (error) {
    logger.error(`Error in contracts API: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch active contracts' },
      { status: 500 }
    );
  }
}
