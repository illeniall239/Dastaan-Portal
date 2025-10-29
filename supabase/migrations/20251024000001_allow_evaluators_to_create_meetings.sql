-- =====================================================
-- Allow Evaluators to Create Meetings
-- =====================================================
-- This migration updates the RLS policy on call_reports to allow evaluators
-- to create meetings (scheduled_meeting type) in addition to content_manager and admin.
-- This enables evaluators to schedule meetings that will be visible across all portals.

-- Drop the existing policy
DROP POLICY IF EXISTS "Content managers can create call reports" ON call_reports;

-- Recreate the policy with evaluator role included
CREATE POLICY "Content managers and evaluators can create call reports"
  ON call_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('content_manager', 'evaluator', 'admin')
  );

-- Add comment for documentation
COMMENT ON POLICY "Content managers and evaluators can create call reports" ON call_reports IS
'Allows content managers, evaluators, and admins to create call reports and schedule meetings. Meetings created by evaluators are visible across all portals.';
