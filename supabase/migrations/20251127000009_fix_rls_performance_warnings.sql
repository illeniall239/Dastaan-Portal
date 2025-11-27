-- ============================================================================
-- FIX RLS PERFORMANCE AND DUPLICATE POLICY WARNINGS
-- ============================================================================
-- Purpose: Fix auth_rls_initplan warnings by wrapping auth.uid() in (SELECT ...)
--          Fix multiple_permissive_policies by consolidating duplicate policies
--          Fix duplicate_index by dropping redundant indexes
-- ============================================================================

-- ============================================================================
-- PART 1: FIX DUPLICATE INDEX
-- ============================================================================

DROP INDEX IF EXISTS idx_audit_logs_entity;
-- Keep idx_audit_logs_entity_composite as it's the more descriptive name

-- ============================================================================
-- PART 2: FIX MULTIPLE PERMISSIVE POLICIES - Consolidate into single policies
-- ============================================================================

-- Archive table - consolidate SELECT policies
DROP POLICY IF EXISTS "Management can view archive" ON archive;
DROP POLICY IF EXISTS "Managers can manage archive" ON archive;
DROP POLICY IF EXISTS "Managers can view archive" ON archive;

CREATE POLICY "archive_select_policy" ON archive FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager')
);

-- Attachments table - consolidate SELECT policies
DROP POLICY IF EXISTS "Management can view all attachments" ON attachments;
DROP POLICY IF EXISTS "Owners and privileged roles can view attachments" ON attachments;

CREATE POLICY "attachments_select_policy" ON attachments FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management')
  OR uploaded_by = (SELECT auth.uid())
);

-- Audit logs table - consolidate SELECT policies
DROP POLICY IF EXISTS "Management and admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Management can view all audit logs" ON audit_logs;

CREATE POLICY "audit_logs_select_policy" ON audit_logs FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management')
);

-- Contracts table - consolidate SELECT policies
DROP POLICY IF EXISTS "Legal and managers can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Management can view all contracts" ON contracts;
DROP POLICY IF EXISTS "Relevant users can view contracts" ON contracts;

CREATE POLICY "contracts_select_policy" ON contracts FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'legal', 'content_manager')
);

-- Evaluation logs table - consolidate SELECT policies
DROP POLICY IF EXISTS "Management can view all evaluation logs" ON evaluation_logs;
DROP POLICY IF EXISTS "Managers and executives can view evaluation logs" ON evaluation_logs;
DROP POLICY IF EXISTS "Managers can manage evaluation logs" ON evaluation_logs;

CREATE POLICY "evaluation_logs_select_policy" ON evaluation_logs FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager')
);

-- Evaluator scores table - consolidate all policies
DROP POLICY IF EXISTS "Admins and management can view all evaluator scores" ON evaluator_scores;
DROP POLICY IF EXISTS "Admins can manage all evaluator scores" ON evaluator_scores;
DROP POLICY IF EXISTS "Evaluators can manage their own scores" ON evaluator_scores;
DROP POLICY IF EXISTS "Evaluators can view their own scores" ON evaluator_scores;

CREATE POLICY "evaluator_scores_select_policy" ON evaluator_scores FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management')
  OR evaluator_id = (SELECT auth.uid())
);

CREATE POLICY "evaluator_scores_insert_policy" ON evaluator_scores FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
  OR evaluator_id = (SELECT auth.uid())
);

CREATE POLICY "evaluator_scores_update_policy" ON evaluator_scores FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
  OR evaluator_id = (SELECT auth.uid())
);

CREATE POLICY "evaluator_scores_delete_policy" ON evaluator_scores FOR DELETE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
  OR evaluator_id = (SELECT auth.uid())
);

-- Legal reviews table - consolidate SELECT policies
DROP POLICY IF EXISTS "Legal team can manage legal reviews" ON legal_reviews;
DROP POLICY IF EXISTS "Legal team can view legal reviews" ON legal_reviews;
DROP POLICY IF EXISTS "Management can view all legal reviews" ON legal_reviews;

CREATE POLICY "legal_reviews_select_policy" ON legal_reviews FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'legal')
);

-- Negotiations table - consolidate SELECT policies
DROP POLICY IF EXISTS "Content department and evaluators can manage negotiations" ON negotiations;
DROP POLICY IF EXISTS "Management can view all negotiations" ON negotiations;
DROP POLICY IF EXISTS "Relevant users can view negotiations" ON negotiations;

CREATE POLICY "negotiations_select_policy" ON negotiations FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager', 'evaluator', 'content_creator')
);

