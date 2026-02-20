-- Fix: Drop and recreate story_approvals RLS policies (handles partial migration run)

DROP POLICY IF EXISTS "story_approvals_select" ON story_approvals;
DROP POLICY IF EXISTS "story_approvals_insert" ON story_approvals;
DROP POLICY IF EXISTS "story_approvals_update" ON story_approvals;
DROP POLICY IF EXISTS "story_approvals_delete" ON story_approvals;

CREATE POLICY "story_approvals_select" ON story_approvals
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "story_approvals_insert" ON story_approvals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "story_approvals_update" ON story_approvals
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "story_approvals_delete" ON story_approvals
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
