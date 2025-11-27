-- ============================================================================
-- TEAM ISOLATION: Row Level Security Policies
-- ============================================================================
-- Migration: 20251126000001_team_isolation_rls.sql
-- Purpose: Replace ALL existing RLS policies with team-scoped policies
--
-- CRITICAL SECURITY REQUIREMENT: Complete team isolation
-- - Management (admin, management roles) → sees ALL teams (global access)
-- - Content Heads → sees ONLY own team (no cross-team visibility)
-- - Team Members → sees ONLY own team (no cross-team visibility)
-- ============================================================================

-- ============================================================================
-- PART 1: CALL REPORTS - Team-Scoped RLS
-- ============================================================================

-- Drop ALL existing call_reports policies
DROP POLICY IF EXISTS "Authenticated users can view call reports" ON call_reports;
DROP POLICY IF EXISTS "Content managers can create call reports" ON call_reports;
DROP POLICY IF EXISTS "Creators and managers can update call reports" ON call_reports;
DROP POLICY IF EXISTS "Content heads can view all call reports" ON call_reports;
DROP POLICY IF EXISTS "Content heads can manage own team's call reports" ON call_reports;
DROP POLICY IF EXISTS "Team members can view team's call reports" ON call_reports;
DROP POLICY IF EXISTS "Evaluators can view assigned call reports" ON call_reports;
DROP POLICY IF EXISTS "Management can view all call reports" ON call_reports;
DROP POLICY IF EXISTS "Allow evaluators to create call reports" ON call_reports;

-- Policy 1: Management (admin, management) → View ALL call reports
CREATE POLICY "Management global access - call_reports SELECT"
ON call_reports FOR SELECT
USING (has_global_access());

-- Policy 2: Content heads & team members → View ONLY own team's call reports
CREATE POLICY "Team-scoped access - call_reports SELECT"
ON call_reports FOR SELECT
USING (
  NOT has_global_access() AND
  team_id = get_user_team_id()
);

-- Policy 3: Content heads & content managers → INSERT call reports (own team only)
CREATE POLICY "Team-scoped access - call_reports INSERT"
ON call_reports FOR INSERT
WITH CHECK (
  get_user_role() IN ('content_head', 'content_manager', 'evaluator') AND
  team_id = get_user_team_id()
);

-- Policy 4: Content heads & content managers → UPDATE own team's call reports
CREATE POLICY "Team-scoped access - call_reports UPDATE"
ON call_reports FOR UPDATE
USING (
  (has_global_access() OR team_id = get_user_team_id()) AND
  get_user_role() IN ('admin', 'management', 'content_head', 'content_manager', 'evaluator')
);

-- Policy 5: Admins can DELETE any call report
CREATE POLICY "Admin access - call_reports DELETE"
ON call_reports FOR DELETE
USING (is_admin());

-- ============================================================================
-- PART 2: STORIES - Team-Scoped RLS
-- ============================================================================

-- Drop ALL existing stories policies
DROP POLICY IF EXISTS "Authenticated users can view stories" ON stories;
DROP POLICY IF EXISTS "Content creators can create stories" ON stories;
DROP POLICY IF EXISTS "Users can update stories" ON stories;
DROP POLICY IF EXISTS "Managers can delete stories" ON stories;
DROP POLICY IF EXISTS "Management can view all stories" ON stories;
DROP POLICY IF EXISTS "Allow evaluators to create stories" ON stories;

-- Policy 1: Management → View ALL stories
CREATE POLICY "Management global access - stories SELECT"
ON stories FOR SELECT
USING (has_global_access());

-- Policy 2: Team members → View ONLY own team's stories
CREATE POLICY "Team-scoped access - stories SELECT"
ON stories FOR SELECT
USING (
  NOT has_global_access() AND
  team_id = get_user_team_id()
);

-- Policy 3: Content roles → INSERT stories (own team only)
CREATE POLICY "Team-scoped access - stories INSERT"
ON stories FOR INSERT
WITH CHECK (
  get_user_role() IN ('content_creator', 'content_head', 'content_manager', 'evaluator') AND
  team_id = get_user_team_id()
);

-- Policy 4: Content roles → UPDATE own team's stories
CREATE POLICY "Team-scoped access - stories UPDATE"
ON stories FOR UPDATE
USING (
  (has_global_access() OR team_id = get_user_team_id()) AND
  get_user_role() IN ('admin', 'management', 'content_head', 'content_manager', 'content_creator', 'evaluator')
);

-- Policy 5: Admins can DELETE any story
CREATE POLICY "Admin access - stories DELETE"
ON stories FOR DELETE
USING (is_admin());

-- ============================================================================
-- PART 3: EVALUATOR_FORMS - Team-Scoped RLS
-- ============================================================================

