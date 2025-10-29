-- Add slot field to call_reports for target airing time

ALTER TABLE call_reports
  ADD COLUMN IF NOT EXISTS slot TEXT;

COMMENT ON COLUMN call_reports.slot IS 'Target airing slot (e.g., 6 pm, 7 pm, 8 pm, 9 pm)';


