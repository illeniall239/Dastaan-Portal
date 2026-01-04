import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';

/**
 * GET /api/evaluations/completed-today
 * Returns the count of evaluations completed today (both call report and episodic)
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.relaxed);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const adminClient = createAdminClient();

    // Get start of today in UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get end of today in UTC
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    // Fetch call report evaluations completed today
    const { data: callReportEvals, error: callReportError } = await adminClient
      .from("evaluator_forms")
      .select("id", { count: "exact", head: false })
      .gte("submitted_at", todayISO)
      .lt("submitted_at", tomorrowISO)
      .not("submitted_at", "is", null);

    if (callReportError) {
      logger.error("Error fetching call report evaluations for today:", { error: callReportError });
    }

    // Fetch episodic evaluations completed today
    const { data: episodicEvals, error: episodicError } = await adminClient
      .from("episodic_evaluations")
      .select("id", { count: "exact", head: false })
      .gte("submitted_at", todayISO)
      .lt("submitted_at", tomorrowISO);

    if (episodicError) {
      logger.error("Error fetching episodic evaluations for today:", { error: episodicError });
    }

    const callReportCount = callReportEvals?.length || 0;
    const episodicCount = episodicEvals?.length || 0;
    const totalCompletedToday = callReportCount + episodicCount;

    return NextResponse.json(
      {
        success: true,
        completedToday: totalCompletedToday,
        breakdown: {
          callReportEvaluations: callReportCount,
          episodicEvaluations: episodicCount,
        },
        date: today.toISOString().split('T')[0],
      },
      {
        headers: {
          'Cache-Control': createCacheControl(CACHE_DURATION.REALTIME),
        },
      }
    );
  } catch (error) {
    logger.error(`Error fetching completed evaluations for today: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Failed to fetch completed evaluations for today" },
      { status: 500 }
    );
  }
}
