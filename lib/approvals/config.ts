// Story approval gate configuration
// 3/5 approvals required: 2 mandatory management + 1 from evaluator head / counter evaluator / programmer

export const MANDATORY_APPROVERS = [
  { email: 'humera.safder@geo.tv', label: 'Humera' },
  { email: 'salman.ahmed@geo.tv', label: 'Salman' },
] as const;

export const REQUIRED_APPROVAL_COUNT = 3;

export const MANDATORY_APPROVER_EMAILS = MANDATORY_APPROVERS.map(a => a.email);