-- Notifications table - consolidate SELECT policies
DROP POLICY IF EXISTS "Management can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "notifications_select_policy" ON notifications FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management')
  OR user_id = (SELECT auth.uid())
);

-- Payments table - consolidate SELECT policies
DROP POLICY IF EXISTS "Finance team can manage payments" ON payments;
DROP POLICY IF EXISTS "Finance team can view payments" ON payments;
DROP POLICY IF EXISTS "Management can view all payments" ON payments;

CREATE POLICY "payments_select_policy" ON payments FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'finance')
);

-- Users table - consolidate SELECT policies (careful - this is critical)
DROP POLICY IF EXISTS "Management can view all users" ON users;
DROP POLICY IF EXISTS "Team-scoped access - users SELECT" ON users;
DROP POLICY IF EXISTS "Users can view active users" ON users;
DROP POLICY IF EXISTS "Users can view own auth data" ON users;

CREATE POLICY "users_select_policy" ON users FOR SELECT
USING (
  -- Everyone can see their own record
  id = (SELECT auth.uid())
  OR
  -- Admin/management see all
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management')
  OR
  -- Same team members can see each other
  (
    team_id IS NOT NULL 
    AND team_id = (SELECT team_id FROM users WHERE id = (SELECT auth.uid()))
  )
  OR
  -- Active users are visible for dropdowns etc
  is_active = true
);

-- Workflow stages table - consolidate SELECT policies
DROP POLICY IF EXISTS "Management can view all workflow stages" ON workflow_stages;
DROP POLICY IF EXISTS "Users can view workflow stages" ON workflow_stages;

CREATE POLICY "workflow_stages_select_policy" ON workflow_stages FOR SELECT
USING (true); -- Workflow stages are generally public to authenticated users

-- Workflows table - consolidate SELECT policies
DROP POLICY IF EXISTS "Management can view all workflows" ON workflows;
DROP POLICY IF EXISTS "Managers can manage workflows" ON workflows;
DROP POLICY IF EXISTS "Users can view workflows" ON workflows;

CREATE POLICY "workflows_select_policy" ON workflows FOR SELECT
USING (true); -- Workflows are generally public to authenticated users

-- ============================================================================
-- PART 3: FIX REMAINING auth_rls_initplan WARNINGS
-- These policies use auth.uid() without (SELECT ...) wrapper
-- ============================================================================

-- Users table - fix update policy
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "users_update_policy" ON users FOR UPDATE
USING (id = (SELECT auth.uid()));

-- Episodic evaluation drafts - fix all policies
DROP POLICY IF EXISTS "Users can view own drafts" ON episodic_evaluation_drafts;
DROP POLICY IF EXISTS "Users can insert own drafts" ON episodic_evaluation_drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON episodic_evaluation_drafts;
DROP POLICY IF EXISTS "Users can delete own drafts" ON episodic_evaluation_drafts;

CREATE POLICY "episodic_evaluation_drafts_select" ON episodic_evaluation_drafts FOR SELECT
USING (evaluator_id = (SELECT auth.uid()));

CREATE POLICY "episodic_evaluation_drafts_insert" ON episodic_evaluation_drafts FOR INSERT
WITH CHECK (evaluator_id = (SELECT auth.uid()));

CREATE POLICY "episodic_evaluation_drafts_update" ON episodic_evaluation_drafts FOR UPDATE
USING (evaluator_id = (SELECT auth.uid()));

CREATE POLICY "episodic_evaluation_drafts_delete" ON episodic_evaluation_drafts FOR DELETE
USING (evaluator_id = (SELECT auth.uid()));

-- Evaluator form drafts - fix all policies
DROP POLICY IF EXISTS "Users can view own drafts" ON evaluator_form_drafts;
DROP POLICY IF EXISTS "Users can insert own drafts" ON evaluator_form_drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON evaluator_form_drafts;
DROP POLICY IF EXISTS "Users can delete own drafts" ON evaluator_form_drafts;

CREATE POLICY "evaluator_form_drafts_select" ON evaluator_form_drafts FOR SELECT
USING (evaluator_id = (SELECT auth.uid()));

CREATE POLICY "evaluator_form_drafts_insert" ON evaluator_form_drafts FOR INSERT
WITH CHECK (evaluator_id = (SELECT auth.uid()));

CREATE POLICY "evaluator_form_drafts_update" ON evaluator_form_drafts FOR UPDATE
USING (evaluator_id = (SELECT auth.uid()));

