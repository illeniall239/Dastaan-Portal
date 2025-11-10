-- Add initial assessment rating to call reports
-- This allows content managers to provide an initial 1-10 rating when logging writer engagement reports

-- Add overall_rating column to call_reports table
ALTER TABLE call_reports
  ADD COLUMN IF NOT EXISTS overall_rating INTEGER;

-- Add check constraint to ensure rating is between 1 and 10
ALTER TABLE call_reports
  ADD CONSTRAINT call_reports_overall_rating_check
  CHECK (overall_rating IS NULL OR (overall_rating >= 1 AND overall_rating <= 10));

-- Add comment explaining the purpose of this field
COMMENT ON COLUMN call_reports.overall_rating IS 'Initial assessment score (1-10) from content manager when logging the call report. Evaluators see this when they evaluate the story.';
