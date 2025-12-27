-- ============================================================================
-- FIX TEAM PERFORMANCE VIEW - EXCLUDE DELETED USERS AND EMPTY TEAMS
-- ============================================================================
-- Problem: The team_performance view shows:
--   1. Teams with all deleted members (team_member_count = 0)
--   2. Deleted team heads (not filtering by status)
-- Solution:
--   1. Filter team heads by status = 'active'
--   2. Add HAVING clause to exclude teams with no active members
-- ============================================================================

-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS team_performance CASCADE;

-- Recreate team_performance materialized view with deleted user filtering
CREATE MATERIALIZED VIEW team_performance AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  t.team_type,
  t.description,
  th.name AS team_head_name,
  th.email AS team_head_email,

  -- Team composition (only active members)
  COUNT(DISTINCT u.id) AS team_member_count,

  -- Call Reports (last 90 days)
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.created_at > NOW() - INTERVAL '90 days') AS call_reports_created,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.created_at > NOW() - INTERVAL '30 days') AS call_reports_last_30_days,

  -- Evaluations (last 90 days)
  COUNT(DISTINCT ef.id) FILTER (WHERE ef.created_at > NOW() - INTERVAL '90 days') AS evaluations_completed,
  COUNT(DISTINCT ef.id) FILTER (WHERE ef.created_at > NOW() - INTERVAL '30 days') AS evaluations_last_30_days,
  AVG(ef.average_score) FILTER (WHERE ef.created_at > NOW() - INTERVAL '90 days') AS avg_evaluation_score,

  -- One-Liners (last 90 days)
  COUNT(DISTINCT dol.id) FILTER (WHERE dol.created_at > NOW() - INTERVAL '90 days') AS one_liners_logged,
  COUNT(DISTINCT dol.id) FILTER (WHERE dol.created_at > NOW() - INTERVAL '30 days') AS one_liners_last_30_days,

  -- Approvals/Rejections (last 90 days)
  COUNT(DISTINCT CASE WHEN ol.decision = 'approved' AND ol.decided_at > NOW() - INTERVAL '90 days' THEN s.id END) AS stories_approved,
  COUNT(DISTINCT CASE WHEN ol.decision = 'rejected' AND ol.decided_at > NOW() - INTERVAL '90 days' THEN s.id END) AS stories_rejected,
  COUNT(DISTINCT CASE WHEN ol.decision = 'approved' AND ol.decided_at > NOW() - INTERVAL '30 days' THEN s.id END) AS stories_approved_last_30_days,
  COUNT(DISTINCT CASE WHEN ol.decision = 'rejected' AND ol.decided_at > NOW() - INTERVAL '30 days' THEN s.id END) AS stories_rejected_last_30_days,

  -- Activity tracking
  MAX(GREATEST(
    COALESCE(cr.created_at, '1970-01-01'::timestamp),
    COALESCE(ef.created_at, '1970-01-01'::timestamp),
    COALESCE(dol.created_at, '1970-01-01'::timestamp),
    COALESCE(ol.decided_at, '1970-01-01'::timestamp)
  )) AS last_activity,

  -- Metadata
  t.created_at AS team_created_at,
  NOW() AS metrics_updated_at

FROM teams t
-- FIXED: Filter team head by active status
LEFT JOIN users th ON t.team_head_id = th.id AND th.status = 'active'
-- Already filtered: only active team members
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

-- FIXED: Exclude teams with no active members
HAVING COUNT(DISTINCT u.id) > 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_team_performance_team_id ON team_performance (team_id);
CREATE INDEX IF NOT EXISTS idx_team_performance_team_type ON team_performance (team_type);

-- Grant access to authenticated users
GRANT SELECT ON team_performance TO authenticated;

-- Add comment
COMMENT ON MATERIALIZED VIEW team_performance IS
  'Aggregated team performance metrics for management dashboard. Filters out deleted users and teams with no active members.';

-- ============================================================================
-- REFRESH THE VIEW WITH CURRENT DATA
-- ============================================================================

-- Refresh the materialized view to populate it with current data
REFRESH MATERIALIZED VIEW team_performance;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the view contains data
DO $$
DECLARE
  team_count INTEGER;
  empty_team_count INTEGER;
  deleted_head_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO team_count FROM team_performance;

  -- Check if any teams have 0 members (should be 0)
  SELECT COUNT(*) INTO empty_team_count
  FROM team_performance
  WHERE team_member_count = 0;

  -- Count teams with null team head (deleted heads filtered out)
  SELECT COUNT(*) INTO deleted_head_count
  FROM team_performance
  WHERE team_head_name IS NULL AND team_head_email IS NULL;

  RAISE NOTICE '✅ SUCCESS: team_performance view recreated';
  RAISE NOTICE '   - Total teams: %', team_count;
  RAISE NOTICE '   - Teams with 0 members (should be 0): %', empty_team_count;
  RAISE NOTICE '   - Teams without active head: %', deleted_head_count;

  IF empty_team_count > 0 THEN
    RAISE WARNING '⚠️  WARNING: Found % teams with 0 active members - these should have been filtered out!', empty_team_count;
  END IF;
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
