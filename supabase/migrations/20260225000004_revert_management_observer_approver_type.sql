-- Revert: remove 'management_observer' from approver_type CHECK constraint.
-- All management votes are stored as 'management' for a full audit trail.
-- Threshold logic filters by mandatory approver emails in application code.

ALTER TABLE story_approvals
  DROP CONSTRAINT IF EXISTS story_approvals_approver_type_check;

ALTER TABLE story_approvals
  ADD CONSTRAINT story_approvals_approver_type_check
  CHECK (approver_type IN ('management', 'evaluator', 'programmer'));
