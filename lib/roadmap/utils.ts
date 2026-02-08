/**
 * Roadmap Utility Functions
 *
 * Helper functions for calculating stage data, determining current stage,
 * and formatting roadmap information.
 */

import type {
  RoadmapStage,
  RoadmapStageStatus,
  RoadmapStageData,
  RoadmapActor,
  UserRole,
} from '@/types';
import { STAGE_ORDER, STAGE_CONFIG, getStageNumber } from './constants';

/**
 * Calculate the number of days between two dates
 */
export function daysBetween(
  startDate: string | Date | null,
  endDate: string | Date | null
): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days from a date until now
 */
export function daysFromNow(startDate: string | Date | null): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Format a date for display
 */
export function formatDateShort(date: string | Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Create a RoadmapActor object from user data
 */
export function createActor(
  user: { id: string; name: string; role?: string } | null
): RoadmapActor | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: (user.role as UserRole) || 'content_creator',
  };
}

/**
 * Determine the current stage of a call report based on related data
 */
export function determineCurrentStage(data: {
  hasEvaluations: boolean;
  evaluationsComplete: boolean;
  hasOneLiner: boolean;
  hasNegotiation: boolean;
  negotiationComplete: boolean;
  hasLegalReview: boolean;
  legalApproved: boolean;
  hasContract: boolean;
  contractSigned: boolean;
  hasPayments: boolean;
  allPaymentsPaid: boolean;
}): RoadmapStage {
  // Work backwards from completion
  if (data.allPaymentsPaid) return 'completed';
  if (data.hasPayments) return 'payment';
  if (data.contractSigned) return 'payment';
  if (data.hasContract) return 'contract';
  if (data.legalApproved) return 'contract';
  if (data.hasLegalReview) return 'legal_review';
  if (data.negotiationComplete) return 'legal_review';
  if (data.hasNegotiation) return 'contract_terms';
  if (data.hasOneLiner) return 'approval';
  if (data.evaluationsComplete) return 'approval';
  if (data.hasEvaluations) return 'evaluation';
  return 'submission';
}

/**
 * Get status for a specific stage based on current stage
 */
export function getStageStatus(
  stage: RoadmapStage,
  currentStage: RoadmapStage
): RoadmapStageStatus {
  const stageNum = getStageNumber(stage);
  const currentNum = getStageNumber(currentStage);

  if (stageNum < currentNum) return 'completed';
  if (stageNum === currentNum) return 'in_progress';
  return 'pending';
}

/**
 * Build stage data for submission stage
 */
export function buildSubmissionStage(
  callReport: {
    created_at: string;
    created_by?: string;
  },
  creator: RoadmapActor | null,
  currentStage: RoadmapStage
): RoadmapStageData {
  const status = getStageStatus('submission', currentStage);
  const config = STAGE_CONFIG.submission;

  return {
    stage: 'submission',
    stageNumber: 1,
    title: config.label,
    status,
    startedAt: callReport.created_at,
    completedAt: status === 'completed' ? callReport.created_at : null,
    daysInStage: status === 'in_progress' ? daysFromNow(callReport.created_at) : 0,
    actor: creator,
    outcome: status !== 'pending' ? 'Idea logged successfully' : null,
  };
}

/**
 * Build stage data for evaluation stage
 */
