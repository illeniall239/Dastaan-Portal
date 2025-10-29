-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_liners ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_stages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is content manager
CREATE OR REPLACE FUNCTION is_content_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('content_manager', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- Users Table Policies
-- =====================================================

-- Users can view all active users
CREATE POLICY "Users can view active users"
  ON users FOR SELECT
  USING (status = 'active');

-- Users can create their own profile during registration
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Only admins can delete users
CREATE POLICY "Only admins can delete users"
  ON users FOR DELETE
  USING (is_admin());

-- =====================================================
-- Stories Table Policies
-- =====================================================

-- Anyone can view stories (authenticated users)
CREATE POLICY "Authenticated users can view stories"
  ON stories FOR SELECT
  TO authenticated
  USING (true);

-- Content creators and managers can create stories
CREATE POLICY "Content creators can create stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('content_creator', 'content_manager', 'admin')
  );

-- Creators can update their own stories, managers can update all
CREATE POLICY "Users can update stories"
  ON stories FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    get_user_role() IN ('content_manager', 'admin')
  );

-- Only admins and managers can delete stories
CREATE POLICY "Managers can delete stories"
  ON stories FOR DELETE
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'admin')
  );

-- =====================================================
-- Call Reports Table Policies
-- =====================================================

CREATE POLICY "Authenticated users can view call reports"
  ON call_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Content managers can create call reports"
  ON call_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('content_manager', 'admin')
  );

CREATE POLICY "Creators and managers can update call reports"
  ON call_reports FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    get_user_role() IN ('content_manager', 'admin')
  );

-- =====================================================
-- Evaluator Forms Table Policies
-- =====================================================

CREATE POLICY "Evaluators can view their own forms"
  ON evaluator_forms FOR SELECT
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() IN ('content_manager', 'executive', 'admin')
  );

CREATE POLICY "Evaluators can create forms"
  ON evaluator_forms FOR INSERT
  TO authenticated
  WITH CHECK (
    evaluator_id = auth.uid() AND
    get_user_role() IN ('evaluator', 'content_manager', 'executive', 'admin')
  );

CREATE POLICY "Evaluators can update their own forms"
  ON evaluator_forms FOR UPDATE
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() IN ('content_manager', 'admin')
  );

-- =====================================================
-- Evaluation Logs Policies
-- =====================================================

CREATE POLICY "Managers and executives can view evaluation logs"
  ON evaluation_logs FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'executive', 'admin')
  );

CREATE POLICY "Managers can manage evaluation logs"
  ON evaluation_logs FOR ALL
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'admin')
  );

-- =====================================================
-- One Liners Policies
-- =====================================================

CREATE POLICY "Executives and managers can view one liners"
  ON one_liners FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('executive', 'content_manager', 'admin')
  );

CREATE POLICY "Managers can create one liners"
  ON one_liners FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('content_manager', 'admin')
  );

CREATE POLICY "Executives can update one liners"
  ON one_liners FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('executive', 'content_manager', 'admin')
  );

-- =====================================================
-- Negotiations Policies
-- =====================================================

CREATE POLICY "Relevant users can view negotiations"
  ON negotiations FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'executive', 'finance', 'admin')
  );

CREATE POLICY "Managers can manage negotiations"
  ON negotiations FOR ALL
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'admin')
  );

-- =====================================================
-- Legal Reviews Policies
-- =====================================================

CREATE POLICY "Legal team can view legal reviews"
  ON legal_reviews FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('legal', 'content_manager', 'admin')
  );

CREATE POLICY "Legal team can manage legal reviews"
  ON legal_reviews FOR ALL
  TO authenticated
  USING (
    get_user_role() IN ('legal', 'content_manager', 'admin')
  );

-- =====================================================
-- Contracts Policies
-- =====================================================

CREATE POLICY "Relevant users can view contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('legal', 'finance', 'content_manager', 'executive', 'admin')
  );

CREATE POLICY "Legal and managers can manage contracts"
  ON contracts FOR ALL
  TO authenticated
  USING (
    get_user_role() IN ('legal', 'content_manager', 'admin')
  );

-- =====================================================
-- Payments Policies
-- =====================================================

CREATE POLICY "Finance team can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('finance', 'content_manager', 'admin')
  );

CREATE POLICY "Finance team can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    get_user_role() IN ('finance', 'content_manager', 'admin')
  );

-- =====================================================
-- Notifications Policies
-- =====================================================

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- Audit Logs Policies
-- =====================================================

CREATE POLICY "All authenticated users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- Attachments Policies
-- =====================================================

CREATE POLICY "Users can view attachments"
  ON attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create attachments"
  ON attachments FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own attachments"
  ON attachments FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    get_user_role() IN ('content_manager', 'admin')
  );

-- =====================================================
-- Archive Policies
-- =====================================================

CREATE POLICY "Users can view archive"
  ON archive FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage archive"
  ON archive FOR ALL
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'admin')
  );

-- =====================================================
-- Workflows Policies
-- =====================================================

CREATE POLICY "Users can view workflows"
  ON workflows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage workflows"
  ON workflows FOR ALL
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'admin')
  );

CREATE POLICY "Users can view workflow stages"
  ON workflow_stages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Assigned users can update workflow stages"
  ON workflow_stages FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    get_user_role() IN ('content_manager', 'admin')
  );
