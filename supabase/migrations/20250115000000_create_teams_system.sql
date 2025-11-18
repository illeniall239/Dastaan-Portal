-- ============================================================================
-- TEAMS SYSTEM MIGRATION
-- ============================================================================
-- Description: Create comprehensive team management system with hierarchy,
--              performance tracking, and role-based access control
-- Created: 2025-01-15
-- ============================================================================

-- ============================================================================
-- 1. CREATE TEAMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_type TEXT NOT NULL CHECK (team_type IN ('production', 'channel', 'adaptation', 'evaluator', 'other')),
  team_head_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE teams IS 'Organizational teams with flexible hierarchy support';
COMMENT ON COLUMN teams.parent_team_id IS 'Self-referencing for multi-level team hierarchy';
COMMENT ON COLUMN teams.team_head_id IS 'User who leads this team (can be evaluator or other role)';
COMMENT ON COLUMN teams.team_type IS 'Type of team: production, channel, adaptation, evaluator, or other';

-- ============================================================================
-- 2. ADD TEAM_ID TO USERS TABLE
-- ============================================================================

-- Add team_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN users.team_id IS 'Team this user belongs to (one team per user)';

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for team hierarchy queries
CREATE INDEX IF NOT EXISTS idx_teams_parent_team_id ON teams(parent_team_id) WHERE parent_team_id IS NOT NULL;

-- Index for team head lookup
CREATE INDEX IF NOT EXISTS idx_teams_team_head_id ON teams(team_head_id) WHERE team_head_id IS NOT NULL;

-- Index for team type filtering
CREATE INDEX IF NOT EXISTS idx_teams_team_type ON teams(team_type);

-- Index for user team lookup (critical for performance)
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id) WHERE team_id IS NOT NULL;

-- ============================================================================
-- 4. CREATE TEAM HIERARCHY MATERIALIZED VIEW
-- ============================================================================

-- Recursive view showing team hierarchy with levels and paths
CREATE MATERIALIZED VIEW IF NOT EXISTS team_hierarchy AS
WITH RECURSIVE team_tree AS (
  -- Base case: top-level teams (no parent)
  SELECT
    id,
    name,
    parent_team_id,
    team_head_id,
    team_type,
    0 as level,
    ARRAY[id] as path,
    name as full_path
  FROM teams
  WHERE parent_team_id IS NULL

  UNION ALL

  -- Recursive case: child teams
  SELECT
    t.id,
    t.name,
    t.parent_team_id,
    t.team_head_id,
    t.team_type,
    tt.level + 1,
    tt.path || t.id,
    tt.full_path || ' > ' || t.name
  FROM teams t
  INNER JOIN team_tree tt ON t.parent_team_id = tt.id
)
SELECT
  id as team_id,
  name as team_name,
  parent_team_id,
  team_head_id,
  team_type,
  level,
  path as hierarchy_path,
  full_path as hierarchy_display
FROM team_tree
ORDER BY level, name;

-- Create unique index on team_id for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_hierarchy_team_id ON team_hierarchy(team_id);

-- Add comment
COMMENT ON MATERIALIZED VIEW team_hierarchy IS 'Pre-computed team hierarchy showing parent-child relationships and depth';

-- ============================================================================
-- 5. CREATE TEAM PERFORMANCE MATERIALIZED VIEW
-- ============================================================================