-- Drop ALL existing evaluator_forms policies
DROP POLICY IF EXISTS "Evaluators can view their own forms" ON evaluator_forms;
DROP POLICY IF EXISTS "Evaluators can create forms" ON evaluator_forms;
DROP POLICY IF EXISTS "Evaluators can update their own forms" ON evaluator_forms;
DROP POLICY IF EXISTS "Content heads can view all evaluations" ON evaluator_forms;
DROP POLICY IF EXISTS "Content heads can manage own team's evaluations" ON evaluator_forms;
DROP POLICY IF EXISTS "Team members can view team's evaluations" ON evaluator_forms;
DROP POLICY IF EXISTS "Management can view all evaluator forms" ON evaluator_forms;

-- Policy 1: Management → View ALL evaluator forms
CREATE POLICY "Management global access - evaluator_forms SELECT"
ON evaluator_forms FOR SELECT
USING (has_global_access());

-- Policy 2: Team members → View ONLY own team's evaluations
CREATE POLICY "Team-scoped access - evaluator_forms SELECT"
ON evaluator_forms FOR SELECT
USING (
  NOT has_global_access() AND
  team_id = get_user_team_id()
);

-- Policy 3: Evaluators → INSERT forms (own team only)
CREATE POLICY "Team-scoped access - evaluator_forms INSERT"
ON evaluator_forms FOR INSERT
WITH CHECK (
  get_user_role() IN ('evaluator', 'content_head', 'content_manager') AND
  evaluator_id = auth.uid() AND
  team_id = get_user_team_id()
);

-- Policy 4: Evaluators → UPDATE own forms (own team only)
CREATE POLICY "Team-scoped access - evaluator_forms UPDATE"
ON evaluator_forms FOR UPDATE
USING (
  (has_global_access() OR
   (team_id = get_user_team_id() AND evaluator_id = auth.uid())
  ) AND
  get_user_role() IN ('admin', 'management', 'evaluator', 'content_head', 'content_manager')
);

-- ============================================================================
-- PART 4: EVALUATOR_ASSIGNMENTS - Team-Scoped RLS
-- ============================================================================

-- Drop ALL existing evaluator_assignments policies
DROP POLICY IF EXISTS "Evaluators can view own assignments" ON evaluator_assignments;
DROP POLICY IF EXISTS "Content managers can create assignments" ON evaluator_assignments;
DROP POLICY IF EXISTS "Content managers can update assignments" ON evaluator_assignments;

-- Policy 1: Management → View ALL assignments
CREATE POLICY "Management global access - evaluator_assignments SELECT"
ON evaluator_assignments FOR SELECT
USING (has_global_access());

-- Policy 2: Team members → View ONLY own team's assignments
CREATE POLICY "Team-scoped access - evaluator_assignments SELECT"
ON evaluator_assignments FOR SELECT
USING (
  NOT has_global_access() AND
  team_id = get_user_team_id()
);

-- Policy 3: Content heads/managers → INSERT assignments (own team only)
CREATE POLICY "Team-scoped access - evaluator_assignments INSERT"
ON evaluator_assignments FOR INSERT
WITH CHECK (
  get_user_role() IN ('content_head', 'content_manager', 'admin') AND
  team_id = get_user_team_id()
);

-- Policy 4: Content heads/managers → UPDATE assignments (own team only)
CREATE POLICY "Team-scoped access - evaluator_assignments UPDATE"
ON evaluator_assignments FOR UPDATE
USING (
  (has_global_access() OR team_id = get_user_team_id()) AND
  get_user_role() IN ('admin', 'management', 'content_head', 'content_manager')
);

-- ============================================================================
-- PART 5: EPISODES - Team-Scoped RLS
-- ============================================================================

-- Drop ALL existing episodes policies
DROP POLICY IF EXISTS "Content heads can view all episodes" ON episodes;
DROP POLICY IF EXISTS "Content heads can manage own team's episodes" ON episodes;
DROP POLICY IF EXISTS "Team members can view team's episodes" ON episodes;
DROP POLICY IF EXISTS "Evaluators can view all episodes" ON episodes;
DROP POLICY IF EXISTS "Evaluators can edit all episodes" ON episodes;
DROP POLICY IF EXISTS "Management can view all episodes" ON episodes;

-- Policy 1: Management → View ALL episodes
CREATE POLICY "Management global access - episodes SELECT"
ON episodes FOR SELECT
USING (has_global_access());

-- Policy 2: Team members → View ONLY own team's episodes
CREATE POLICY "Team-scoped access - episodes SELECT"
ON episodes FOR SELECT
USING (
  NOT has_global_access() AND
  team_id = get_user_team_id()
);

-- Policy 3: Content/Evaluator roles → INSERT episodes (own team only)
CREATE POLICY "Team-scoped access - episodes INSERT"
ON episodes FOR INSERT
WITH CHECK (
  get_user_role() IN ('content_head', 'content_manager', 'content_creator', 'evaluator') AND
  team_id = get_user_team_id()
);

-- Policy 4: Content/Evaluator roles → UPDATE own team's episodes
CREATE POLICY "Team-scoped access - episodes UPDATE"
ON episodes FOR UPDATE
USING (
  (has_global_access() OR team_id = get_user_team_id()) AND
  get_user_role() IN ('admin', 'management', 'content_head', 'content_manager', 'evaluator')
);

