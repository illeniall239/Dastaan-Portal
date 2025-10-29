-- Add meeting_type field to distinguish between scheduled meetings and call reports
-- scheduled_meeting: Future meetings that are scheduled
-- call_report: Past meetings that have been logged/documented

ALTER TABLE call_reports ADD COLUMN meeting_type TEXT NOT NULL DEFAULT 'call_report' CHECK (meeting_type IN ('scheduled_meeting', 'call_report'));

-- Create an index for better query performance
CREATE INDEX idx_call_reports_meeting_type ON call_reports(meeting_type);

-- Add comment for documentation
COMMENT ON COLUMN call_reports.meeting_type IS 'Type of entry: scheduled_meeting for future meetings, call_report for documented past meetings';
