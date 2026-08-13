import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';
import { requireApiAuth } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(["management", "management_viewer"]);
    if (!auth.success) return auth.response;
    const user = auth.user;

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    const supabase = createAdminClient();

    // Fetch evaluations with associated project and evaluator information
    const { data: evaluations, error } = await supabase
      .from('evaluator_forms')
      .select(`
        id,
        average_score,
        created_at,
        call_report_id,
        call_reports (
          working_title,
          writer_name,
          team_id,
          team:teams (
            id,
            name,
            team_type
          )
        ),
        evaluator_id,
        users!evaluator_forms_evaluator_id_fkey (
          name
        )
      `)
      .not('average_score', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching evaluations:', error);
      return Response.json({ error: 'Failed to fetch evaluations' }, { status: 500 });
    }

    // Transform the data to group by project and evaluator
    const transformedData = evaluations?.map(evaluation => {
      // Supabase returns nested relations as arrays, so we need to get the first element
      const callReport = Array.isArray(evaluation.call_reports)
        ? evaluation.call_reports[0]
        : evaluation.call_reports;
      const evaluatorUser = Array.isArray(evaluation.users)
        ? evaluation.users[0]
        : evaluation.users;
      const team = callReport?.team && Array.isArray(callReport.team)
        ? callReport.team[0]
        : callReport?.team;

      return {
        id: evaluation.id,
        projectId: evaluation.call_report_id,
        projectName: callReport?.working_title || 'Unknown Project',
        writerName: callReport?.writer_name || 'Unknown Writer',
        evaluatorId: evaluation.evaluator_id,
        evaluatorName: evaluatorUser?.name || 'Unknown Evaluator',
        averageScore: evaluation.average_score,
        createdAt: evaluation.created_at,
        team: team || undefined
      };
    }) || [];

    return Response.json({ evaluations: transformedData });
  } catch (error) {
    logger.error('Unexpected error in overall evaluations API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}