-- Fix Missing completed_evaluations Column
-- This migration adds the missing completed_evaluations column to the call_reports table
-- which is referenced in several database functions but was never created

-- Add the missing completed_evaluations column
ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS completed_evaluations INTEGER DEFAULT 0;

-- Update existing records to have the correct count
-- This ensures backward compatibility
UPDATE call_reports
SET completed_evaluations = COALESCE(completed_internal_evaluations, 0) + COALESCE(completed_external_evaluations, 0)
WHERE completed_evaluations = 0;

-- Add comment for documentation
COMMENT ON COLUMN call_reports.completed_evaluations IS 'Total number of completed evaluations for this call report. Sum of completed_internal_evaluations and completed_external_evaluations.';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_call_reports_completed_evaluations
ON call_reports(completed_evaluations);

-- Add comment for the index
COMMENT ON INDEX idx_call_reports_completed_evaluations IS 'Improves performance for queries filtering by completed evaluations count';