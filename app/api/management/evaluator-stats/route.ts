import { NextRequest, NextResponse } from "next/server";
import { getAllEvaluatorStats } from "@/lib/management/evaluator-performance";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    // Parse dates if provided
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (fromParam) {
      fromDate = new Date(fromParam);
      // Validate date
      if (isNaN(fromDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid 'from' date format" },
          { status: 400 }
        );
      }
    }

    if (toParam) {
      toDate = new Date(toParam);
      // Validate date
      if (isNaN(toDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid 'to' date format" },
          { status: 400 }
        );
      }
    }

    // Fetch evaluator stats with optional date filtering
    const stats = await getAllEvaluatorStats(fromDate, toDate);

    return NextResponse.json({
      success: true,
      stats,
      filter: {
        from: fromParam || null,
        to: toParam || null,
      },
    });
  } catch (error) {
    console.error("Error fetching evaluator stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluator stats" },
      { status: 500 }
    );
  }
}
