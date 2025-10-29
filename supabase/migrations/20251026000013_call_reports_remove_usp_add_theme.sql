-- Remove USP and add theme to call_reports

ALTER TABLE call_reports
  DROP COLUMN IF EXISTS usp;

ALTER TABLE call_reports
  ADD COLUMN IF NOT EXISTS theme TEXT;

COMMENT ON COLUMN call_reports.theme IS 'Central theme of the story idea';


