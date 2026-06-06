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
