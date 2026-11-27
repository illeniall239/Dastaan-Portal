// Story approval gate configuration
// Veto: mir@geo.tv alone = approved
// Standard: humera + salman + (evaluator team head OR sheeraz OR younas)

export const VETO_APPROVER = { email: 'mir@geo.tv', label: 'Mir' } as const;

export const MANDATORY_APPROVERS = [
  { email: 'humera.safder@geo.tv', label: 'Humera' },
  { email: 'salman.ahmed@geo.tv', label: 'Salman' },
] as const;

export const OPTIONAL_THIRD_APPROVERS = [
  { email: 'sheeraz.kazi@geo.tv', label: 'Sheeraz' },
  { email: 'younas.mohammad@geo.tv', label: 'Younas' },
] as const;

export const REQUIRED_APPROVAL_COUNT = 3;

export const MANDATORY_APPROVER_EMAILS = MANDATORY_APPROVERS.map(a => a.email);
export const OPTIONAL_THIRD_APPROVER_EMAILS = OPTIONAL_THIRD_APPROVERS.map(a => a.email);
export const VETO_APPROVER_EMAIL = VETO_APPROVER.email;

/** How a one-liner approval vote reads: a request for revisions is "in process", not a rejection */
export function voteStyle(decision: string | null | undefined) {
  if (decision === 'approved') return { label: 'Approved', badge: 'bg-green-100 text-green-800 border-green-300', border: 'border-l-green-500', text: 'text-green-600' };
  if (decision === 'needs_revision') return { label: 'Needs Revision', badge: 'bg-amber-100 text-amber-800 border-amber-300', border: 'border-l-amber-500', text: 'text-amber-600' };
  return { label: 'Rejected', badge: 'bg-red-100 text-red-800 border-red-300', border: 'border-l-red-500', text: 'text-red-600' };
}
