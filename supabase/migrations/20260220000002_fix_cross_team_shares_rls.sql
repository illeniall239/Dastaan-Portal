-- Fix: Ensure RLS is enabled and policies are in place for cross_team_shares
-- (original policies from 20260208000002 may not have been applied)

ALTER TABLE cross_team_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies cleanly before recreating
DROP POLICY IF EXISTS "Team heads can share their team content" ON cross_team_shares;
DROP POLICY IF EXISTS "Teams can view their shares"             ON cross_team_shares;
DROP POLICY IF EXISTS "Sharer can update their shares"         ON cross_team_shares;
DROP POLICY IF EXISTS "Admin can delete shares"                ON cross_team_shares;

-- ── SELECT ───────────────────────────────────────────────────────────────────
-- Team members of either from_team or to_team, plus admins / management /
-- programmers who need portal-wide visibility.
CREATE POLICY "cross_team_shares_select" ON cross_team_shares
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.team_id = from_team_id
          OR u.team_id = to_team_id
          OR u.role IN ('admin', 'management', 'programmer', 'content_head')
        )
    )
  );

-- ── INSERT ───────────────────────────────────────────────────────────────────
-- Team heads of the sending team, plus admins / management.
CREATE POLICY "cross_team_shares_insert" ON cross_team_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    shared_by = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM teams WHERE id = from_team_id AND team_head_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'management', 'content_head'))
    )
  );

-- ── UPDATE ───────────────────────────────────────────────────────────────────
-- The person who created the share can update (e.g. cancel it).
-- Admins can also update. The progress trigger runs as SECURITY DEFINER so
-- it bypasses this policy automatically.
CREATE POLICY "cross_team_shares_update" ON cross_team_shares
  FOR UPDATE TO authenticated
  USING (
    shared_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    shared_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ── DELETE ───────────────────────────────────────────────────────────────────
-- Admins only.
CREATE POLICY "cross_team_shares_delete" ON cross_team_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
