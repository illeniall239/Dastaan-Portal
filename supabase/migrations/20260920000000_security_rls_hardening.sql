-- Security RLS hardening: tighten overly permissive USING(true) policies
-- on business data tables. Metadata-only changes — no data is modified.
--
-- Tables affected:
--   story_approvals       — restrict SELECT to involved parties + management
--   writer_commitments    — restrict CRUD to creators/managers + management
--   writer_engagements    — restrict SELECT to team members + management
--   call_report_discussions — restrict SELECT to team context + management
--   cross_team_share_episodes — restrict SELECT to involved teams + management

-- ============================================================
-- 1. story_approvals — only approvers, management, and admin
-- ============================================================
DROP POLICY IF EXISTS "story_approvals_select" ON story_approvals;
CREATE POLICY "story_approvals_select" ON story_approvals
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR get_user_role() IN ('admin', 'management', 'management_viewer', 'executive', 'programmer')
    OR EXISTS (
      SELECT 1 FROM call_reports cr
      WHERE cr.id = story_approvals.call_report_id
        AND cr.created_by = auth.uid()
    )
  );

-- ============================================================
-- 2. writer_commitments — scope CRUD to creators + management
-- ============================================================
DROP POLICY IF EXISTS "Allow read for authenticated users" ON writer_commitments;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON writer_commitments;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON writer_commitments;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON writer_commitments;

CREATE POLICY "writer_commitments_select" ON writer_commitments
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR get_user_role() IN ('admin', 'management', 'management_viewer', 'content_manager')
  );

CREATE POLICY "writer_commitments_insert" ON writer_commitments
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND get_user_role() IN ('admin', 'management', 'content_manager')
  );

CREATE POLICY "writer_commitments_update" ON writer_commitments
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR get_user_role() IN ('admin', 'management', 'content_manager')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR get_user_role() IN ('admin', 'management', 'content_manager')
  );

CREATE POLICY "writer_commitments_delete" ON writer_commitments
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR get_user_role() IN ('admin', 'management')
  );

-- ============================================================
-- 3. writer_engagements — scope to team + management
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view writer engagements" ON writer_engagements;
DROP POLICY IF EXISTS "Writer engagements are viewable by authenticated users" ON writer_engagements;

CREATE POLICY "writer_engagements_select" ON writer_engagements
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('admin', 'management', 'management_viewer', 'content_manager', 'executive')
    OR created_by = auth.uid()
  );

-- ============================================================
-- 4. call_report_discussions — scope to participants + management
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view discussions" ON call_report_discussions;
DROP POLICY IF EXISTS "call_report_discussions_select" ON call_report_discussions;

CREATE POLICY "call_report_discussions_select" ON call_report_discussions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR get_user_role() IN ('admin', 'management', 'management_viewer', 'content_manager', 'executive')
    OR EXISTS (
      SELECT 1 FROM call_reports cr
      WHERE cr.id = call_report_discussions.call_report_id
        AND (cr.created_by = auth.uid() OR cr.team_id = get_user_team_id())
    )
  );

-- ============================================================
-- 5. cross_team_share_episodes — scope to involved teams + management
-- ============================================================
DROP POLICY IF EXISTS "cross_team_share_episodes_select" ON cross_team_share_episodes;

CREATE POLICY "cross_team_share_episodes_select" ON cross_team_share_episodes
  FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('admin', 'management', 'management_viewer')
    OR EXISTS (
      SELECT 1 FROM cross_team_shares cts
      WHERE cts.id = cross_team_share_episodes.cross_team_share_id
        AND (cts.from_team_id = get_user_team_id() OR cts.to_team_id = get_user_team_id())
    )
  );
