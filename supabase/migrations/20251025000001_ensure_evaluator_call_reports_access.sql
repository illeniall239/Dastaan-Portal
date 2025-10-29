-- Ensure evaluators have explicit SELECT access to call_reports
-- This migration consolidates all call_reports SELECT policies to ensure evaluators can view reports

-- Drop existing SELECT policies on call_reports
DROP POLICY IF EXISTS "All authenticated users can view call reports" ON call_reports;
DROP POLICY IF EXISTS "Management can view all call reports" ON call_reports;
DROP POLICY IF EXISTS "Authenticated users can view call reports" ON call_reports;
DROP POLICY IF EXISTS "Content department can view call reports" ON call_reports;

-- Create a single, comprehensive SELECT policy that includes evaluators
CREATE POLICY "Users can view call reports based on role"
  ON call_reports FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'management', 'admin')
  );

COMMENT ON POLICY "Users can view call reports based on role" ON call_reports IS
'Allows content department staff, evaluators, management, and admins to view all call reports. Evaluators need access to review reports they must evaluate.';
