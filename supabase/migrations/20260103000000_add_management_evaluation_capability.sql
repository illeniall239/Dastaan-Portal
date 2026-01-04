-- =====================================================
-- Management Evaluation Capability Migration
-- =====================================================
-- This migration enables management users (admin, management, executive)
-- to evaluate call reports and episodes. Evaluations are tracked separately
-- and do not count toward the required evaluator quota.
--
-- Changes:
-- 1. Update RLS policies to allow management INSERT on evaluation tables
-- 2. Create helper function to identify management evaluators
-- 3. Create views to segregate evaluations by type (evaluator vs management)
-- 4. Update evaluation count trigger to exclude management evaluations
-- 5. Add performance indexes
-- =====================================================

-- =====================================================
-- 1. UPDATE RLS POLICIES FOR evaluator_forms
-- =====================================================

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "evaluator_forms_insert_policy" ON evaluator_forms;

-- Create new policy allowing both evaluators and management roles
CREATE POLICY "evaluator_forms_insert_policy"
ON evaluator_forms
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('evaluator', 'content_manager', 'executive', 'admin', 'management')
);

-- Ensure SELECT policy allows management to see their own evaluations
DROP POLICY IF EXISTS "evaluator_forms_select_policy" ON evaluator_forms;

CREATE POLICY "evaluator_forms_select_policy"
ON evaluator_forms
FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'management', 'executive', 'content_manager')
  OR evaluator_id = auth.uid()
);

-- =====================================================
-- 2. UPDATE RLS POLICIES FOR episodic_evaluations
-- =====================================================

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "episodic_evaluations_insert_policy" ON episodic_evaluations;

-- Create new policy allowing both evaluators and management roles
CREATE POLICY "episodic_evaluations_insert_policy"
ON episodic_evaluations
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role() IN ('evaluator', 'admin', 'management', 'executive', 'content_manager')
);

-- Ensure SELECT policy allows management to see their own evaluations
DROP POLICY IF EXISTS "episodic_evaluations_select_policy" ON episodic_evaluations;

CREATE POLICY "episodic_evaluations_select_policy"
ON episodic_evaluations
FOR SELECT
TO authenticated
USING (
  get_user_role() IN ('admin', 'management', 'executive', 'content_manager')
  OR evaluator_id = auth.uid()
);

-- =====================================================
-- 3. CREATE HELPER FUNCTION
-- =====================================================

