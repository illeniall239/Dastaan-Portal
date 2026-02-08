-- =====================================================
-- Add GCM Role
-- =====================================================
-- GCM is a separate team with content_creator-level permissions.
-- They can create and view content but cannot edit or manage workflows.

-- Update users table CHECK constraint to include 'gcm' role
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN (
    'content_creator',
    'content_manager',
    'content_head',
    'gcm',
    'evaluator',
    'executive',
    'legal',
    'finance',
    'management',
    'admin',
    'programmer'
  ));

-- =====================================================
-- RLS Policies for GCM Role
-- =====================================================

-- GCM users can view their own profile
CREATE POLICY "GCM users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() AND get_user_role() = 'gcm'
  );

-- GCM users can view other users (for team/evaluator lookups)
CREATE POLICY "GCM users can view other users"
  ON users FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'gcm'
  );

-- GCM users can create stories
CREATE POLICY "GCM users can create stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'gcm'
  );

-- GCM users can update their own stories
CREATE POLICY "GCM users can update own stories"
  ON stories FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() AND get_user_role() = 'gcm'
  );

-- GCM users can view all stories (via existing authenticated policy)
-- No additional SELECT policy needed for stories

-- GCM users can create call reports
CREATE POLICY "GCM users can create call reports"
  ON call_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'gcm'
  );

-- GCM users can view call reports (team-isolated via app logic)
CREATE POLICY "GCM users can view call reports"
  ON call_reports FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'gcm'
  );

-- GCM users can view evaluator forms
CREATE POLICY "GCM users can view evaluator forms"
  ON evaluator_forms FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'gcm'
  );

-- GCM users can view evaluation logs
CREATE POLICY "GCM users can view evaluation logs"
  ON evaluation_logs FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'gcm'
  );

-- GCM users can create and view episodes
CREATE POLICY "GCM users can create episodes"
  ON episodes FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'gcm'
  );

CREATE POLICY "GCM users can view episodes"
  ON episodes FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'gcm'
  );

-- GCM users can view detailed one-liners (read-only, no create/update)
CREATE POLICY "GCM users can view detailed one-liners"
  ON detailed_one_liners FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'gcm'
  );

-- GCM users can view and create negotiations (contract terms, no update)
CREATE POLICY "GCM users can view negotiations"
  ON negotiations FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'gcm'
  );

CREATE POLICY "GCM users can create negotiations"
  ON negotiations FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'gcm'
  );

-- GCM users can view writers
CREATE POLICY "GCM users can view writers"
  ON writers FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'gcm'
  );

CREATE POLICY "GCM users can create writers"
  ON writers FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'gcm'
  );

-- GCM users can view notifications
CREATE POLICY "GCM users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND get_user_role() = 'gcm'
  );

-- GCM users can view attachments
CREATE POLICY "GCM users can view attachments"
  ON attachments FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'gcm'
  );

CREATE POLICY "GCM users can create attachments"
  ON attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'gcm'
  );

-- GCM users can view teams
CREATE POLICY "GCM users can view teams"
  ON teams FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'gcm'
  );

COMMENT ON CONSTRAINT users_role_check ON users IS 'Enforces valid user roles including: content_creator, content_manager, content_head, gcm, evaluator, executive, legal, finance, management, admin, programmer';
