-- Fix timezone issue: Convert TIMESTAMP columns to TIMESTAMPTZ
-- Only includes columns that actually exist in the schema

-- Users table
ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN last_login TYPE TIMESTAMPTZ;

-- Stories table (does NOT have submitted_at)
ALTER TABLE stories ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE stories ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- Call reports table
-- Note: meeting_date has a generated column dependency (end_time), so we need to drop and recreate it
ALTER TABLE call_reports DROP COLUMN IF EXISTS end_time;
ALTER TABLE call_reports ALTER COLUMN meeting_date TYPE TIMESTAMPTZ;
ALTER TABLE call_reports ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE call_reports ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
-- Recreate the end_time generated column with the correct type
ALTER TABLE call_reports ADD COLUMN end_time TIMESTAMPTZ GENERATED ALWAYS AS (
  meeting_date + (COALESCE(duration_minutes, 60) * INTERVAL '1 minute')
) STORED;

-- Evaluator forms table
ALTER TABLE evaluator_forms ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE evaluator_forms ALTER COLUMN submitted_at TYPE TIMESTAMPTZ;

-- Evaluation logs table
ALTER TABLE evaluation_logs ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- One-liners table
ALTER TABLE one_liners ALTER COLUMN decided_at TYPE TIMESTAMPTZ;
ALTER TABLE one_liners ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Negotiations table
ALTER TABLE negotiations ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE negotiations ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- Legal reviews table
ALTER TABLE legal_reviews ALTER COLUMN review_start_date TYPE TIMESTAMPTZ;
ALTER TABLE legal_reviews ALTER COLUMN decided_at TYPE TIMESTAMPTZ;
ALTER TABLE legal_reviews ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Contracts table
ALTER TABLE contracts ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE contracts ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- Payment schedules table
ALTER TABLE payment_schedules ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE payment_schedules ALTER COLUMN due_date TYPE TIMESTAMPTZ;

-- Payments table
ALTER TABLE payments ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE payments ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE payments ALTER COLUMN payment_date TYPE TIMESTAMPTZ;

-- Script phases table
ALTER TABLE script_phases ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE script_phases ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE script_phases ALTER COLUMN started_at TYPE TIMESTAMPTZ;
ALTER TABLE script_phases ALTER COLUMN completed_at TYPE TIMESTAMPTZ;

-- Script feedback table
ALTER TABLE script_feedback ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Archive table
ALTER TABLE archive ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE archive ALTER COLUMN rejected_at TYPE TIMESTAMPTZ;

-- Attachments table
ALTER TABLE attachments ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Notifications table
ALTER TABLE notifications ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE notifications ALTER COLUMN read_at TYPE TIMESTAMPTZ;

-- Audit logs table
ALTER TABLE audit_logs ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Note: episodes, episodic_evaluations, external_evaluation_links,
-- external_evaluations, teams, team_members, team_change_requests
-- already use TIMESTAMPTZ - no changes needed
