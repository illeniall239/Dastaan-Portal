-- Add management_viewer to episodes and episodic_evaluations SELECT RLS policies.
-- The enforce_team_isolation migration only allows 'admin' and 'management' for
-- global access; management_viewer was never added.
-- episode_revisions cascades through episodes RLS, so fixing episodes fixes revisions too.

DROP POLICY IF EXISTS "episodes_select_policy" ON episodes;

CREATE POLICY "episodes_select_policy"
ON episodes FOR SELECT
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management', 'management_viewer')
  OR
  (
    team_id IS NOT NULL
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "episodic_evaluations_select_policy" ON episodic_evaluations;

CREATE POLICY "episodic_evaluations_select_policy"
ON episodic_evaluations FOR SELECT
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management', 'management_viewer')
  OR
  (
    team_id IS NOT NULL
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);
