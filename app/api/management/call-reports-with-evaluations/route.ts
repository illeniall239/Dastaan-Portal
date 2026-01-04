import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSegregatedEvaluations } from "@/lib/evaluations/server";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const adminClient = createAdminClient();

    // Get all call reports that have evaluations
    // We query the call_report_evaluations_with_type view to get unique call_report_ids
    const { data: callReportIds, error: idsError } = await adminClient
      .from("call_report_evaluations_with_type")
      .select("call_report_id")
      .order("created_at", { ascending: false });

    if (idsError) {
      throw new Error(`Failed to fetch call report IDs: ${idsError.message}`);
    }

    // Get unique call report IDs
    const uniqueCallReportIds = [...new Set(callReportIds?.map(item => item.call_report_id) || [])];

    if (uniqueCallReportIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          callReports: [],
        },
        {
          headers: {
            'Cache-Control': createCacheControl(CACHE_DURATION.ANALYTICS),
          },
        }
      );
    }

    // Fetch call report details for these IDs
    const { data: callReportsData, error: callReportsError } = await adminClient
      .from("call_reports")
      .select(`
        id,
        call_report_id,
        working_title,
        writer_name,
        meeting_date,
        created_at,
        updated_at
      `)
      .in("id", uniqueCallReportIds)
      .order("created_at", { ascending: false });

    if (callReportsError) {
      throw new Error(`Failed to fetch call reports: ${callReportsError.message}`);
    }

    // OPTIMIZATION: Fetch all evaluations in a single query instead of N queries
    const { data: allEvaluations, error: evaluationsError } = await adminClient
      .from("call_report_evaluations_with_type")
      .select("*")
      .in("call_report_id", uniqueCallReportIds)
      .order("created_at", { ascending: false });

    if (evaluationsError) {
      logger.error("Error fetching evaluations:", { error: evaluationsError });
      // Continue with empty evaluations rather than failing completely
    }

    // Group evaluations by call_report_id
    const evaluationsByCallReport = new Map();
    (allEvaluations || []).forEach(evaluation => {
      if (!evaluationsByCallReport.has(evaluation.call_report_id)) {
        evaluationsByCallReport.set(evaluation.call_report_id, []);
      }
      evaluationsByCallReport.get(evaluation.call_report_id).push(evaluation);
    });

    // Map call reports with their evaluations (no async/await needed now!)
    const callReportsWithEvaluations = (callReportsData || []).map((callReport) => {
      const evaluations = evaluationsByCallReport.get(callReport.id) || [];

      // Segregate evaluations by type
      const evaluatorEvaluations = evaluations.filter((e: any) => e.evaluation_type === 'evaluator');
      const managementEvaluations = evaluations.filter((e: any) => e.evaluation_type === 'management');
      const programmerEvaluations = evaluations.filter((e: any) => e.evaluation_type === 'programmer');

      const segregatedEvaluations = {
        evaluatorEvaluations,
        managementEvaluations,
        programmerEvaluations,
        total: evaluations.length,
        evaluatorCount: evaluatorEvaluations.length,
        managementCount: managementEvaluations.length,
        programmerCount: programmerEvaluations.length,
      };

      return {
        id: callReport.id,
        callReportId: callReport.call_report_id,
        workingTitle: callReport.working_title,
        writerName: callReport.writer_name,
        meetingDate: callReport.meeting_date,
        createdAt: callReport.created_at,
        updatedAt: callReport.updated_at,
        evaluationCount: segregatedEvaluations.total,
        segregatedEvaluations,
      };
    });

    return NextResponse.json(
      {
        success: true,
        callReports: callReportsWithEvaluations,
      },
      {
        headers: {
          'Cache-Control': createCacheControl(CACHE_DURATION.ANALYTICS),
        },
      }
    );
  } catch (error) {
    logger.error(`Error fetching call reports with evaluations: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: "Failed to fetch call reports with evaluations" },
      { status: 500 }
    );
  }
}
