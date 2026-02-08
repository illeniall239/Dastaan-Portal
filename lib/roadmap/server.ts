/**
 * Roadmap Server Module
 *
 * Server-side functions for fetching roadmap data.
 * Aggregates data from multiple tables to build the complete idea journey.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  RoadmapData,
  RoadmapListItem,
  RoadmapStats,
  RoadmapStage,
  RoadmapStageData,
  RoadmapActor,
} from '@/types';
import {
  STAGE_ORDER,
  getStageNumber,
  calculateProgressFromStage,
  STUCK_THRESHOLD_DAYS,
} from './constants';
import {
  daysBetween,
  daysFromNow,
  createActor,
  determineCurrentStage,
  buildSubmissionStage,
  buildEvaluationStage,
  buildApprovalStage,
  buildContractTermsStage,
  buildLegalReviewStage,
  buildContractStage,
  buildPaymentStage,
  buildCompletedStage,
} from './utils';

/**
 * Fetch all call reports as roadmap list items
 * Returns lightweight data for the list view
 */
/**
 * Fetch all call reports as roadmap list items
 * Returns lightweight data for the list view from the consolidated view
 */
export async function getRoadmapList(): Promise<RoadmapListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('roadmap_list_view')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching roadmap list from view:', error);
    throw new Error(`Failed to fetch roadmap list: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    callReportId: item.call_report_id,
    workingTitle: item.working_title,
    teamName: item.team_name || null,
    teamType: (item.team_type as any) || null,
    currentStage: item.current_stage as RoadmapStage,
    currentStageNumber: getStageNumber(item.current_stage as RoadmapStage),
    overallProgress: calculateProgressFromStage(item.current_stage as RoadmapStage),
    loggedAt: item.created_at,
    lastActivityAt: item.last_activity_at,
    totalDays: daysFromNow(item.created_at),
  }));
}


/**
 * Fetch complete roadmap data for a single call report
 * Optimized with parallel queries and batched user lookups
 */
export async function getRoadmapData(callReportId: string): Promise<RoadmapData | null> {
  const supabase = await createClient();

  // Step 1: Fetch call report first (required for subsequent queries)
  const { data: callReport, error } = await supabase
    .from('call_reports')
    .select('*')
    .eq('id', callReportId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch roadmap data: ${error.message}`);
  }

  if (!callReport) {
    return null;
  }

  // Step 2: Parallel fetch all independent data
  const [
    teamResult,
    callReportWritersResult,
    evaluationsResult,
    oneLinerResult,
    // Story-linked queries (conditional but can start in parallel)
    negotiationResult,
    legalReviewResult,
    contractResult,
    paymentsResult,
  ] = await Promise.all([
    // Team
    callReport.team_id
      ? supabase.from('teams').select('id, name, team_type').eq('id', callReport.team_id).single()
      : Promise.resolve({ data: null, error: null }),
    // Writers join table
    supabase.from('call_report_writers').select('writer_id').eq('call_report_id', callReportId),
    // Evaluations
    supabase
      .from('evaluator_forms')
      .select('id, submitted_at, average_score, decision, evaluator_id')
      .eq('call_report_id', callReportId)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false }),
    // One-liner
    supabase
      .from('detailed_one_liners')
      .select('id, created_at, created_by')
      .eq('call_report_id', callReportId)
      .maybeSingle(),
    // Story-linked data (only if story_id exists)
    callReport.story_id
      ? supabase.from('negotiations').select('*').eq('story_id', callReport.story_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    callReport.story_id
      ? supabase.from('legal_reviews').select('*').eq('story_id', callReport.story_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    callReport.story_id
      ? supabase.from('contracts').select('*').eq('story_id', callReport.story_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    callReport.story_id
      ? supabase
          .from('payments')
          .select('*, payment_schedules!inner(contracts!inner(story_id))')
          .eq('payment_schedules.contracts.story_id', callReport.story_id)
          .order('payment_date', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Extract data from results
  const team = teamResult.data;
  const callReportWriters = callReportWritersResult.data;
  const evaluations = evaluationsResult.data || [];
  const oneLiner = oneLinerResult.data;
  const negotiation = negotiationResult.data;
  const legalReview = legalReviewResult.data;
  const contract = contractResult.data;
  const payments = paymentsResult.data || [];

  // Step 3: Collect all user IDs and batch fetch
  const userIds = new Set<string>();
  if (callReport.created_by) userIds.add(callReport.created_by);
  if (oneLiner?.created_by) userIds.add(oneLiner.created_by);
  if (legalReview?.decided_by) userIds.add(legalReview.decided_by);
  evaluations.forEach((e) => {
    if (e.evaluator_id) userIds.add(e.evaluator_id);
  });

  // Single batch query for all users
  let usersMap = new Map<string, { id: string; name: string; role?: string }>();
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, role')
      .in('id', Array.from(userIds));
    if (users) {
      usersMap = new Map(users.map((u) => [u.id, u]));
    }
  }

  // Step 4: Fetch writers (needs writer IDs from step 2)
  let writerNames: string[] = [];
  if (callReportWriters && callReportWriters.length > 0) {
    const writerIds = callReportWriters.map((w) => w.writer_id);
    const { data: writers } = await supabase.from('writers').select('name').in('id', writerIds);
    if (writers) {
      writerNames = writers.map((w) => w.name);
    }
  }
  if (writerNames.length === 0 && callReport.writer_name) {
    writerNames.push(callReport.writer_name);
  }

  // Map user data to entities
  const creator = usersMap.get(callReport.created_by || '') || null;
  const oneLinerCreator = oneLiner?.created_by ? usersMap.get(oneLiner.created_by) || null : null;
  const legalReviewDecidedBy = legalReview?.decided_by ? usersMap.get(legalReview.decided_by) || null : null;

  // Transform evaluations with evaluator data
  const transformedEvaluations = evaluations.map((e) => ({
    ...e,
    evaluator: e.evaluator_id ? usersMap.get(e.evaluator_id) || null : null,
  }));

  const transformedOneLiner = oneLiner ? { ...oneLiner, creator: oneLinerCreator } : null;

  const transformedLegalReview = legalReview
    ? { ...legalReview, decided_by: legalReviewDecidedBy }
    : null;

  // Determine current stage
  const currentStage = determineCurrentStage({
    hasEvaluations: (evaluations?.length || 0) > 0,
    evaluationsComplete: (evaluations?.length || 0) >= 3,
    hasOneLiner: !!oneLiner,
    hasNegotiation: !!negotiation,
    negotiationComplete: negotiation?.status === 'completed' || negotiation?.status === 'accepted',
    hasLegalReview: !!legalReview,
    legalApproved: legalReview?.decision === 'approved',
    hasContract: !!contract,
    contractSigned: !!(contract?.party_a_signed_at && contract?.party_b_signed_at),
    hasPayments: payments.length > 0,
    allPaymentsPaid: payments.length > 0 && payments.every((p) => p.status === 'paid'),
  });

  // Build stages array
  const allPaymentsPaid = payments.length > 0 && payments.every((p) => p.status === 'paid');
  const lastPaymentDate = payments.length > 0
    ? payments
      .filter((p) => p.payment_date)
      .reduce((latest, p) =>
        new Date(p.payment_date) > new Date(latest) ? p.payment_date : latest,
        payments[0]?.payment_date
      )
    : null;

  // Find completion dates for stage progression
  const lastEvaluationDate = evaluations && evaluations.length > 0
    ? evaluations[0].submitted_at
    : null;
  const oneLinerDate = oneLiner?.created_at || null;
  const negotiationCompleteDate = negotiation?.status === 'completed' || negotiation?.status === 'accepted'
    ? negotiation?.updated_at || negotiation?.created_at
    : null;
  const legalApprovedDate = legalReview?.decision === 'approved'
    ? legalReview?.decided_at
    : null;
  const contractSignedDate = contract?.party_a_signed_at && contract?.party_b_signed_at
    ? new Date(contract.party_a_signed_at) > new Date(contract.party_b_signed_at)
      ? contract.party_a_signed_at
      : contract.party_b_signed_at
    : null;

  const stages: RoadmapStageData[] = [
    buildSubmissionStage(
      callReport,
      createActor(creator),
      currentStage
    ),
    buildEvaluationStage(
      transformedEvaluations,
      callReport.created_at,
      currentStage
    ),
    buildApprovalStage(
      transformedOneLiner,
      lastEvaluationDate,
      currentStage
    ),
    buildContractTermsStage(
      negotiation,
      oneLinerDate,
      currentStage
    ),
    buildLegalReviewStage(
      transformedLegalReview,
      negotiationCompleteDate,
      currentStage
    ),
    buildContractStage(
      contract,
      legalApprovedDate,
      currentStage
    ),
    buildPaymentStage(
      payments,
      contractSignedDate,
      currentStage
    ),
    buildCompletedStage(
      allPaymentsPaid,
      lastPaymentDate,
      currentStage
    ),
  ];

  // Calculate last activity
  const activities = [
    callReport.updated_at,
    ...(evaluations?.map((e) => e.submitted_at) || []),
    oneLiner?.created_at,
    negotiation?.created_at,
    legalReview?.decided_at,
    contract?.party_a_signed_at,
    contract?.party_b_signed_at,
    ...payments.map((p) => p.payment_date),
  ].filter(Boolean);

  const lastActivityAt = activities.length > 0
    ? activities.reduce((latest, date) =>
      new Date(date) > new Date(latest) ? date : latest
    )
    : null;

  // Get days in current stage
  const currentStageData = stages.find((s) => s.stage === currentStage);
  const daysInCurrentStage = currentStageData?.startedAt
    ? daysFromNow(currentStageData.startedAt)
    : 0;

  return {
    id: callReport.id,
    callReportId: callReport.call_report_id,
    workingTitle: callReport.working_title,
    teamName: team?.name || null,
    teamType: (team?.team_type as any) || null,
    writers: writerNames,
    loggedAt: callReport.created_at,
    loggedBy: createActor(creator) || {
      id: callReport.created_by,
      name: 'Unknown',
      role: 'content_creator',
    },
    lastActivityAt,
    currentStage,
    currentStageNumber: getStageNumber(currentStage),
    overallProgress: calculateProgressFromStage(currentStage),
    stages,
    totalDays: daysFromNow(callReport.created_at),
    daysInCurrentStage,
  };
}

/**
 * Calculate aggregate statistics for the roadmap
 */
/**
 * Calculate aggregate statistics for the roadmap
 */
export function calculateRoadmapStats(items: RoadmapListItem[]): RoadmapStats {
  // Count by stage
  const byStage: Record<RoadmapStage, number> = {
    submission: 0,
    evaluation: 0,
    approval: 0,
    contract_terms: 0,
    legal_review: 0,
    contract: 0,
    payment: 0,
    completed: 0,
  };

  items.forEach((item) => {
    byStage[item.currentStage]++;
  });

  // Calculate average days to approval
  const approvedItems = items.filter(
    (item) => getStageNumber(item.currentStage) >= getStageNumber('approval')
  );
  const avgDaysToApproval = approvedItems.length > 0
    ? Math.round(
      approvedItems.reduce((sum, item) => sum + item.totalDays, 0) /
      approvedItems.length
    )
    : 0;

  // Count stuck ideas (in same stage > 14 days)
  const stuckIdeas = items.filter((item) => {
    if (item.currentStage === 'completed') return false;
    const daysSinceActivity = item.lastActivityAt
      ? daysFromNow(item.lastActivityAt)
      : item.totalDays;
    return daysSinceActivity > STUCK_THRESHOLD_DAYS;
  }).length;

  return {
    totalIdeas: items.length,
    byStage,
    avgDaysToApproval,
    stuckIdeas,
  };
}
