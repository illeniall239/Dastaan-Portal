-- Add logline_image_url column to call_reports table
ALTER TABLE call_reports
ADD COLUMN logline_image_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN call_reports.logline_image_url IS 'Optional image URL to accompany the logline text';

-- Add logline_image_url column to archive table
ALTER TABLE archive
ADD COLUMN logline_image_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN archive.logline_image_url IS 'Optional image URL to accompany the logline text (preserved from call_reports)';
