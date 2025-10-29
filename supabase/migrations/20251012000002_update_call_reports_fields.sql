-- Add missing fields to call_reports table to match workflow requirements

-- Add category field
ALTER TABLE call_reports
ADD COLUMN category TEXT CHECK (category IN ('external_producer', 'writer_pitch', 'inhouse_content'));

-- Add suggested_writer field
ALTER TABLE call_reports
ADD COLUMN suggested_writer TEXT;

-- Add logged_by field (name of person who logged the call report)
ALTER TABLE call_reports
ADD COLUMN logged_by TEXT;
