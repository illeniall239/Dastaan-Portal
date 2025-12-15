-- ============================================================================
-- FIX TIMESTAMP TIMEZONES AND DEPENDENCIES
-- ============================================================================
-- Problem: UTC vs Local time discrepancies (TIMESTAMP vs TIMESTAMPTZ).
--          Cannot alter columns due to dependencies in 'team_performance' view.
-- Solution: 
-- 1. Drop dependent materialized view 'team_performance'.
-- 2. Bulk alter columns to TIMESTAMPTZ.
-- 3. Recreate 'team_performance' with updated type casting.
-- ============================================================================

-- 1. Drop the dependent view
DROP MATERIALIZED VIEW IF EXISTS team_performance CASCADE;

-- 2. Alter columns to TIMESTAMPTZ (User's list)

-- Users table
ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN last_login TYPE TIMESTAMPTZ;

-- Stories table
ALTER TABLE stories ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE stories ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- Call reports table
ALTER TABLE call_reports DROP COLUMN IF EXISTS end_time;
ALTER TABLE call_reports ALTER COLUMN meeting_date TYPE TIMESTAMPTZ;
ALTER TABLE call_reports ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE call_reports ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE call_reports ADD COLUMN end_time TIMESTAMPTZ;

-- Create function to calculate end_time
CREATE OR REPLACE FUNCTION update_call_report_end_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.end_time := NEW.meeting_date + (COALESCE(NEW.duration_minutes, 60) * INTERVAL '1 minute');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep end_time updated
DROP TRIGGER IF EXISTS trg_update_call_report_end_time ON call_reports;
CREATE TRIGGER trg_update_call_report_end_time
BEFORE INSERT OR UPDATE OF meeting_date, duration_minutes ON call_reports
FOR EACH ROW
EXECUTE FUNCTION update_call_report_end_time();

-- Backfill existing data
UPDATE call_reports SET end_time = meeting_date + (COALESCE(duration_minutes, 60) * INTERVAL '1 minute');

-- Evaluator forms table
-- Drop blocking trigger
DROP TRIGGER IF EXISTS trigger_process_content_head_decision ON evaluator_forms;

ALTER TABLE evaluator_forms ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE evaluator_forms ALTER COLUMN submitted_at TYPE TIMESTAMPTZ;

-- Recreate blocking trigger
CREATE TRIGGER trigger_process_content_head_decision
AFTER UPDATE OF decision ON evaluator_forms
FOR EACH ROW
EXECUTE FUNCTION process_content_head_decision();

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

-- Payments table
ALTER TABLE payments ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE payments ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE payments ALTER COLUMN payment_date TYPE TIMESTAMPTZ;

-- Script phases table
ALTER TABLE script_phases ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE script_phases ALTER COLUMN submitted_at TYPE TIMESTAMPTZ;
ALTER TABLE script_phases ALTER COLUMN reviewed_at TYPE TIMESTAMPTZ;

-- Script feedback table
ALTER TABLE script_feedback ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Archive table
ALTER TABLE archive ALTER COLUMN archived_at TYPE TIMESTAMPTZ;
ALTER TABLE archive ALTER COLUMN rejection_date TYPE TIMESTAMPTZ;

-- Attachments table
ALTER TABLE attachments ALTER COLUMN uploaded_at TYPE TIMESTAMPTZ;

-- Notifications table
ALTER TABLE notifications ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Audit logs table
ALTER TABLE audit_logs ALTER COLUMN timestamp TYPE TIMESTAMPTZ;


-- 3. Recreate team_performance materialized view
CREATE MATERIALIZED VIEW team_performance AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  t.team_type,
  t.description,
  th.name AS team_head_name,
  th.email AS team_head_email,

  -- Team composition
  COUNT(DISTINCT u.id) AS team_member_count,

  -- Call Reports (last 90 days)
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.created_at > NOW() - INTERVAL '90 days') AS call_reports_created,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.created_at > NOW() - INTERVAL '30 days') AS call_reports_last_30_days,

  -- Evaluations (last 90 days)
  COUNT(DISTINCT ef.id) FILTER (WHERE ef.created_at > NOW() - INTERVAL '90 days') AS evaluations_completed,
  COUNT(DISTINCT ef.id) FILTER (WHERE ef.created_at > NOW() - INTERVAL '30 days') AS evaluations_last_30_days,
  AVG(ef.average_score) FILTER (WHERE ef.created_at > NOW() - INTERVAL '90 days') AS avg_evaluation_score,

  -- One-Liners (last 90 days)
  COUNT(DISTINCT dol.id) FILTER (WHERE dol.created_at > NOW() - INTERVAL '90 days') AS one_liners_logged,
  COUNT(DISTINCT dol.id) FILTER (WHERE dol.created_at > NOW() - INTERVAL '30 days') AS one_liners_last_30_days,

  -- Approvals/Rejections (last 90 days)
  COUNT(DISTINCT CASE WHEN ol.decision = 'approved' AND ol.decided_at > NOW() - INTERVAL '90 days' THEN s.id END) AS stories_approved,
  COUNT(DISTINCT CASE WHEN ol.decision = 'rejected' AND ol.decided_at > NOW() - INTERVAL '90 days' THEN s.id END) AS stories_rejected,
  COUNT(DISTINCT CASE WHEN ol.decision = 'approved' AND ol.decided_at > NOW() - INTERVAL '30 days' THEN s.id END) AS stories_approved_last_30_days,
  COUNT(DISTINCT CASE WHEN ol.decision = 'rejected' AND ol.decided_at > NOW() - INTERVAL '30 days' THEN s.id END) AS stories_rejected_last_30_days,

  -- Activity tracking - Updated casts to TIMESTAMPTZ
  MAX(GREATEST(
    COALESCE(cr.created_at, '1970-01-01'::timestamptz),
    COALESCE(ef.created_at, '1970-01-01'::timestamptz),
    COALESCE(dol.created_at, '1970-01-01'::timestamptz),
    COALESCE(ol.decided_at, '1970-01-01'::timestamptz)
  )) AS last_activity,

  -- Metadata
  t.created_at AS team_created_at,
  NOW() AS metrics_updated_at

FROM teams t
LEFT JOIN users th ON t.team_head_id = th.id
LEFT JOIN users u ON u.team_id = t.id AND u.status = 'active'
LEFT JOIN call_reports cr ON cr.created_by = u.id
LEFT JOIN evaluator_forms ef ON ef.evaluator_id = u.id
LEFT JOIN detailed_one_liners dol ON dol.created_by = u.id
LEFT JOIN one_liners ol ON ol.decided_by = u.id
LEFT JOIN stories s ON s.id = ol.story_id

GROUP BY
  t.id,
  t.name,
  t.team_type,
  t.description,
  t.created_at,
  th.name,
  th.email;

-- Restore indexes
CREATE INDEX IF NOT EXISTS idx_team_performance_team_id ON team_performance (team_id);
CREATE INDEX IF NOT EXISTS idx_team_performance_team_type ON team_performance (team_type);

-- Restore permissions
GRANT SELECT ON team_performance TO authenticated;

-- Add description
COMMENT ON MATERIALIZED VIEW team_performance IS
  'Aggregated team performance metrics for management dashboard. Includes approval counts, evaluation scores, and activity tracking.';

-- Populate view
REFRESH MATERIALIZED VIEW team_performance;
