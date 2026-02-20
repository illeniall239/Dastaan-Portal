-- Add call_report_id to negotiations so contract terms can be created
-- directly from approved call reports (without needing a linked story).
ALTER TABLE negotiations
  ADD COLUMN IF NOT EXISTS call_report_id UUID REFERENCES call_reports(id);
