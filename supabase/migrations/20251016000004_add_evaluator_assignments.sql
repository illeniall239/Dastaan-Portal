-- =====================================================
-- Add Evaluator Assignments & Progress Tracking
-- =====================================================
-- This migration adds support for fixed evaluator counts:
-- 10 internal + 10 external = 20 total evaluators per call report

-- =====================================================
-- 1. Add evaluator type enum
-- =====================================================

CREATE TYPE evaluator_type AS ENUM ('internal', 'external');

-- =====================================================
-- 2. Add progress tracking columns to call_reports
-- =====================================================

ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS required_evaluators INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS required_internal_evaluators INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS required_external_evaluators INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS completed_internal_evaluations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_external_evaluations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_average_score DECIMAL(3,2);

-- =====================================================
-- 3. Add evaluator type to users table
-- =====================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS evaluator_type evaluator_type;

-- Update existing evaluators to have a type (default to internal)
UPDATE users
SET evaluator_type = 'internal'
WHERE role = 'evaluator' AND evaluator_type IS NULL;

-- =====================================================
-- 4. Create evaluator_assignments table
-- =====================================================

CREATE TABLE IF NOT EXISTS evaluator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  call_report_id UUID REFERENCES call_reports(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  evaluator_type evaluator_type NOT NULL,

  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  assigned_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one assignment per evaluator per call report
  UNIQUE(call_report_id, evaluator_id)
);

-- =====================================================
-- 5. Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_call_report
  ON evaluator_assignments(call_report_id);

CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_evaluator
  ON evaluator_assignments(evaluator_id);

CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_status
  ON evaluator_assignments(status);

CREATE INDEX IF NOT EXISTS idx_call_reports_current_score
  ON call_reports(current_average_score);

CREATE INDEX IF NOT EXISTS idx_users_evaluator_type
  ON users(evaluator_type) WHERE role = 'evaluator';

-- =====================================================
-- 6. Add RLS policies for evaluator_assignments
-- =====================================================

ALTER TABLE evaluator_assignments ENABLE ROW LEVEL SECURITY;

-- Evaluators can view their own assignments
CREATE POLICY "Evaluators can view own assignments"
  ON evaluator_assignments FOR SELECT
  TO authenticated
  USING (
    evaluator_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'content_manager', 'management', 'executive')
    )
  );

-- Content managers can create assignments
CREATE POLICY "Content managers can create assignments"
  ON evaluator_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'content_manager')
    )
  );

-- Content managers can update assignments
CREATE POLICY "Content managers can update assignments"
  ON evaluator_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'content_manager')
    )
  );

-- =====================================================
-- 7. Function to calculate evaluation progress
-- =====================================================

CREATE OR REPLACE FUNCTION get_evaluation_progress(p_call_report_id UUID)
RETURNS TABLE (
  total_required INTEGER,
  total_completed INTEGER,
  internal_required INTEGER,
  internal_completed INTEGER,
  external_required INTEGER,
  external_completed INTEGER,
  progress_percentage DECIMAL(5,2),
  current_average DECIMAL(3,2),
  is_complete BOOLEAN
) AS $$
DECLARE
  v_call_report RECORD;
BEGIN
  -- Get call report details
  SELECT * INTO v_call_report
  FROM call_reports
  WHERE id = p_call_report_id;

  RETURN QUERY
  SELECT
    v_call_report.required_evaluators,
    COALESCE(v_call_report.completed_evaluations, v_call_report.completed_internal_evaluations + v_call_report.completed_external_evaluations, 0),
    v_call_report.required_internal_evaluators,
    v_call_report.completed_internal_evaluations,
    v_call_report.required_external_evaluators,
    v_call_report.completed_external_evaluations,
    CASE 
      WHEN v_call_report.required_evaluators > 0 THEN
        ROUND(((v_call_report.completed_internal_evaluations + v_call_report.completed_external_evaluations)::DECIMAL / v_call_report.required_evaluators::DECIMAL) * 100, 2)
      ELSE 0
    END,
    v_call_report.current_average_score,
    (v_call_report.completed_internal_evaluations + v_call_report.completed_external_evaluations) >= v_call_report.required_evaluators;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. Function to auto-assign evaluators
-- =====================================================

CREATE OR REPLACE FUNCTION auto_assign_evaluators(p_call_report_id UUID)
RETURNS VOID AS $$
DECLARE
  v_internal_evaluators UUID[];
  v_external_evaluators UUID[];
  v_evaluator_id UUID;
BEGIN
  -- Get 10 internal evaluators (random selection)
  SELECT ARRAY_AGG(id) INTO v_internal_evaluators
  FROM (
    SELECT id FROM users
    WHERE role = 'evaluator'
    AND evaluator_type = 'internal'
    AND status = 'active'
    ORDER BY RANDOM()
    LIMIT 10
  ) sub;

  -- Get 10 external evaluators (random selection)
  SELECT ARRAY_AGG(id) INTO v_external_evaluators
  FROM (
    SELECT id FROM users
    WHERE role = 'evaluator'
    AND evaluator_type = 'external'
    AND status = 'active'
    ORDER BY RANDOM()
    LIMIT 10
  ) sub;

  -- Assign internal evaluators
  IF v_internal_evaluators IS NOT NULL THEN
    FOREACH v_evaluator_id IN ARRAY v_internal_evaluators
    LOOP
      INSERT INTO evaluator_assignments (call_report_id, evaluator_id, evaluator_type)
      VALUES (p_call_report_id, v_evaluator_id, 'internal')
      ON CONFLICT (call_report_id, evaluator_id) DO NOTHING;
    END LOOP;
  END IF;

  -- Assign external evaluators
  IF v_external_evaluators IS NOT NULL THEN
    FOREACH v_evaluator_id IN ARRAY v_external_evaluators
    LOOP
      INSERT INTO evaluator_assignments (call_report_id, evaluator_id, evaluator_type)
      VALUES (p_call_report_id, v_evaluator_id, 'external')
      ON CONFLICT (call_report_id, evaluator_id) DO NOTHING;
    END LOOP;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. Comments for documentation
-- =====================================================

COMMENT ON TABLE evaluator_assignments IS
'Tracks the assignment of 20 evaluators (10 internal + 10 external) to each call report';

COMMENT ON COLUMN call_reports.required_evaluators IS
'Total number of required evaluators (default: 20)';

COMMENT ON COLUMN call_reports.current_average_score IS
'Live average score that updates as each evaluation is submitted';

COMMENT ON FUNCTION get_evaluation_progress(UUID) IS
'Returns detailed progress metrics for a call report evaluation';

COMMENT ON FUNCTION auto_assign_evaluators(UUID) IS
'Automatically assigns 10 internal and 10 external evaluators to a call report';
