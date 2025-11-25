-- Add content_head role to the system
-- Content heads are team leaders with evaluator-level permissions + team management capabilities

-- ============================================================
-- PART 1: ADD CONTENT_HEAD ROLE TO CONSTRAINT
-- ============================================================

-- Drop existing role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint including content_head
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'admin',
    'management',
    'content_manager',
    'content_head',
    'evaluator',
    'executive',
    'legal',
    'finance',
    'content_creator'
  )
);

-- Add comment explaining the content_head role
COMMENT ON COLUMN users.role IS 'User role: admin (full access), management (read-only oversight), content_manager (workflow management), content_head (team leader with evaluator permissions + team management), evaluator (story scoring), executive (approvals), legal (contract review), finance (payments), content_creator (story submission)';

-- ============================================================
-- PART 2: HELPER FUNCTIONS FOR CONTENT_HEAD ROLE
-- ============================================================

-- Check if user is content head
CREATE OR REPLACE FUNCTION is_content_head()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'content_head'
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is content head OR admin
CREATE OR REPLACE FUNCTION is_content_head_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('content_head', 'admin')
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's team_id
CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT team_id
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is head of a specific team
CREATE OR REPLACE FUNCTION is_team_head(check_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM teams
    WHERE id = check_team_id
    AND team_head_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if a user belongs to the same team as current user
CREATE OR REPLACE FUNCTION is_same_team(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT u1.team_id = u2.team_id
    FROM users u1, users u2
    WHERE u1.id = auth.uid()
    AND u2.id = check_user_id
    AND u1.team_id IS NOT NULL
    AND u2.team_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is head of the team that check_user_id belongs to
CREATE OR REPLACE FUNCTION is_head_of_users_team(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users u
    JOIN teams t ON u.team_id = t.id
    WHERE u.id = check_user_id
    AND t.team_head_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
