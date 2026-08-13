import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSegregatedEvaluations } from "@/lib/evaluations/server";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";
import { CACHE_DURATION, createCacheControl } from '@/lib/constants';
import { requireApiAuth } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(["management", "management_viewer"]);
    if (!auth.success) return auth.response;
    const user = auth.user;

    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }
    const adminClient = createAdminClient();

    const { searchParams } = request.nextUrl;
    const filterCallReportId = searchParams.get("call_report_id") || null;

    // Get all call reports that have evaluations
    // We query the call_report_evaluations_with_type view to get unique call_report_ids
    let idsQuery = adminClient
      .from("call_report_evaluations_with_type")
      .select("call_report_id")
      .order("created_at", { ascending: false });

    if (filterCallReportId) {
      idsQuery = idsQuery.eq("call_report_id", filterCallReportId);
    }

    const { data: callReportIds, error: idsError } = await idsQuery;

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

    // Batch-fetch attachments for all call reports
    const { data: attachmentRows } = await adminClient
      .from("attachments")
      .select("id, entity_id, file_name, file_path")
      .eq("entity_type", "call_report")
      .in("entity_id", uniqueCallReportIds);

    const attachmentsByCallReport = new Map<string, { id: string; fileName: string; filePath: string }[]>();
    for (const att of attachmentRows || []) {
      const list = attachmentsByCallReport.get(att.entity_id) || [];
      list.push({ id: att.id, fileName: att.file_name, filePath: att.file_path });
      attachmentsByCallReport.set(att.entity_id, list);
    }

    // Identify Content Development team members (Humera's management-type team only)
    const contentDevUserIds = new Set<string>();
    const { data: mgmtTeams } = await adminClient
      .from("teams")
      .select("id, team_head:users!team_head_id(email)")
      .eq("team_type", "management");

    const contentDevTeamIds = (mgmtTeams || [])
      .filter((t: any) => t.team_head?.email === "humera.safder@geo.tv")
      .map((t: any) => t.id);

    if (contentDevTeamIds.length > 0) {
      const { data: cdUsers } = await adminClient
        .from("users")
        .select("id")
        .in("team_id", contentDevTeamIds);
      for (const u of cdUsers || []) contentDevUserIds.add(u.id);
    }

    // Map call reports with their evaluations
    const callReportsWithEvaluations = (callReportsData || []).map((callReport) => {
      const evaluations = evaluationsByCallReport.get(callReport.id) || [];

      // Segregate evaluations by type, reclassifying management-type team members
      const evaluatorEvaluations: any[] = [];
      const managementEvaluations: any[] = [];
      const programmerEvaluations: any[] = [];
      const contentTeamMap = new Map<string, any[]>();

      for (const e of evaluations) {
        if (contentDevUserIds.has(e.evaluator_id)) {
          const list = contentTeamMap.get("Content Development") || [];
          list.push(e);
          contentTeamMap.set("Content Development", list);
        } else if (e.evaluation_type === 'evaluator') {
          evaluatorEvaluations.push(e);
        } else if (e.evaluation_type === 'programmer') {
          programmerEvaluations.push(e);
        } else {
          managementEvaluations.push(e);
        }
      }

      const contentTeamEvaluations = Array.from(contentTeamMap.entries()).map(([teamName, evals]) => ({
        teamName,
        evaluations: evals,
        count: evals.length,
      }));

      const segregatedEvaluations = {
        evaluatorEvaluations,
        managementEvaluations,
        programmerEvaluations,
        contentTeamEvaluations,
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
        attachments: attachmentsByCallReport.get(callReport.id) || [],
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
