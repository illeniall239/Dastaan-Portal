/**
 * Roadmap Constants
 *
 * Stage definitions, labels, colors, and icons for the visual idea roadmap.
 */

import type { RoadmapStage } from '@/types';

/**
 * Ordered list of all workflow stages
 */
export const STAGE_ORDER: RoadmapStage[] = [
  'submission',
  'evaluation',
  'approval',
  'contract_terms',
  'legal_review',
  'contract',
  'payment',
  'completed',
];

/**
 * Configuration for each stage including display properties
 */
export const STAGE_CONFIG: Record<
  RoadmapStage,
  {
    label: string;
    shortLabel: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
  }
> = {
  submission: {
    label: 'Submission',
    shortLabel: 'Submit',
    icon: 'FileText',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    description: 'Idea submitted and logged in the system',
  },
  evaluation: {
    label: 'Evaluation',
    shortLabel: 'Eval',
    icon: 'ClipboardCheck',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    description: 'Under review by evaluators',
  },
  approval: {
    label: 'Approval',
    shortLabel: 'Approve',
    icon: 'ThumbsUp',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    description: 'One-liner created and pending approval',
  },
  contract_terms: {
    label: 'Contract Terms',
    shortLabel: 'Terms',
    icon: 'Handshake',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    description: 'Negotiating contract terms and price',
  },
  legal_review: {
    label: 'Legal Review',
    shortLabel: 'Legal',
    icon: 'Scale',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    description: 'Contract under legal review',
  },
  contract: {
    label: 'Contract',
    shortLabel: 'Contract',
    icon: 'FileSignature',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-300',
    description: 'Contract signing and finalization',
  },
  payment: {
    label: 'Payment',
    shortLabel: 'Payment',
    icon: 'Wallet',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    description: 'Payment milestones in progress',
  },
  completed: {
    label: 'Completed',
    shortLabel: 'Done',
    icon: 'CheckCircle2',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    description: 'All milestones complete',
  },
};

/**
 * Get stage number (1-based) from stage name
 */
export function getStageNumber(stage: RoadmapStage): number {
  return STAGE_ORDER.indexOf(stage) + 1;
}

/**
 * Get stage name from stage number (1-based)
 */
export function getStageFromNumber(stageNumber: number): RoadmapStage | null {
  if (stageNumber < 1 || stageNumber > STAGE_ORDER.length) {
    return null;
  }
  return STAGE_ORDER[stageNumber - 1];
}

/**
 * Calculate progress percentage based on current stage
 */
export function calculateProgressFromStage(stage: RoadmapStage): number {
  const stageNumber = getStageNumber(stage);
  // Each stage represents 12.5% (100/8)
  return Math.round((stageNumber / STAGE_ORDER.length) * 100);
}

/**
 * Check if an idea is considered "stuck" (in same stage for too long)
 */
export const STUCK_THRESHOLD_DAYS = 14;
