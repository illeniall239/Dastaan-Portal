-- Add original_submission_date to call_reports and episodes
-- This optional field lets users specify the real historical date when backfilling backlog entries.
-- When set, it overrides created_at in all time-based analytics calculations.
-- When null (default), created_at is used as before — no breaking change to existing data.

ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS original_submission_date DATE;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS original_submission_date DATE;

COMMENT ON COLUMN call_reports.original_submission_date IS 'Optional override for created_at in analytics. Use when backfilling historical entries to reflect the actual submission date.';
COMMENT ON COLUMN episodes.original_submission_date IS 'Optional override for created_at in analytics. Use when backfilling historical entries to reflect the actual episode received date.';
