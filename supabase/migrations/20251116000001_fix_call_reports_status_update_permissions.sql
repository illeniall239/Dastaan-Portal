-- Fix call_reports UPDATE policy to allow evaluators and other authorized roles
-- This aligns with the Status Updater feature requirements
-- Date: 2025-01-16

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Managers can update call reports" ON call_reports;

-- Create new policy that allows all authorized roles to update call_reports
CREATE POLICY "Authorized users can update call reports"
  ON call_reports FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'evaluator', 'management', 'executive', 'admin')
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Authorized users can update call reports" ON call_reports IS
'Allows content managers, evaluators, management, executives, and admins to update call reports including status changes. This supports the Status Updater feature where these roles need to update project status.';
