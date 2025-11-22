-- Add location column to call_reports table for meeting location/platform
ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN call_reports.location IS 'Meeting location or platform (e.g., Conference Room A, Zoom, Teams)';
