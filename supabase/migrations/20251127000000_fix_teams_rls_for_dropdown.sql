-- ============================================================================
-- FIX TEAMS TABLE RLS FOR DROPDOWN VISIBILITY
-- ============================================================================
-- Purpose: Allow authenticated users to see teams in dropdown
-- Problem: is_admin() function fails due to circular RLS dependency
-- Solution: Simplify SELECT policy, keep restrictive write policies
-- ============================================================================

-- Drop all existing teams policies to start fresh
DROP POLICY IF EXISTS teams_admin_all ON teams;
DROP POLICY IF EXISTS teams_management_select ON teams;
DROP POLICY IF EXISTS teams_user_select ON teams;
DROP POLICY IF EXISTS teams_service_role_insert ON teams;

-- Policy 1: EVERYONE can SELECT teams (read-only is safe)
CREATE POLICY teams_select_all ON teams
  FOR SELECT TO authenticated
  USING (true);  -- Allow all authenticated users to read

-- Policy 2: Only admins can INSERT teams
CREATE POLICY teams_insert_admin ON teams
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy 3: Only admins can UPDATE teams
CREATE POLICY teams_update_admin ON teams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy 4: Only admins can DELETE teams
CREATE POLICY teams_delete_admin ON teams
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add comment explaining the approach
COMMENT ON TABLE teams IS 'Teams table with permissive SELECT for dropdown visibility. Write operations restricted to admins only.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
