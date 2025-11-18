-- Add content_type field to call_reports table
-- This field specifies the type/format of the content being proposed
-- Options: Serial, Long Serial, Telefilm, Mini-serial, Ramadan Serial, Series Sitcom, Soap

-- Add the content_type column
ALTER TABLE call_reports
  ADD COLUMN IF NOT EXISTS content_type TEXT;

-- Add CHECK constraint to enforce valid values
ALTER TABLE call_reports
  DROP CONSTRAINT IF EXISTS call_reports_content_type_check;

ALTER TABLE call_reports
  ADD CONSTRAINT call_reports_content_type_check
  CHECK (content_type IN (
    'Serial',
    'Long Serial',
    'Telefilm',
    'Mini-serial',
    'Ramadan Serial',
    'Series Sitcom',
    'Soap'
  ));

-- Add descriptive comment
COMMENT ON COLUMN call_reports.content_type IS 'Type/format of the content: Serial, Long Serial, Telefilm, Mini-serial, Ramadan Serial, Series Sitcom, or Soap';

-- Create index for filtering by content type (useful for analytics and filtering)
CREATE INDEX IF NOT EXISTS idx_call_reports_content_type
  ON call_reports(content_type)
  WHERE content_type IS NOT NULL;

-- Note: Making this field required will be enforced at the application level
-- Existing rows will have NULL values until updated
