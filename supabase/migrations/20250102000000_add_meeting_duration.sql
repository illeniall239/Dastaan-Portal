-- Add meeting duration support for Teams-style calendar display
-- This enables meetings to display with proper time blocks showing start/end times

-- Add duration column (in minutes)
ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60 CHECK (duration_minutes > 0);

-- Add computed end_time column for convenience
-- This auto-calculates end time based on meeting_date + duration
ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP GENERATED ALWAYS AS (
  meeting_date + (COALESCE(duration_minutes, 60) * INTERVAL '1 minute')
) STORED;

-- Add index for efficient time-range queries
CREATE INDEX IF NOT EXISTS idx_call_reports_time_range
ON call_reports(meeting_date, end_time);

-- Update existing records to have default 60-minute duration
-- This ensures all existing meetings display correctly as 1-hour blocks
UPDATE call_reports
SET duration_minutes = 60
WHERE duration_minutes IS NULL;

-- Add helpful comment to the table
COMMENT ON COLUMN call_reports.duration_minutes IS 'Meeting duration in minutes (default: 60). Used for visual time block display on calendar.';
COMMENT ON COLUMN call_reports.end_time IS 'Computed meeting end time (meeting_date + duration_minutes). Auto-calculated, do not set manually.';
