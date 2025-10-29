-- =====================================================
-- Add Management Role
-- =====================================================

-- Update users table CHECK constraint to include 'management' role
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN (
    'content_creator',
    'content_manager',
    'evaluator',
    'executive',
    'legal',
    'finance',
    'management',
    'admin'
  ));

-- =====================================================
-- RLS Policies for Management Role
-- =====================================================

-- First drop existing policies if they exist
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

-- Management has READ access to ALL tables (full visibility)

-- Stories
CREATE POLICY "Management can view all stories"
  ON stories FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Call Reports
CREATE POLICY "Management can view all call reports"
  ON call_reports FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Evaluator Forms
CREATE POLICY "Management can view all evaluations"
  ON evaluator_forms FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Evaluation Logs
CREATE POLICY "Management can view all evaluation logs"
  ON evaluation_logs FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- One Liners
CREATE POLICY "Management can view all one liners"
  ON one_liners FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Negotiations
CREATE POLICY "Management can view all negotiations"
  ON negotiations FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Legal Reviews
CREATE POLICY "Management can view all legal reviews"
  ON legal_reviews FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Contracts
CREATE POLICY "Management can view all contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Payment Schedules
CREATE POLICY "Management can view all payment schedules"
  ON payment_schedules FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Payments
CREATE POLICY "Management can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Script Phases
CREATE POLICY "Management can view all script phases"
  ON script_phases FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Script Feedback
CREATE POLICY "Management can view all script feedback"
  ON script_feedback FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Archive
CREATE POLICY "Management can view archive"
  ON archive FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Attachments
CREATE POLICY "Management can view all attachments"
  ON attachments FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Audit Logs
CREATE POLICY "Management can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Users (Management can view all users)
CREATE POLICY "Management can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Workflows
CREATE POLICY "Management can view all workflows"
  ON workflows FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Workflow Stages
CREATE POLICY "Management can view all workflow stages"
  ON workflow_stages FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- Notifications (Management can view all notifications)
CREATE POLICY "Management can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

COMMENT ON POLICY "Management can view all stories" ON stories IS 'Management role has full read access to all stories for oversight';
COMMENT ON POLICY "Management can view all call reports" ON call_reports IS 'Management role has full read access to all call reports for oversight';
COMMENT ON POLICY "Management can view all evaluations" ON evaluator_forms IS 'Management role has full read access to all evaluations for oversight';