-- Helper function to determine if a user is a management evaluator
CREATE OR REPLACE FUNCTION is_management_evaluator(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role
  FROM users
  WHERE id = p_user_id;

  RETURN v_user_role IN ('admin', 'management', 'executive');
END;
$$;

-- =====================================================
-- 4. CREATE VIEW: call_report_evaluations_with_type
-- =====================================================

-- View that joins evaluator_forms with users to add evaluation type
CREATE OR REPLACE VIEW call_report_evaluations_with_type AS
SELECT
  ef.*,
  u.name AS evaluator_name,
  u.email AS evaluator_email,
  u.role AS evaluator_role,
  CASE
    WHEN u.role IN ('admin', 'management', 'executive') THEN 'management'::TEXT
    ELSE 'evaluator'::TEXT
  END AS evaluation_type
FROM evaluator_forms ef
INNER JOIN users u ON ef.evaluator_id = u.id;

-- Grant SELECT permission on the view
GRANT SELECT ON call_report_evaluations_with_type TO authenticated;

-- Add RLS policy for the view
ALTER VIEW call_report_evaluations_with_type SET (security_invoker = on);

-- =====================================================
-- 5. CREATE VIEW: episodic_evaluations_with_type
-- =====================================================

-- View that joins episodic_evaluations with users to add evaluation type
CREATE OR REPLACE VIEW episodic_evaluations_with_type AS
SELECT
  ee.*,
  u.name AS evaluator_name,
  u.email AS evaluator_email,
  u.role AS evaluator_role,
  CASE
    WHEN u.role IN ('admin', 'management', 'executive') THEN 'management'::TEXT
    ELSE 'evaluator'::TEXT
  END AS evaluation_type
FROM episodic_evaluations ee
INNER JOIN users u ON ee.evaluator_id = u.id;

-- Grant SELECT permission on the view
GRANT SELECT ON episodic_evaluations_with_type TO authenticated;

-- Add RLS policy for the view
ALTER VIEW episodic_evaluations_with_type SET (security_invoker = on);

-- =====================================================
-- 6. UPDATE EVALUATION COUNT TRIGGER
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_call_report_evaluation_counts ON evaluator_forms;
DROP FUNCTION IF EXISTS update_call_report_evaluation_counts();

-- Recreate function with management exclusion logic
CREATE OR REPLACE FUNCTION update_call_report_evaluation_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update call_reports with evaluation counts (excluding management evaluations)
  UPDATE call_reports
  SET
    completed_evaluations = (
      SELECT COUNT(DISTINCT ef.evaluator_id)
      FROM evaluator_forms ef
      INNER JOIN users u ON ef.evaluator_id = u.id
      WHERE ef.call_report_id = COALESCE(NEW.call_report_id, OLD.call_report_id)
        AND u.role NOT IN ('admin', 'management', 'executive')
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.call_report_id, OLD.call_report_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_update_call_report_evaluation_counts
AFTER INSERT OR UPDATE OR DELETE ON evaluator_forms
FOR EACH ROW
EXECUTE FUNCTION update_call_report_evaluation_counts();

-- =====================================================
-- 7. CREATE SIMILAR TRIGGER FOR EPISODIC EVALUATIONS
-- =====================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_update_episode_evaluation_counts ON episodic_evaluations;
DROP FUNCTION IF EXISTS update_episode_evaluation_counts();

-- Create function to update episode evaluation counts (excluding management)
CREATE OR REPLACE FUNCTION update_episode_evaluation_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update episodes with evaluation counts (excluding management evaluations)
  UPDATE episodes
  SET
    evaluation_count = (
      SELECT COUNT(DISTINCT ee.evaluator_id)
      FROM episodic_evaluations ee
      INNER JOIN users u ON ee.evaluator_id = u.id
      WHERE ee.episode_id = COALESCE(NEW.episode_id, OLD.episode_id)
        AND u.role NOT IN ('admin', 'management', 'executive')
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.episode_id, OLD.episode_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_episode_evaluation_counts
AFTER INSERT OR UPDATE OR DELETE ON episodic_evaluations
FOR EACH ROW
EXECUTE FUNCTION update_episode_evaluation_counts();

-- =====================================================
-- 8. ADD PERFORMANCE INDEXES
-- =====================================================

-- Index on evaluator_forms.evaluator_id for faster joins with users table
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_evaluator_id
ON evaluator_forms(evaluator_id);

-- Index on episodic_evaluations.evaluator_id for faster joins with users table
CREATE INDEX IF NOT EXISTS idx_episodic_evaluations_evaluator_id
ON episodic_evaluations(evaluator_id);

-- Composite index for common query pattern: filtering by call_report_id and evaluator_id
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_call_report_evaluator
ON evaluator_forms(call_report_id, evaluator_id);

-- Composite index for common query pattern: filtering by episode_id and evaluator_id
CREATE INDEX IF NOT EXISTS idx_episodic_evaluations_episode_evaluator
ON episodic_evaluations(episode_id, evaluator_id);

-- Index on users.role for faster filtering in views
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this migration via Supabase Dashboard → SQL Editor
-- 2. Verify RLS policies: SELECT * FROM pg_policies WHERE tablename IN ('evaluator_forms', 'episodic_evaluations')
-- 3. Test views: SELECT * FROM call_report_evaluations_with_type LIMIT 5
-- 4. Proceed with backend implementation (lib/evaluations/server.ts)
-- =====================================================
