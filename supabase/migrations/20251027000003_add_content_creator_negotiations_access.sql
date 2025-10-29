-- =====================================================
-- Add Content Creator Access to Negotiations
-- =====================================================
-- Allows content creators to create and manage negotiations
-- alongside content managers and evaluators
-- =====================================================

BEGIN;

-- Drop existing policies to recreate with content_creator access
DROP POLICY IF EXISTS "Relevant users can view negotiations" ON negotiations;
DROP POLICY IF EXISTS "Managers and evaluators can manage negotiations" ON negotiations;

-- Recreate view policy with content_creator access
CREATE POLICY "Relevant users can view negotiations"
  ON negotiations FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'content_creator', 'evaluator', 'executive', 'finance', 'admin')
  );

-- Recreate management policy with content_creator access
CREATE POLICY "Content department and evaluators can manage negotiations"
  ON negotiations FOR ALL
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'content_creator', 'evaluator', 'admin')
  );

COMMIT;

