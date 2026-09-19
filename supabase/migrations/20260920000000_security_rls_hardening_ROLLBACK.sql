-- ROLLBACK: Revert security RLS hardening back to original USING(true) policies
-- Run this ONLY if the hardening migration causes issues.
-- This restores the original permissive policies exactly as they were.

-- ============================================================
-- 1. story_approvals — restore open SELECT
-- ============================================================
DROP POLICY IF EXISTS "story_approvals_select" ON story_approvals;
CREATE POLICY "story_approvals_select" ON story_approvals
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 2. writer_commitments — restore open CRUD
-- ============================================================
DROP POLICY IF EXISTS "writer_commitments_select" ON writer_commitments;
DROP POLICY IF EXISTS "writer_commitments_insert" ON writer_commitments;
DROP POLICY IF EXISTS "writer_commitments_update" ON writer_commitments;
DROP POLICY IF EXISTS "writer_commitments_delete" ON writer_commitments;

CREATE POLICY "Allow read for authenticated users" ON writer_commitments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON writer_commitments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON writer_commitments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" ON writer_commitments
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 3. writer_engagements — restore open SELECT
-- ============================================================
DROP POLICY IF EXISTS "writer_engagements_select" ON writer_engagements;
CREATE POLICY "Writer engagements are viewable by authenticated users" ON writer_engagements
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 4. call_report_discussions — restore open SELECT
-- ============================================================
DROP POLICY IF EXISTS "call_report_discussions_select" ON call_report_discussions;
CREATE POLICY "call_report_discussions_select" ON call_report_discussions
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 5. cross_team_share_episodes — restore open SELECT
-- ============================================================
DROP POLICY IF EXISTS "cross_team_share_episodes_select" ON cross_team_share_episodes;
CREATE POLICY "cross_team_share_episodes_select" ON cross_team_share_episodes
  FOR SELECT TO authenticated
  USING (true);
