-- Team-scoped RLS policies for content_head role
-- Content heads can:
-- - CRUD their own team's data
-- - READ all teams' data (read-only access to other teams)
-- Team members with evaluator/content roles can:
-- - CRUD their own data
-- - READ their team's data

-- ============================================================
-- CALL REPORTS - Team-scoped access
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Content heads can view all call reports" ON call_reports;
DROP POLICY IF EXISTS "Content heads can manage own team's call reports" ON call_reports;
DROP POLICY IF EXISTS "Team members can view team's call reports" ON call_reports;

-- Content heads: View ALL call reports (read-only for other teams)
CREATE POLICY "Content heads can view all call reports"
ON call_reports FOR SELECT
USING (is_content_head());

-- Content heads: Can INSERT/UPDATE/DELETE own team's call reports
CREATE POLICY "Content heads can manage own team's call reports"
ON call_reports FOR ALL
USING (
  is_content_head() AND (
    -- Own work
    created_by = auth.uid()
    OR
    -- Team member's work (check if creator is in same team)
    is_same_team(created_by)
  )
);

-- Team members (evaluator, content_creator): Can view team's call reports
CREATE POLICY "Team members can view team's call reports"
ON call_reports FOR SELECT
USING (
  get_user_role() IN ('evaluator', 'content_creator', 'content_manager') AND
  (
    created_by = auth.uid() OR is_same_team(created_by)
  )
);

-- ============================================================
-- EVALUATOR FORMS - Team-scoped access
-- ============================================================

DROP POLICY IF EXISTS "Content heads can view all evaluations" ON evaluator_forms;
DROP POLICY IF EXISTS "Content heads can manage own team's evaluations" ON evaluator_forms;
DROP POLICY IF EXISTS "Team members can view team's evaluations" ON evaluator_forms;

-- Content heads: View ALL evaluations
CREATE POLICY "Content heads can view all evaluations"
ON evaluator_forms FOR SELECT
USING (is_content_head());

-- Content heads: Can INSERT/UPDATE/DELETE own team's evaluations
CREATE POLICY "Content heads can manage own team's evaluations"
ON evaluator_forms FOR ALL
USING (
  is_content_head() AND (
    evaluator_id = auth.uid() OR is_same_team(evaluator_id)
  )
);

-- Team members: Can view team's evaluations
CREATE POLICY "Team members can view team's evaluations"
ON evaluator_forms FOR SELECT
USING (
  get_user_role() IN ('evaluator', 'content_manager') AND
  (
    evaluator_id = auth.uid() OR is_same_team(evaluator_id)
  )
);

-- ============================================================
-- EPISODES - Team-scoped access
-- ============================================================

DROP POLICY IF EXISTS "Content heads can view all episodes" ON episodes;
DROP POLICY IF EXISTS "Content heads can manage own team's episodes" ON episodes;
DROP POLICY IF EXISTS "Team members can view team's episodes" ON episodes;

-- Content heads: View ALL episodes
CREATE POLICY "Content heads can view all episodes"
ON episodes FOR SELECT
USING (is_content_head());

-- Content heads: Can INSERT/UPDATE/DELETE own team's episodes
CREATE POLICY "Content heads can manage own team's episodes"
ON episodes FOR ALL
USING (
  is_content_head() AND (
    logged_by = auth.uid() OR is_same_team(logged_by)
  )
);

-- Team members: Can view team's episodes
CREATE POLICY "Team members can view team's episodes"
ON episodes FOR SELECT
USING (
  get_user_role() IN ('evaluator', 'content_manager', 'content_creator') AND
  (
    logged_by = auth.uid() OR is_same_team(logged_by)
  )
);

-- ============================================================
-- EPISODIC EVALUATIONS - Team-scoped access
-- ============================================================

DROP POLICY IF EXISTS "Content heads can view all episodic evaluations" ON episodic_evaluations;
DROP POLICY IF EXISTS "Content heads can manage own team's episodic evaluations" ON episodic_evaluations;
DROP POLICY IF EXISTS "Team members can view team's episodic evaluations" ON episodic_evaluations;

-- Content heads: View ALL episodic evaluations
CREATE POLICY "Content heads can view all episodic evaluations"
ON episodic_evaluations FOR SELECT
USING (is_content_head());

-- Content heads: Can INSERT/UPDATE/DELETE own team's episodic evaluations
CREATE POLICY "Content heads can manage own team's episodic evaluations"
ON episodic_evaluations FOR ALL
USING (
  is_content_head() AND (
    evaluator_id = auth.uid() OR is_same_team(evaluator_id)
  )
);

-- Team members: Can view team's episodic evaluations
CREATE POLICY "Team members can view team's episodic evaluations"
ON episodic_evaluations FOR SELECT
USING (
  get_user_role() IN ('evaluator', 'content_manager') AND
  (
    evaluator_id = auth.uid() OR is_same_team(evaluator_id)
  )
);

-- ============================================================
-- DETAILED ONE-LINERS - Team-scoped access
-- ============================================================

DROP POLICY IF EXISTS "Content heads can view all detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Content heads can manage own team's detailed one-liners" ON detailed_one_liners;
DROP POLICY IF EXISTS "Team members can view team's detailed one-liners" ON detailed_one_liners;

-- Content heads: View ALL detailed one-liners
CREATE POLICY "Content heads can view all detailed one-liners"
ON detailed_one_liners FOR SELECT
USING (is_content_head());

-- Content heads: Can INSERT/UPDATE/DELETE own team's detailed one-liners
CREATE POLICY "Content heads can manage own team's detailed one-liners"
ON detailed_one_liners FOR ALL
USING (
  is_content_head() AND (
    created_by = auth.uid() OR is_same_team(created_by)
  )
);

-- Team members: Can view team's detailed one-liners
CREATE POLICY "Team members can view team's detailed one-liners"
ON detailed_one_liners FOR SELECT
USING (
  get_user_role() IN ('evaluator', 'content_manager') AND
  (
    created_by = auth.uid() OR is_same_team(created_by)
  )
);

-- ============================================================
-- USERS TABLE - Content heads can view all users
-- ============================================================

DROP POLICY IF EXISTS "Content heads can view all users" ON users;

-- Content heads: View ALL users (for assignment purposes)
CREATE POLICY "Content heads can view all users"
ON users FOR SELECT
USING (is_content_head());
