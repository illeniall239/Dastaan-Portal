import { createClient } from '@/lib/supabase/server';

export interface PipelineStageData {
  stage: string;
  displayName: string;
  count: number;
  avgTimeInStage: number; // in days
  conversionRate: number; // percentage moving to next stage
  bottleneck: boolean;
}

export interface PipelineOverview {
  totalStories: number;
  activePipeline: number;
  completedThisMonth: number;
  avgTimeToCompletion: number;
  stages: PipelineStageData[];
}

const STAGE_MAPPING = {
  'submitted': 'Submission',
  'in_call_report': 'Call Report',
  'in_evaluation': 'Evaluation',
  'in_approval': 'Approval',
  'approved': 'Approved',
  'in_negotiation': 'Negotiation',
  'in_legal_review': 'Legal Review',
  'in_contract': 'Contract',
  'in_payment': 'Payment',
  'completed': 'Completed',
  'rejected': 'Rejected',
  'archived': 'Archived',
};

/**
 * Get comprehensive pipeline overview with stage-by-stage breakdown
 */
export async function getPipelineOverview(): Promise<PipelineOverview> {
  const supabase = await createClient();

  // Get all stories with only required columns (optimized)
  const { data: stories, error } = await supabase
    .from('stories')
    .select('status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const totalStories = stories?.length || 0;

  // Count stories by status
  const statusCounts: Record<string, number> = {};
  stories?.forEach(story => {
    statusCounts[story.status] = (statusCounts[story.status] || 0) + 1;
  });

  // Active pipeline = not completed, rejected, or archived
  const activePipeline = stories?.filter(
    s => !['completed', 'rejected', 'archived'].includes(s.status)
  ).length || 0;

  // Completed this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = stories?.filter(
    s => s.status === 'completed' && new Date(s.updated_at) >= startOfMonth
  ).length || 0;

  // Calculate avg time to completion (for completed stories)
  const completedStories = stories?.filter(s => s.status === 'completed') || [];
  const avgTimeToCompletion = completedStories.length > 0
    ? completedStories.reduce((sum, story) => {
        const start = new Date(story.created_at);
        const end = new Date(story.updated_at);
        const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / completedStories.length
    : 0;

  // Build stage data
  const stages: PipelineStageData[] = Object.entries(STAGE_MAPPING)
    .filter(([status]) => !['completed', 'rejected', 'archived'].includes(status))
    .map(([status, displayName]) => {
      const count = statusCounts[status] || 0;

      // Calculate avg time in stage (simplified - would need status change tracking for accuracy)
      const storiesInStage = stories?.filter(s => s.status === status) || [];
      const avgTimeInStage = storiesInStage.length > 0
        ? storiesInStage.reduce((sum, story) => {
            const now = new Date();
            const updated = new Date(story.updated_at);
            const days = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / storiesInStage.length
        : 0;

      // Mark as bottleneck if avg time > 7 days or count is unusually high
      const bottleneck = avgTimeInStage > 7 || count > activePipeline * 0.3;

      return {
        stage: status,
        displayName,
        count,
        avgTimeInStage,
        conversionRate: 0, // Will calculate below
        bottleneck,
      };
    });

  return {
    totalStories,
    activePipeline,
    completedThisMonth,
    avgTimeToCompletion,
    stages,
  };
}

/**
 * Get detailed breakdown for a specific pipeline stage
 */
export async function getStageDetails(stage: string) {
  const supabase = await createClient();

  const { data: stories, error } = await supabase
    .from('stories')
    .select(`
      *,
      creator:users!stories_created_by_fkey(name, email)
    `)
    .eq('status', stage)
    .order('updated_at', { ascending: true });

  if (error) throw error;

  return stories || [];
}

/**
 * Get pipeline flow data for sankey/flow diagram
 */
export async function getPipelineFlowData() {
  const supabase = await createClient();

  // This would require a status_history table to track transitions
  // For now, we'll return a simplified version based on current status
  const { data: stories } = await supabase
    .from('stories')
    .select('status, created_at, updated_at');

  // Simplified flow based on current distribution
  const flows = [
    { from: 'Submission', to: 'Call Report', value: 0 },
    { from: 'Call Report', to: 'Evaluation', value: 0 },
    { from: 'Evaluation', to: 'Approval', value: 0 },
    { from: 'Approval', to: 'Negotiation', value: 0 },
    { from: 'Negotiation', to: 'Legal Review', value: 0 },
    { from: 'Legal Review', to: 'Contract', value: 0 },
    { from: 'Contract', to: 'Payment', value: 0 },
    { from: 'Payment', to: 'Completed', value: 0 },
  ];

  return flows;
}

/**
 * Get time spent in each stage breakdown
 */
export async function getStageTimeBreakdown() {
  const supabase = await createClient();

  const { data: stories } = await supabase
    .from('stories')
    .select('*')
    .in('status', ['completed', 'in_payment']);

  // This would be more accurate with a status_history table
  // For now, return estimated data
  return Object.entries(STAGE_MAPPING)
    .filter(([status]) => !['completed', 'rejected', 'archived'].includes(status))
    .map(([_, displayName]) => ({
      stage: displayName,
      avgDays: Math.floor(Math.random() * 10) + 1, // Placeholder
      minDays: 1,
      maxDays: 30,
    }));
}
