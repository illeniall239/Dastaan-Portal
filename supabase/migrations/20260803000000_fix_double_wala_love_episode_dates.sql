-- Fix original_submission_date for "Double Wala Love" episodes
-- These were logged with today's date instead of the actual submission date (29 Nov 2025)

UPDATE episodes
SET original_submission_date = '2025-11-29'
WHERE call_report_id IN (
  SELECT id FROM call_reports
  WHERE working_title ILIKE '%Double Wala Love%'
);