export function buildEvaluationStage(
  evaluations: Array<{
    submitted_at: string | null;
    evaluator?: { id: string; name: string; role?: string } | null;
    average_score?: number;
    decision?: string;
  }>,
  callReportCreatedAt: string,
  currentStage: RoadmapStage
): RoadmapStageData {
  const status = getStageStatus('evaluation', currentStage);
  const config = STAGE_CONFIG.evaluation;

  const completedEvaluations = evaluations.filter((e) => e.submitted_at);
  const lastEvaluation = completedEvaluations.length > 0
    ? completedEvaluations.reduce((latest, e) =>
        new Date(e.submitted_at!) > new Date(latest.submitted_at!) ? e : latest
      )
    : null;

  const actors = completedEvaluations
    .map((e) => createActor(e.evaluator || null))
    .filter((a): a is RoadmapActor => a !== null);

  const avgScore = completedEvaluations.length > 0
    ? completedEvaluations.reduce((sum, e) => sum + (e.average_score || 0), 0) /
      completedEvaluations.length
    : null;

  return {
    stage: 'evaluation',
    stageNumber: 2,
    title: config.label,
    status,
    startedAt: callReportCreatedAt,
    completedAt: status === 'completed' && lastEvaluation?.submitted_at
      ? lastEvaluation.submitted_at
      : null,
    daysInStage:
      status === 'in_progress' ? daysFromNow(callReportCreatedAt) : null,
    actor: actors.length > 0 ? actors[0] : null,
    actors,
    outcome: completedEvaluations.length > 0
      ? `${completedEvaluations.length} evaluation(s) completed`
      : null,
    outcomeDetails: avgScore !== null ? { averageScore: avgScore.toFixed(1) } : undefined,
  };
}

/**
 * Build stage data for approval stage (one-liner)
 */
export function buildApprovalStage(
  oneLiner: {
    created_at: string;
    created_by?: string;
    creator?: { id: string; name: string; role?: string } | null;
  } | null,
  previousStageCompletedAt: string | null,
  currentStage: RoadmapStage
): RoadmapStageData {
  const status = getStageStatus('approval', currentStage);
  const config = STAGE_CONFIG.approval;

  return {
    stage: 'approval',
    stageNumber: 3,
    title: config.label,
    status,
    startedAt: previousStageCompletedAt,
    completedAt: status === 'completed' && oneLiner?.created_at
      ? oneLiner.created_at
      : null,
    daysInStage:
      status === 'in_progress' && previousStageCompletedAt
        ? daysFromNow(previousStageCompletedAt)
        : null,
    actor: oneLiner?.creator ? createActor(oneLiner.creator) : null,
    outcome: oneLiner ? 'One-liner created' : null,
  };
}

/**
 * Build stage data for contract terms (negotiation) stage
 */
export function buildContractTermsStage(
  negotiation: {
    created_at?: string;
    status?: string;
    agreed_price?: number;
    currency?: string;
  } | null,
  previousStageCompletedAt: string | null,
  currentStage: RoadmapStage
): RoadmapStageData {
  const status = getStageStatus('contract_terms', currentStage);
  const config = STAGE_CONFIG.contract_terms;

  const isComplete = negotiation?.status === 'completed' || negotiation?.status === 'accepted';

  return {
    stage: 'contract_terms',
    stageNumber: 4,
    title: config.label,
    status,
    startedAt: negotiation?.created_at || previousStageCompletedAt || null,
    completedAt: status === 'completed' && isComplete ? negotiation?.created_at || null : null,
    daysInStage:
      status === 'in_progress' && (negotiation?.created_at || previousStageCompletedAt)
        ? daysFromNow(negotiation?.created_at || previousStageCompletedAt || '')
        : null,
    actor: null,
    outcome: negotiation?.agreed_price
      ? `Agreed: ${negotiation.currency || 'PKR'} ${negotiation.agreed_price.toLocaleString()}`
      : negotiation
        ? `Status: ${negotiation.status}`
        : null,
    outcomeDetails: negotiation ? { agreedPrice: negotiation.agreed_price } : undefined,
  };
}

/**
 * Build stage data for legal review stage
 */
export function buildLegalReviewStage(
  legalReview: {
    created_at?: string;
    decided_at?: string;
    decision?: string;
    decided_by?: { id: string; name: string; role?: string } | null;
  } | null,
  previousStageCompletedAt: string | null,
  currentStage: RoadmapStage
): RoadmapStageData {
  const status = getStageStatus('legal_review', currentStage);
  const config = STAGE_CONFIG.legal_review;

  return {
    stage: 'legal_review',
    stageNumber: 5,
    title: config.label,
    status,
    startedAt: legalReview?.created_at || previousStageCompletedAt,
    completedAt: legalReview?.decided_at || null,
    daysInStage:
      status === 'in_progress' && (legalReview?.created_at || previousStageCompletedAt)
        ? daysFromNow(legalReview?.created_at || previousStageCompletedAt)
        : null,
    actor: legalReview?.decided_by ? createActor(legalReview.decided_by) : null,
    outcome: legalReview?.decision
      ? `Decision: ${legalReview.decision}`
      : legalReview
        ? 'Under review'
        : null,
  };
}

