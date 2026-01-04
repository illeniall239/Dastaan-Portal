import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';

/**
 * GET /api/management/pending-evaluations
 * Returns count of call reports/one-liners that have zero evaluations.
 */
export async function GET(request: NextRequest) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) {
    return rate.response;
  }

  try {
    const adminClient = createAdminClient();

    // Total call reports (one-liners) tracked
    const { data: callReports, error: callReportsError } = await adminClient
      .from("call_reports")
      .select("id");

    if (callReportsError) {
      throw new Error(`Failed to fetch call reports: ${callReportsError.message}`);
    }

    // All evaluated call report ids (any evaluation type)
    const { data: evaluated, error: evalError } = await adminClient
      .from("evaluator_forms")
      .select("call_report_id");

    if (evalError) {
      throw new Error(`Failed to fetch evaluations: ${evalError.message}`);
    }

    const evaluatedIds = new Set((evaluated || []).map((e) => e.call_report_id));
    const pendingCount =
      (callReports || []).filter((cr) => cr.id && !evaluatedIds.has(cr.id)).length;

    // Cache for 5 minutes (aggregate data, less time-sensitive)
    return NextResponse.json(
      {
        success: true,
        pendingCount,
      },
      {
        headers: {
          'Cache-Control': createCacheControl(CACHE_DURATION.ANALYTICS),
        },
      }
    );
  } catch (error) {
    logger.error(
      `Error fetching pending evaluations: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending evaluations" },
      { status: 500 }
    );
  }
}

