-- Add genre field to call_reports table
-- This allows tracking the genre of story ideas at the call report stage

-- Add genre column (required, but accepts any text value)
ALTER TABLE call_reports
ADD COLUMN genre TEXT NOT NULL DEFAULT 'other';

-- Remove the default after adding the column (for future inserts, genre must be provided)
ALTER TABLE call_reports
ALTER COLUMN genre DROP DEFAULT;

-- Add comment explaining the field
COMMENT ON COLUMN call_reports.genre IS 'Genre/category of the story idea - required field that accepts any text value';