/**
 * Build stage data for contract stage
 */
export function buildContractStage(
  contract: {
    created_at?: string;
    status?: string;
    party_a_signed_at?: string;
    party_b_signed_at?: string;
  } | null,
  previousStageCompletedAt: string | null,
  currentStage: RoadmapStage
): RoadmapStageData {
  const status = getStageStatus('contract', currentStage);
  const config = STAGE_CONFIG.contract;

  const bothSigned = contract?.party_a_signed_at && contract?.party_b_signed_at;
  const signedAt = bothSigned
    ? new Date(contract.party_a_signed_at!) > new Date(contract.party_b_signed_at!)
      ? contract.party_a_signed_at
      : contract.party_b_signed_at
    : null;

  return {
    stage: 'contract',
    stageNumber: 6,
    title: config.label,
    status,
    startedAt: contract?.created_at || previousStageCompletedAt,
    completedAt: signedAt || null,
    daysInStage:
      status === 'in_progress' && (contract?.created_at || previousStageCompletedAt)
        ? daysFromNow(contract?.created_at || previousStageCompletedAt)
        : null,
    actor: null,
    outcome: bothSigned
      ? 'Contract signed by both parties'
      : contract?.party_a_signed_at
        ? 'Awaiting party B signature'
        : contract?.party_b_signed_at
          ? 'Awaiting party A signature'
          : contract
            ? `Status: ${contract.status}`
            : null,
  };
}

/**
 * Build stage data for payment stage
 */
export function buildPaymentStage(
  payments: Array<{
    status?: string;
    payment_date?: string;
    amount?: number;
  }>,
  previousStageCompletedAt: string | null,
  currentStage: RoadmapStage
): RoadmapStageData {
  const status = getStageStatus('payment', currentStage);
  const config = STAGE_CONFIG.payment;

  const paidPayments = payments.filter((p) => p.status === 'paid');
  const totalPayments = payments.length;
  const lastPayment = paidPayments.length > 0
    ? paidPayments.reduce((latest, p) =>
        p.payment_date && latest.payment_date
          ? new Date(p.payment_date) > new Date(latest.payment_date)
            ? p
            : latest
          : p
      )
    : null;

  return {
    stage: 'payment',
    stageNumber: 7,
    title: config.label,
    status,
    startedAt: previousStageCompletedAt,
    completedAt: paidPayments.length === totalPayments && totalPayments > 0
      ? lastPayment?.payment_date || null
      : null,
    daysInStage:
      status === 'in_progress' && previousStageCompletedAt
        ? daysFromNow(previousStageCompletedAt)
        : null,
    actor: null,
    outcome: totalPayments > 0
      ? `${paidPayments.length}/${totalPayments} payments completed`
      : null,
    outcomeDetails: {
      paidCount: paidPayments.length,
      totalCount: totalPayments,
    },
  };
}

/**
 * Build stage data for completed stage
 */
export function buildCompletedStage(
  allPaymentsPaid: boolean,
  lastPaymentDate: string | null,
  currentStage: RoadmapStage
): RoadmapStageData {
  const status = getStageStatus('completed', currentStage);
  const config = STAGE_CONFIG.completed;

  return {
    stage: 'completed',
    stageNumber: 8,
    title: config.label,
    status,
    startedAt: allPaymentsPaid ? lastPaymentDate : null,
    completedAt: allPaymentsPaid ? lastPaymentDate : null,
    daysInStage: null,
    actor: null,
    outcome: allPaymentsPaid ? 'All milestones completed' : null,
  };
}