-- Policy 5: Admins can DELETE any episode
CREATE POLICY "Admin access - episodes DELETE"
ON episodes FOR DELETE
USING (is_admin());

-- ============================================================================
-- PART 6: EPISODIC_EVALUATIONS - Team-Scoped RLS
-- ============================================================================

-- Drop ALL existing episodic_evaluations policies
DROP POLICY IF EXISTS "Content heads can view all episodic evaluations" ON episodic_evaluations;
DROP POLICY IF EXISTS "Content heads can manage own team's episodic evaluations" ON episodic_evaluations;
DROP POLICY IF EXISTS "Team members can view team's episodic evaluations" ON episodic_evaluations;
DROP POLICY IF EXISTS "Evaluators can view their own episodic evaluations" ON episodic_evaluations;
DROP POLICY IF EXISTS "Evaluators can create episodic evaluations" ON episodic_evaluations;
DROP POLICY IF EXISTS "Evaluators can update their own episodic evaluations" ON episodic_evaluations;
DROP POLICY IF EXISTS "Management can view all episodic evaluations" ON episodic_evaluations;

-- Policy 1: Management → View ALL episodic evaluations
CREATE POLICY "Management global access - episodic_evaluations SELECT"
ON episodic_evaluations FOR SELECT
USING (has_global_access());

-- Policy 2: Team members → View ONLY own team's episodic evaluations
CREATE POLICY "Team-scoped access - episodic_evaluations SELECT"
ON episodic_evaluations FOR SELECT
USING (
  NOT has_global_access() AND
  team_id = get_user_team_id()
);

-- Policy 3: Evaluators → INSERT episodic evaluations (own team only)
CREATE POLICY "Team-scoped access - episodic_evaluations INSERT"
ON episodic_evaluations FOR INSERT
WITH CHECK (
  get_user_role() IN ('evaluator', 'content_head', 'content_manager') AND
  evaluator_id = auth.uid() AND
  team_id = get_user_team_id()
);

-- Policy 4: Evaluators → UPDATE own episodic evaluations (own team only)
CREATE POLICY "Team-scoped access - episodic_evaluations UPDATE"
ON episodic_evaluations FOR UPDATE
USING (
  (has_global_access() OR
   (team_id = get_user_team_id() AND evaluator_id = auth.uid())
  ) AND
  get_user_role() IN ('admin', 'management', 'evaluator', 'content_head', 'content_manager')
);

-- ============================================================================
-- PART 7: DETAILED_ONE_LINERS - Team-Scoped RLS
-- ============================================================================

-- Drop ALL existing detailed_one_liners policies
DROP POLICY IF EXISTS "Content heads can view all detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Content heads can manage own team's detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Team members can view team's detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Evaluators can view detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Content managers can create detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Creators can update their own detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Management can view all detailed one-liners" ON detailed_one_liners;

-- Policy 1: Management → View ALL detailed one-liners
CREATE POLICY "Management global access - detailed_one_liners SELECT"
ON detailed_one_liners FOR SELECT
USING (has_global_access());

-- Policy 2: Team members → View ONLY own team's detailed one-liners
CREATE POLICY "Team-scoped access - detailed_one_liners SELECT"
ON detailed_one_liners FOR SELECT
USING (
  NOT has_global_access() AND
  team_id = get_user_team_id()
);

-- Policy 3: Content roles → INSERT detailed one-liners (own team only)
CREATE POLICY "Team-scoped access - detailed_one_liners INSERT"
ON detailed_one_liners FOR INSERT
WITH CHECK (
  get_user_role() IN ('content_head', 'content_manager', 'evaluator') AND
  team_id = get_user_team_id()
);

-- Policy 4: Content roles → UPDATE own team's detailed one-liners
CREATE POLICY "Team-scoped access - detailed_one_liners UPDATE"
ON detailed_one_liners FOR UPDATE
USING (
  (has_global_access() OR team_id = get_user_team_id()) AND
  get_user_role() IN ('admin', 'management', 'content_head', 'content_manager', 'evaluator')
);

-- Policy 5: Admins can DELETE any detailed one-liner
CREATE POLICY "Admin access - detailed_one_liners DELETE"
ON detailed_one_liners FOR DELETE
USING (is_admin());

-- ============================================================================
-- PART 8: USERS TABLE - Limited Cross-Team Visibility
-- ============================================================================

-- Drop existing content_head user policies
DROP POLICY IF EXISTS "Content heads can view all users" ON users;

-- Policy: Content heads can view ONLY own team members + active users for dropdowns
CREATE POLICY "Team-scoped access - users SELECT"
ON users FOR SELECT
USING (
  has_global_access() OR
  team_id = get_user_team_id() OR
  id = auth.uid() OR
  status = 'active' -- Basic user info visible for dropdown purposes
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
