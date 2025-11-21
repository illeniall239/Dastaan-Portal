-- Migration: Auto-ready call reports for evaluation
-- This removes the draft step - call reports are immediately ready for evaluation when logged

-- Update the default value for status column
ALTER TABLE call_reports ALTER COLUMN status SET DEFAULT 'ready_for_evaluation';

-- Update all existing draft call reports (meeting_type = 'call_report') to ready_for_evaluation
-- This ensures existing call reports appear in pending evaluations
UPDATE call_reports
SET status = 'ready_for_evaluation', updated_at = NOW()
WHERE status = 'draft'
AND meeting_type = 'call_report';

-- Note: scheduled_meeting types remain as draft since they're future meetings