-- Performance metrics aggregated by team (last 90 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS team_performance AS
SELECT
  t.id as team_id,
  t.name as team_name,
  t.team_type,
  t.description,
  th.name as team_head_name,
  th.email as team_head_email,

  -- Team composition
  COUNT(DISTINCT u.id) as team_member_count,

  -- Call Reports (last 90 days)
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.created_at > NOW() - INTERVAL '90 days') as call_reports_created,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.created_at > NOW() - INTERVAL '30 days') as call_reports_last_30_days,

  -- Evaluations (last 90 days)
  COUNT(DISTINCT ef.id) FILTER (WHERE ef.created_at > NOW() - INTERVAL '90 days') as evaluations_completed,
  COUNT(DISTINCT ef.id) FILTER (WHERE ef.created_at > NOW() - INTERVAL '30 days') as evaluations_last_30_days,
  AVG(ef.average_score) FILTER (WHERE ef.created_at > NOW() - INTERVAL '90 days') as avg_evaluation_score,

  -- One-Liners (last 90 days)
  COUNT(DISTINCT dol.id) FILTER (WHERE dol.created_at > NOW() - INTERVAL '90 days') as one_liners_logged,
  COUNT(DISTINCT dol.id) FILTER (WHERE dol.created_at > NOW() - INTERVAL '30 days') as one_liners_last_30_days,

  -- Approvals/Rejections (last 90 days)
  COUNT(DISTINCT CASE WHEN ol.decision = 'approved' AND ol.decided_at > NOW() - INTERVAL '90 days' THEN s.id END) as stories_approved,
  COUNT(DISTINCT CASE WHEN ol.decision = 'rejected' AND ol.decided_at > NOW() - INTERVAL '90 days' THEN s.id END) as stories_rejected,
  COUNT(DISTINCT CASE WHEN ol.decision = 'approved' AND ol.decided_at > NOW() - INTERVAL '30 days' THEN s.id END) as stories_approved_last_30_days,
  COUNT(DISTINCT CASE WHEN ol.decision = 'rejected' AND ol.decided_at > NOW() - INTERVAL '30 days' THEN s.id END) as stories_rejected_last_30_days,

  -- Activity tracking
  MAX(GREATEST(
    COALESCE(cr.created_at, '1970-01-01'::timestamp),
    COALESCE(ef.created_at, '1970-01-01'::timestamp),
    COALESCE(dol.created_at, '1970-01-01'::timestamp),
    COALESCE(ol.decided_at, '1970-01-01'::timestamp)
  )) as last_activity,

  -- Metadata
  t.created_at as team_created_at,
  NOW() as metrics_updated_at

FROM teams t
LEFT JOIN users th ON t.team_head_id = th.id
LEFT JOIN users u ON u.team_id = t.id AND u.status = 'active'
LEFT JOIN call_reports cr ON cr.created_by = u.id
LEFT JOIN evaluator_forms ef ON ef.evaluator_id = u.id
LEFT JOIN detailed_one_liners dol ON dol.created_by = u.id
LEFT JOIN one_liners ol ON ol.decided_by = u.id
LEFT JOIN stories s ON s.id = ol.story_id

GROUP BY
  t.id,
  t.name,
  t.team_type,
  t.description,
  t.created_at,
  th.name,
  th.email
WITH DATA;

-- Create unique index on team_id for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_performance_team_id ON team_performance(team_id);

-- Create index on team_type for filtering
CREATE INDEX IF NOT EXISTS idx_team_performance_team_type ON team_performance(team_type);

-- Create index on last_activity for sorting
CREATE INDEX IF NOT EXISTS idx_team_performance_last_activity ON team_performance(last_activity DESC NULLS LAST);

-- Add comment
COMMENT ON MATERIALIZED VIEW team_performance IS 'Pre-computed team performance metrics including call reports, evaluations, one-liners, and approvals';

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to refresh team hierarchy materialized view
CREATE OR REPLACE FUNCTION refresh_team_hierarchy()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY team_hierarchy;
END;
$$;

COMMENT ON FUNCTION refresh_team_hierarchy() IS 'Refresh team hierarchy materialized view (concurrent, non-blocking)';

-- Function to refresh team performance materialized view
CREATE OR REPLACE FUNCTION refresh_team_performance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY team_performance;
END;
$$;

COMMENT ON FUNCTION refresh_team_performance() IS 'Refresh team performance metrics (concurrent, non-blocking)';

-- Function to refresh all team-related materialized views
CREATE OR REPLACE FUNCTION refresh_all_team_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM refresh_team_hierarchy();
  PERFORM refresh_team_performance();
END;
$$;

COMMENT ON FUNCTION refresh_all_team_views() IS 'Refresh all team-related materialized views at once';

