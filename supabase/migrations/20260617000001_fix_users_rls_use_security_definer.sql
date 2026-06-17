-- =====================================================
-- Fix users table RLS: use SECURITY DEFINER functions
-- instead of inline subqueries to prevent recursive
-- RLS evaluation issues (affects programmer role)
-- =====================================================

-- Drop the redundant programmer-specific policy that
-- was added in 20260103000001. It calls get_user_role()
-- inside a SELECT policy on the same users table,
-- creating a recursive evaluation path.
DROP POLICY IF EXISTS "Programmers can view their own profile" ON users;

-- Drop and recreate the main SELECT policy, replacing
-- inline subqueries with SECURITY DEFINER helpers.
-- The old policy used:
--   (SELECT role FROM users WHERE id = auth.uid())
--   (SELECT team_id FROM users WHERE id = auth.uid())
-- These trigger recursive RLS evaluation on the users
-- table. The SECURITY DEFINER functions get_user_role()
-- and get_user_team_id() bypass RLS, breaking the loop.
DROP POLICY IF EXISTS "users_select_policy" ON users;

CREATE POLICY "users_select_policy" ON users FOR SELECT
USING (
  -- Everyone can see their own record
  id = auth.uid()
  OR
  -- Admin/management see all
  get_user_role() IN ('admin', 'management')
  OR
  -- Same team members can see each other
  (team_id IS NOT NULL AND team_id = get_user_team_id())
  OR
  -- Active users are visible for dropdowns etc
  status = 'active'
);
