-- Add original_submission_date to revision tables
-- Matches the pattern from episodes/call_reports tables.
-- When NULL, analytics use created_at via COALESCE.

ALTER TABLE episode_revisions ADD COLUMN IF NOT EXISTS original_submission_date DATE;
ALTER TABLE call_report_revisions ADD COLUMN IF NOT EXISTS original_submission_date DATE;

COMMENT ON COLUMN episode_revisions.original_submission_date IS 'Optional override for created_at in analytics. Use when backfilling historical revision entries.';
COMMENT ON COLUMN call_report_revisions.original_submission_date IS 'Optional override for created_at in analytics. Use when backfilling historical revision entries.';
