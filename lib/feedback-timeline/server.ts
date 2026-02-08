/**
 * Feedback Timeline Server Module
 *
 * Server-side functions for fetching evaluation feedback timeline data.
 * Used by the Programmer's Portal to monitor evaluation timelines across teams.
 *
 * Data Flow:
 * evaluator_forms -> call_reports -> teams
 * evaluator_forms -> users (evaluator)
 */

import { createClient } from '@/lib/supabase/server';
import type { FeedbackTimelineItem, FeedbackTimelineStats, TeamType, UserRole } from '@/types';

/**
 * Calculate the number of days between two dates
 */
function daysBetween(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Transform raw database result into FeedbackTimelineItem
 */
function transformToTimelineItem(row: any): FeedbackTimelineItem {
  const callReport = row.call_report;
  const team = callReport?.team;
  const evaluator = row.evaluator;

  // Calculate days to review
  const daysToReview = daysBetween(callReport?.created_at, row.submitted_at);

  return {
    id: row.id,
    formId: row.form_id,
    callReportId: row.call_report_id,
    projectTitle: callReport?.working_title || 'Unknown Project',
    teamName: team?.name || null,
    teamType: (team?.team_type as TeamType) || null,

    // Timeline timestamps
    callReportCreatedAt: callReport?.created_at || null,
    submittedAt: row.submitted_at,
    daysToReview,

    // Delay tracking
    isLate: row.is_late || false,
    delayReason: row.delay_reason || null,

    // Evaluation details
    evaluatorName: evaluator?.name || null,
    evaluatorRole: (evaluator?.role as UserRole) || null,
    decision: row.decision || null,
    averageScore: row.average_score ? parseFloat(row.average_score) : null,

    // Cross-team sharing
    isCrossTeam: !!row.cross_team_share_id,
    crossTeamShareId: row.cross_team_share_id || null,
  };
}

/**
 * Fetch all evaluator forms with feedback timeline data
 *
 * Joins: evaluator_forms -> call_reports -> teams
 *        evaluator_forms -> users (evaluator)
 *
 * @returns Array of FeedbackTimelineItem
 */
export async function getFeedbackTimeline(): Promise<FeedbackTimelineItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('evaluator_forms')
    .select(`
      id,
      form_id,
      call_report_id,
      cross_team_share_id,
      submitted_at,
      is_late,
      delay_reason,
      average_score,
      decision,
      evaluator:users!evaluator_id (
        id,
        name,
        role
      ),
      call_report:call_reports!call_report_id (
        id,
        call_report_id,
        working_title,
        created_at,
        team_id,
        team:teams (
          id,
          name,
          team_type
        )
      )
    `)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching feedback timeline:', error);
    throw new Error(`Failed to fetch feedback timeline: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Transform the data
  return data.map(transformToTimelineItem);
}

/**
 * Calculate aggregate stats for the feedback timeline
 *
 * @returns FeedbackTimelineStats object
 */
export async function getFeedbackTimelineStats(): Promise<FeedbackTimelineStats> {
  const supabase = await createClient();

  // Fetch evaluator forms and call reports in parallel
  const [formsResult, callReportsResult] = await Promise.all([
    supabase
      .from('evaluator_forms')
      .select(`
        id,
        submitted_at,
        is_late,
        call_report_id,
        call_report:call_reports!call_report_id (
          created_at
        )
      `),
    supabase
      .from('call_reports')
      .select('id'),
  ]);

  if (formsResult.error) {
    console.error('Error fetching feedback timeline stats:', formsResult.error);
    throw new Error(`Failed to fetch feedback timeline stats: ${formsResult.error.message}`);
  }

  if (callReportsResult.error) {
    console.error('Error fetching call reports:', callReportsResult.error);
    throw new Error(`Failed to fetch call reports: ${callReportsResult.error.message}`);
  }

  const data = formsResult.data || [];
  const allCallReports = callReportsResult.data || [];

  // Call reports that have at least one submitted evaluation
  const evaluatedCallReportIds = new Set(
    data.filter(form => form.submitted_at).map(form => form.call_report_id)
  );

  // Pending = call reports with no submitted evaluation
  const pendingReview = allCallReports.filter(cr => !evaluatedCallReportIds.has(cr.id)).length;

  if (data.length === 0 && allCallReports.length === 0) {
    return {
      totalEvaluations: 0,
      pendingReview: 0,
      reviewed: 0,
      lateCount: 0,
      averageReviewDays: 0,
      onTimePercentage: 0,
    };
  }

  // Count evaluations by status
  const reviewed = data.filter(form => form.submitted_at).length;
  const lateCount = data.filter(form => form.is_late).length;

  // Calculate average review time
  let totalReviewDays = 0;
  let reviewedWithDates = 0;

  for (const form of data) {
    const callReport = form.call_report as any;
    if (form.submitted_at && callReport?.created_at) {
      const days = daysBetween(callReport.created_at, form.submitted_at);
      if (days !== null && days >= 0) {
        totalReviewDays += days;
        reviewedWithDates++;
      }
    }
  }

  const averageReviewDays = reviewedWithDates > 0
    ? Math.round((totalReviewDays / reviewedWithDates) * 10) / 10
    : 0;

  // Calculate on-time percentage (evaluations submitted within 3 days)
  const completedReviews = data.filter(form => form.submitted_at);
  const onTimeCount = completedReviews.filter(form => !form.is_late).length;
  const onTimePercentage = completedReviews.length > 0
    ? Math.round((onTimeCount / completedReviews.length) * 100)
    : 0;

  return {
    totalEvaluations: data.length,
    pendingReview,
    reviewed,
    lateCount,
    averageReviewDays,
    onTimePercentage,
  };
}
