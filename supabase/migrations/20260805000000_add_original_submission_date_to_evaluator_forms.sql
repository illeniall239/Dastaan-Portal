-- Add original_submission_date to evaluator_forms
-- This optional field lets evaluators specify the actual date when the evaluation was done
-- (e.g., via paper/email) if it differs from when the form was submitted in the system.
-- When set, it overrides submitted_at in all time-based analytics calculations.
-- When null (default), submitted_at is used as before — no breaking change.

ALTER TABLE evaluator_forms ADD COLUMN IF NOT EXISTS original_submission_date DATE;
ALTER TABLE episodic_evaluations ADD COLUMN IF NOT EXISTS original_submission_date DATE;

COMMENT ON COLUMN evaluator_forms.original_submission_date IS 'Optional override for submitted_at in analytics. Use when evaluation was done at an earlier date than system submission.';
COMMENT ON COLUMN episodic_evaluations.original_submission_date IS 'Optional override for submitted_at in analytics. Use when evaluation was done at an earlier date than system submission.';
