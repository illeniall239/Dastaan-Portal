-- =====================================================
-- Evaluation Deadline Cron Job (Optional)
-- =====================================================
-- Sets up a daily cron job to check for call reports that have
-- passed their deadline with minimum evaluations and auto-decide
-- =====================================================

-- NOTE: This migration requires pg_cron extension
-- If pg_cron is not available, you can skip this migration
-- and call check_evaluation_deadlines() manually or via application code

BEGIN;

-- Enable pg_cron extension (if not already enabled)
-- This may require superuser privileges
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily job at midnight to check evaluation deadlines
-- Job runs check_evaluation_deadlines() function
SELECT cron.schedule(
  'check-evaluation-deadlines',  -- Job name
  '0 0 * * *',                   -- Cron schedule: daily at midnight
  $$SELECT check_evaluation_deadlines()$$  -- SQL to execute
);

COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler for PostgreSQL';

COMMIT;

-- =====================================================
-- Manual Execution (Alternative to Cron)
-- =====================================================
-- If pg_cron is not available or you prefer manual execution,
-- you can call this function from your application:
--
-- SELECT * FROM check_evaluation_deadlines();
--
-- This will return a table of call reports that were auto-decided
-- =====================================================
