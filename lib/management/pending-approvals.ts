import { createAdminClient } from '@/lib/supabase/admin';
import { handleError } from '@/lib/errors';

export interface PendingApproval {
  id: string;
  story_id: string;
  title: string;
  genre: string;
  creator_name: string;
  creator_id: string;
  submitted_date: string;
  days_pending: number;
  evaluation_score: number;
  evaluation_count: number;
  recommendation: string;
}

export async function getPendingApprovals() {
  const supabase = createAdminClient();

  const { data: stories, error } = await supabase
    .from('stories')
    .select(`
      id,
      story_id,
      title,
      genre,
      created_at,
      updated_at,
      creator:users!stories_created_by_fkey (
        id,
        name
      ),
      evaluation_logs (
        total_avg_score,
        completed_evaluations,
        recommendation
      )
    `)
    .eq('status', 'approved')  // Stories that have been evaluated and approved, awaiting executive approval
    .order('updated_at', { ascending: true });

  if (error) {
    return handleError(error, {
      context: 'getPendingApprovals',
      fallbackValue: [],
      userMessage: 'Failed to fetch pending approvals',
    });
  }

  const now = new Date();

  const pendingApprovals: PendingApproval[] = (stories || []).map(story => {
    const submittedDate = new Date(story.updated_at);
    const daysPending = Math.floor((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));

    const evaluationLog = Array.isArray(story.evaluation_logs) && story.evaluation_logs.length > 0
      ? story.evaluation_logs[0]
      : null;

    return {
      id: story.id,
      story_id: story.story_id,
      title: story.title,
      genre: story.genre || 'Unspecified',
      creator_name: (story.creator as any)?.name || 'Unknown',
      creator_id: (story.creator as any)?.id || '',
      submitted_date: story.updated_at,
      days_pending: daysPending,
      evaluation_score: evaluationLog?.total_avg_score || 0,
      evaluation_count: evaluationLog?.completed_evaluations || 0,
      recommendation: evaluationLog?.recommendation || 'N/A',
    };
  });

  return pendingApprovals;
}

export async function getPendingApprovalsStats() {
  const approvals = await getPendingApprovals();

  const stats = {
    total: approvals.length,
    urgentCount: approvals.filter(a => a.days_pending > 7).length, // > 7 days
    avgDaysPending: 0,
    avgEvaluationScore: 0,
  };

  if (approvals.length > 0) {
    stats.avgDaysPending = Math.round(
      approvals.reduce((sum, a) => sum + a.days_pending, 0) / approvals.length
    );
    stats.avgEvaluationScore = Number(
      (approvals.reduce((sum, a) => sum + a.evaluation_score, 0) / approvals.length).toFixed(2)
    );
  }

  return stats;
}
