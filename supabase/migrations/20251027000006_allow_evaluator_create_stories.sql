-- =====================================================
-- Allow Evaluators to Create Stories via Call Reports
-- =====================================================
-- When evaluators create call reports, stories are automatically created
-- This migration updates the RLS policy to allow evaluators to insert stories

BEGIN;

-- Drop existing policy
DROP POLICY IF EXISTS "Content creators can create stories" ON stories;

-- Create new policy that includes evaluators
CREATE POLICY "Content creators can create stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'admin')
  );

COMMENT ON POLICY "Content creators can create stories" ON stories IS
'Allows content creators, managers, evaluators, and admins to create stories. Evaluators need this permission to create call reports which auto-generate linked stories.';

COMMIT;
