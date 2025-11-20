/**
 * Calculate the completion progress of an evaluation draft
 * Based on required fields: 4 scoring criteria + decision (+ decision_notes if reject)
 */

interface EvaluationDraft {
  premiseConflictScore?: number;
  storylinePlotScore?: number;
  episodicProgressionScore?: number;
  charactersScore?: number;
  decision?: 'approve' | 'reject' | '';
  decisionNotes?: string;
  [key: string]: any;
}

interface ProgressResult {
  percentage: number;
  isComplete: boolean;
}

const REQUIRED_SCORE_FIELDS = [
  'premiseConflictScore',
  'storylinePlotScore',
  'episodicProgressionScore',
  'charactersScore',
] as const;

/**
 * Calculate evaluation progress percentage
 * @param draftData - The draft evaluation data
 * @returns Progress percentage (0-100) and completion status
 */
export function calculateEvaluationProgress(
  draftData: EvaluationDraft | null
): ProgressResult {
  if (!draftData) {
    return { percentage: 0, isComplete: false };
  }

  let filledCount = 0;
  let totalRequired = REQUIRED_SCORE_FIELDS.length + 1; // 4 scores + decision

  // Check score fields (must be between 1-10)
  REQUIRED_SCORE_FIELDS.forEach((field) => {
    const value = draftData[field];
    if (typeof value === 'number' && value >= 1 && value <= 10) {
      filledCount++;
    }
  });

  // Check decision field
  if (draftData.decision === 'approve' || draftData.decision === 'reject') {
    filledCount++;

    // If reject, decision_notes becomes required
    if (draftData.decision === 'reject') {
      totalRequired++;
      if (draftData.decisionNotes && draftData.decisionNotes.trim().length > 0) {
        filledCount++;
      }
    }
  }

  const percentage = Math.round((filledCount / totalRequired) * 100);
  const isComplete = percentage === 100;

  return { percentage, isComplete };
}

/**
 * Check if evaluation draft exists and has any data
 */
export function hasDraftData(draftData: EvaluationDraft | null): boolean {
  if (!draftData) return false;

  // Check if any score field has a value
  const hasScores = REQUIRED_SCORE_FIELDS.some((field) => {
    const value = draftData[field];
    return typeof value === 'number' && value >= 1 && value <= 10;
  });

  // Check if decision is set
  const hasDecision = draftData.decision === 'approve' || draftData.decision === 'reject';

  return hasScores || hasDecision;
}