-- Function to check if team hierarchy would create a circular reference
CREATE OR REPLACE FUNCTION check_team_circular_reference(
  team_id_to_check UUID,
  new_parent_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_parent_id UUID;
BEGIN
  -- If new parent is null, no circular reference possible
  IF new_parent_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- If trying to set self as parent, that's circular
  IF team_id_to_check = new_parent_id THEN
    RETURN TRUE;
  END IF;

  -- Walk up the parent chain from new_parent_id
  current_parent_id := new_parent_id;

  WHILE current_parent_id IS NOT NULL LOOP
    -- If we encounter the team we're checking, we have a circular reference
    IF current_parent_id = team_id_to_check THEN
      RETURN TRUE;
    END IF;

    -- Move to next parent
    SELECT parent_team_id INTO current_parent_id
    FROM teams
    WHERE id = current_parent_id;
  END LOOP;

  -- No circular reference found
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION check_team_circular_reference(UUID, UUID) IS 'Check if setting a new parent would create circular reference in team hierarchy';

-- Function to get all team members (including sub-teams)
CREATE OR REPLACE FUNCTION get_team_members_recursive(team_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  user_team_id UUID,
  team_level INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE team_tree AS (
    -- Base case: direct team
    SELECT
      id,
      0 as level
    FROM teams
    WHERE id = team_id_param

    UNION ALL

    -- Recursive case: sub-teams
    SELECT
      t.id,
      tt.level + 1
    FROM teams t
    INNER JOIN team_tree tt ON t.parent_team_id = tt.id
  )
  SELECT
    u.id,
    u.name,
    u.email,
    u.role,
    u.team_id,
    tt.level
  FROM users u
  INNER JOIN team_tree tt ON u.team_id = tt.id
  WHERE u.status = 'active'
  ORDER BY tt.level, u.name;
END;
$$;

COMMENT ON FUNCTION get_team_members_recursive(UUID) IS 'Get all members of a team and its sub-teams recursively';

-- ============================================================================
-- 7. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS teams_updated_at_trigger ON teams;
CREATE TRIGGER teams_updated_at_trigger
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

COMMENT ON FUNCTION update_teams_updated_at() IS 'Auto-update updated_at timestamp when team is modified';

-- ============================================================================
-- 8. CREATE CONSTRAINT TRIGGER FOR CIRCULAR REFERENCE CHECK
-- ============================================================================

-- Trigger function to prevent circular references
CREATE OR REPLACE FUNCTION prevent_team_circular_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the new parent_team_id would create a circular reference
  IF NEW.parent_team_id IS NOT NULL THEN
    IF check_team_circular_reference(NEW.id, NEW.parent_team_id) THEN
      RAISE EXCEPTION 'Cannot set parent team: would create circular reference in team hierarchy';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create constraint trigger (runs after all other triggers and constraints)
DROP TRIGGER IF EXISTS teams_prevent_circular_reference_trigger ON teams;
CREATE CONSTRAINT TRIGGER teams_prevent_circular_reference_trigger
  AFTER INSERT OR UPDATE OF parent_team_id ON teams
  FOR EACH ROW
  EXECUTE FUNCTION prevent_team_circular_reference();

COMMENT ON FUNCTION prevent_team_circular_reference() IS 'Prevent circular references in team hierarchy';

-- ============================================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. CREATE RLS POLICIES FOR TEAMS TABLE
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS teams_admin_all ON teams;
DROP POLICY IF EXISTS teams_management_select ON teams;
DROP POLICY IF EXISTS teams_user_select ON teams;

-- Policy: Admins can do everything
CREATE POLICY teams_admin_all ON teams
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY teams_admin_all ON teams IS 'Admins have full access to all teams';

-- Policy: Management role can view all teams
CREATE POLICY teams_management_select ON teams
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('management', 'admin'));

COMMENT ON POLICY teams_management_select ON teams IS 'Management and admin roles can view all teams';

-- Policy: Users can view their own team
CREATE POLICY teams_user_select ON teams
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT team_id
      FROM users
      WHERE id = auth.uid() AND team_id IS NOT NULL
    )
  );

COMMENT ON POLICY teams_user_select ON teams IS 'Users can view their own team details';

-- ============================================================================
-- 11. GRANT PERMISSIONS
-- ============================================================================

-- Grant SELECT on materialized views to authenticated users
GRANT SELECT ON team_hierarchy TO authenticated;
GRANT SELECT ON team_performance TO authenticated;

-- Grant EXECUTE on refresh functions to authenticated users (will be restricted by RLS)
GRANT EXECUTE ON FUNCTION refresh_team_hierarchy() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_team_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_all_team_views() TO authenticated;

-- Grant EXECUTE on helper functions
GRANT EXECUTE ON FUNCTION check_team_circular_reference(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_members_recursive(UUID) TO authenticated;

-- ============================================================================
-- 12. INITIAL DATA REFRESH
-- ============================================================================

-- Refresh materialized views to populate initial data
SELECT refresh_all_team_views();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
