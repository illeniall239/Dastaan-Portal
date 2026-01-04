import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/evaluations/check
 * Check if the current user has already evaluated a call report or episode
 *
 * Query params:
 * - callReportId: string (optional) - Check call report evaluation
 * - episodeId: string (optional) - Check episode evaluation
 *
 * Returns:
 * - { evaluated: boolean }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const callReportId = searchParams.get("callReportId");
    const episodeId = searchParams.get("episodeId");

    // Validate that at least one ID is provided
    if (!callReportId && !episodeId) {
      return NextResponse.json(
        { error: "Either callReportId or episodeId is required" },
        { status: 400 }
      );
    }

    // Check call report evaluation
    if (callReportId) {
      const { data, error } = await supabase
        .from("evaluator_forms")
        .select("id")
        .eq("evaluator_id", user.id)
        .eq("call_report_id", callReportId)
        .maybeSingle();

      if (error) {
        logger.error("Error checking call report evaluation:", error);
        return NextResponse.json(
          { error: "Failed to check evaluation status" },
          { status: 500 }
        );
      }

      return NextResponse.json({ evaluated: !!data });
    }

    // Check episode evaluation
    if (episodeId) {
      const { data, error } = await supabase
        .from("episodic_evaluations")
        .select("id")
        .eq("evaluator_id", user.id)
        .eq("episode_id", episodeId)
        .maybeSingle();

      if (error) {
        logger.error("Error checking episode evaluation:", error);
        return NextResponse.json(
          { error: "Failed to check evaluation status" },
          { status: 500 }
        );
      }

      return NextResponse.json({ evaluated: !!data });
    }

    // Should never reach here due to earlier validation
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("Unexpected error in evaluation check:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
