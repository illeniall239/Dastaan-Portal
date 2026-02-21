import { NextRequest, NextResponse } from "next/server";
import { getRoadmapData } from "@/lib/roadmap/server";
import { logger } from "@/lib/logger";
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    const { id } = await params;

    const data = await getRoadmapData(id);

    if (!data) {
      return NextResponse.json(
        { error: "Call report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("[API] Error fetching roadmap data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch roadmap data: ${errorMessage}` },
      { status: 500 }
    );
  }
}