CREATE POLICY "evaluator_form_drafts_delete" ON evaluator_form_drafts FOR DELETE
USING (evaluator_id = (SELECT auth.uid()));

-- Attachments - fix remaining policies
DROP POLICY IF EXISTS "Users can create attachments" ON attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON attachments;

CREATE POLICY "attachments_insert_policy" ON attachments FOR INSERT
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "attachments_delete_policy" ON attachments FOR DELETE
USING (uploaded_by = (SELECT auth.uid()));

-- Notifications - fix update and delete policies
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

CREATE POLICY "notifications_update_policy" ON notifications FOR UPDATE
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "notifications_delete_policy" ON notifications FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- Workflow stages - fix update policy
DROP POLICY IF EXISTS "Assigned users can update workflow stages" ON workflow_stages;

CREATE POLICY "workflow_stages_update_policy" ON workflow_stages FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager')
  OR assigned_to = (SELECT auth.uid())
);

-- Rejected archive - fix select policy
DROP POLICY IF EXISTS "Admins can view rejected archive" ON rejected_archive;

CREATE POLICY "rejected_archive_select_policy" ON rejected_archive FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management')
);

-- Evaluations snapshot - fix select policy
DROP POLICY IF EXISTS "Authorized users can view evaluations snapshot" ON evaluations_snapshot;

CREATE POLICY "evaluations_snapshot_select_policy" ON evaluations_snapshot FOR SELECT
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'evaluator')
);

-- Admins can create user profiles - fix
DROP POLICY IF EXISTS "Admins can create user profiles" ON users;

CREATE POLICY "users_insert_policy" ON users FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
);

-- Teams policies - fix
DROP POLICY IF EXISTS "teams_insert_admin" ON teams;
DROP POLICY IF EXISTS "teams_update_admin" ON teams;
DROP POLICY IF EXISTS "teams_delete_admin" ON teams;

CREATE POLICY "teams_insert_policy" ON teams FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
);

CREATE POLICY "teams_update_policy" ON teams FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
);

CREATE POLICY "teams_delete_policy" ON teams FOR DELETE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
);

-- External evaluation links - fix delete policy
DROP POLICY IF EXISTS "Management can delete their own external links" ON external_evaluation_links;

CREATE POLICY "external_evaluation_links_delete_policy" ON external_evaluation_links FOR DELETE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management')
  OR created_by = (SELECT auth.uid())
);

-- Narrative breakdown items - fix policies
DROP POLICY IF EXISTS "narrative_breakdown_update" ON narrative_breakdown_items;
DROP POLICY IF EXISTS "narrative_breakdown_delete" ON narrative_breakdown_items;

CREATE POLICY "narrative_breakdown_items_update_policy" ON narrative_breakdown_items FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager', 'evaluator')
);

CREATE POLICY "narrative_breakdown_items_delete_policy" ON narrative_breakdown_items FOR DELETE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager')
);

-- Event planning items - fix policies
DROP POLICY IF EXISTS "event_planning_items_update" ON event_planning_items;
DROP POLICY IF EXISTS "event_planning_items_delete" ON event_planning_items;

CREATE POLICY "event_planning_items_update_policy" ON event_planning_items FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager', 'evaluator')
);

CREATE POLICY "event_planning_items_delete_policy" ON event_planning_items FOR DELETE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager')
);

-- Potential weaknesses risks items - fix policies
DROP POLICY IF EXISTS "weaknesses_risks_update" ON potential_weaknesses_risks_items;
DROP POLICY IF EXISTS "weaknesses_risks_delete" ON potential_weaknesses_risks_items;

CREATE POLICY "weaknesses_risks_items_update_policy" ON potential_weaknesses_risks_items FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager', 'evaluator')
);

CREATE POLICY "weaknesses_risks_items_delete_policy" ON potential_weaknesses_risks_items FOR DELETE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager')
);

-- Character relationships - fix policies
DROP POLICY IF EXISTS "character_relationships_insert" ON character_relationships;
DROP POLICY IF EXISTS "character_relationships_update" ON character_relationships;
DROP POLICY IF EXISTS "character_relationships_delete" ON character_relationships;

CREATE POLICY "character_relationships_insert_policy" ON character_relationships FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager', 'evaluator')
);

CREATE POLICY "character_relationships_update_policy" ON character_relationships FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager', 'evaluator')
);

CREATE POLICY "character_relationships_delete_policy" ON character_relationships FOR DELETE
USING (
  (SELECT role FROM users WHERE id = (SELECT auth.uid())) IN ('admin', 'management', 'content_manager')
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

