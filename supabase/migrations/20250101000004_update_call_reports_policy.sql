-- Update call reports INSERT policy to allow content creators to create meetings
-- This allows both content creators and managers to schedule meetings (stored as call reports)

DROP POLICY IF EXISTS "Content managers can create call reports" ON call_reports;

CREATE POLICY "Content department can create call reports"
  ON call_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('content_creator', 'content_manager', 'admin')
  );
