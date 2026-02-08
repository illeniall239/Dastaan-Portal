-- Add remarks column to call_reports
ALTER TABLE call_reports
  ADD COLUMN IF NOT EXISTS remarks TEXT;

COMMENT ON COLUMN call_reports.remarks IS 'Free text remarks/notes for the call report';
