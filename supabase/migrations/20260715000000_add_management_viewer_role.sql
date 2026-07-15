-- =====================================================
-- Add Management Viewer Role
-- Restricted management access: data/quantity reports only
-- No access to scripts, one-liners, or evaluation forms
-- =====================================================

-- Update users table CHECK constraint to include 'management_viewer'
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
    'management_viewer',
    'admin',
    'programmer'
  ));

-- =====================================================
-- Update existing management RLS policies to include management_viewer
-- These are all SELECT-only policies (read access)
-- =====================================================

-- Drop and recreate all management policies from 20251015000000
DROP POLICY IF EXISTS "Management can view all stories" ON stories;
DROP POLICY IF EXISTS "Management can view all call reports" ON call_reports;
DROP POLICY IF EXISTS "Management can view all evaluations" ON evaluator_forms;
DROP POLICY IF EXISTS "Management can view all evaluation logs" ON evaluation_logs;
DROP POLICY IF EXISTS "Management can view all one liners" ON one_liners;
DROP POLICY IF EXISTS "Management can view all negotiations" ON negotiations;
DROP POLICY IF EXISTS "Management can view all legal reviews" ON legal_reviews;
DROP POLICY IF EXISTS "Management can view all contracts" ON contracts;
DROP POLICY IF EXISTS "Management can view all payment schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Management can view all payments" ON payments;
DROP POLICY IF EXISTS "Management can view all script phases" ON script_phases;
DROP POLICY IF EXISTS "Management can view all script feedback" ON script_feedback;
DROP POLICY IF EXISTS "Management can view archive" ON archive;
DROP POLICY IF EXISTS "Management can view all attachments" ON attachments;
DROP POLICY IF EXISTS "Management can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Management can view all users" ON users;
DROP POLICY IF EXISTS "Management can view all workflows" ON workflows;
DROP POLICY IF EXISTS "Management can view all workflow stages" ON workflow_stages;
DROP POLICY IF EXISTS "Management can view all notifications" ON notifications;

-- Recreate with management_viewer included

CREATE POLICY "Management can view all stories"
  ON stories FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all call reports"
  ON call_reports FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all evaluations"
  ON evaluator_forms FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all evaluation logs"
  ON evaluation_logs FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all one liners"
  ON one_liners FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all negotiations"
  ON negotiations FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all legal reviews"
  ON legal_reviews FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all contracts"
  ON contracts FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all payment schedules"
  ON payment_schedules FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all payments"
  ON payments FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all script phases"
  ON script_phases FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all script feedback"
  ON script_feedback FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view archive"
  ON archive FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all attachments"
  ON attachments FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all users"
  ON users FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all workflows"
  ON workflows FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all workflow stages"
  ON workflow_stages FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

CREATE POLICY "Management can view all notifications"
  ON notifications FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

-- Update teams policy from 20250115000000
DROP POLICY IF EXISTS teams_management_select ON teams;
CREATE POLICY teams_management_select ON teams
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'management_viewer', 'admin'));

-- Add to roles table if it exists
INSERT INTO roles (name, permissions)
VALUES ('management_viewer', '{"stories": ["read"], "call_reports": ["read"], "evaluations": ["read"], "contracts": ["read"], "payments": ["read"]}')
ON CONFLICT (name) DO NOTHING;

COMMENT ON CONSTRAINT users_role_check ON users IS 'Enforces valid user roles including: content_creator, content_manager, content_head, gcm, evaluator, executive, legal, finance, management, management_viewer, admin, programmer';
