-- =====================================================
-- Add Evaluator Access to Negotiations
-- =====================================================
-- Allows evaluators to view and create negotiations
-- alongside content managers
-- =====================================================

BEGIN;

-- Drop existing policies to recreate with evaluator access
DROP POLICY IF EXISTS "Relevant users can view negotiations" ON negotiations;
DROP POLICY IF EXISTS "Managers can manage negotiations" ON negotiations;

-- Recreate view policy with evaluator access
CREATE POLICY "Relevant users can view negotiations"
  ON negotiations FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'evaluator', 'executive', 'finance', 'admin')
  );

-- Recreate management policy with evaluator access
CREATE POLICY "Managers and evaluators can manage negotiations"
  ON negotiations FOR ALL
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'evaluator', 'admin')
  );

COMMIT;
