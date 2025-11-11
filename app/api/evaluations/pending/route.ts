import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyRateLimit, addRateLimitHeaders, withCors } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";

/**
 * GET /api/evaluations/pending
 * Fetch pending evaluations for a specific evaluator
 *
 * Query Parameters:
 * - evaluatorId: The evaluator's user ID
 *
 * Returns:
 * - success: boolean
 * - pending: Array of call reports that haven't been evaluated by this evaluator
 */
export async function GET(request: NextRequest) {
  const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
  if (!rate.success) return rate.response!;

  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return withCors(
      request,
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  // Get evaluatorId from query params (defaults to current user)
  const evaluatorId =
    request.nextUrl.searchParams.get("evaluatorId") || user.id;

  try {
    // Fetch all call reports
    const { data: allCallReports, error: callReportsError } = await supabase
      .from("call_reports")
      .select("id, call_report_id, working_title, writer_name, meeting_date, logline")
      .eq("meeting_type", "call_report")
      .order("meeting_date", { ascending: false });

    if (callReportsError) {
      logger.error("Error fetching call reports:", callReportsError);
      return withCors(
        request,
        NextResponse.json(
          {
            success: false,
            error: "Failed to fetch call reports",
            details: callReportsError.message,
          },
          { status: 500 }
        )
      );
    }

    // Fetch evaluations completed by this evaluator
    const { data: myEvaluations, error: evaluationsError } = await supabase
      .from("evaluator_forms")
      .select("call_report_id")
      .eq("evaluator_id", evaluatorId);

    if (evaluationsError) {
      logger.error("Error fetching evaluations:", evaluationsError);
      return withCors(
        request,
        NextResponse.json(
          {
            success: false,
            error: "Failed to fetch evaluations",
            details: evaluationsError.message,
          },
          { status: 500 }
        )
      );
    }

    // Create a Set of evaluated call report IDs for fast lookup
    const evaluatedReportIds = new Set(
      myEvaluations?.map((e) => e.call_report_id) || []
    );

    // Filter out already-evaluated call reports
    const pending = (allCallReports || []).filter(
      (report) => !evaluatedReportIds.has(report.id)
    );

    logger.info(
      `[Pending Evaluations] Evaluator ${evaluatorId}: ${pending.length} pending out of ${allCallReports?.length || 0} total`
    );

    return addRateLimitHeaders(
      withCors(
        request,
        NextResponse.json({
          success: true,
          pending,
        })
      ),
      rate.result
    );
  } catch (error) {
    logger.error("Unexpected error in pending evaluations endpoint:", error);
    return withCors(
      request,
      NextResponse.json(
        {
          success: false,
          error: "Internal server error",
        },
        { status: 500 }
      )
    );
  }
}
