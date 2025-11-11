import { NextRequest, NextResponse } from "next/server";
import { getStakeholderDashboardStats } from "@/lib/dashboard/server";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    // Fetch stakeholder dashboard statistics
    const stats = await getStakeholderDashboardStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error(`Error fetching dashboard stats: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}