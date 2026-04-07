-- ============================================================================
-- REPLACE team_performance MATERIALIZED VIEW WITH REGULAR VIEW
-- ============================================================================
-- Problem: team_performance is a MATERIALIZED VIEW — a frozen snapshot that
-- only reflects data as of when it was last REFRESH'd (at migration time).
-- All call reports, evaluations, one-liners, etc. created after the last
-- migration ran show as 0 in the management Teams tab.
--
-- Fix: Replace with a regular VIEW. A regular view computes live on every
-- query — always current, no refresh mechanism needed.
-- ============================================================================

-- Drop materialized view (CASCADE automatically drops associated indexes:
--   idx_team_performance_team_id, idx_team_performance_team_type)
DROP MATERIALIZED VIEW IF EXISTS team_performance CASCADE;

-- ============================================================================
-- Recreate as a regular live VIEW
-- ============================================================================
CREATE VIEW team_performance AS
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
    COALESCE(cr.created_at, '1970-01-01'::timestamptz),
    COALESCE(ef.created_at, '1970-01-01'::timestamptz),
    COALESCE(dol.created_at, '1970-01-01'::timestamptz),
    COALESCE(ol.decided_at, '1970-01-01'::timestamptz)
  )) AS last_activity,

  -- Metadata
  t.created_at AS team_created_at,
  NOW() AS metrics_updated_at

FROM teams t
LEFT JOIN users th ON t.team_head_id = th.id AND th.status = 'active'
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

-- Only show teams that have at least one active member
HAVING COUNT(DISTINCT u.id) > 0;

-- ============================================================================
-- Security (consistent with 20260210000002_secure_unrestricted_views.sql)
-- ============================================================================
-- security_invoker = on: view runs as the calling user, so RLS on underlying
-- tables is respected when queried via browser client.
ALTER VIEW team_performance SET (security_invoker = on);

REVOKE ALL ON team_performance FROM anon, public;
GRANT SELECT ON team_performance TO authenticated;
GRANT SELECT ON team_performance TO service_role;

-- ============================================================================
-- Make refresh function a no-op
-- ============================================================================
-- Five API routes in app/api/admin/teams/ call refresh_all_team_views() RPC
-- which calls refresh_team_performance(). A regular view needs no refresh.
-- Replace with a no-op so those callers continue to work without error.
CREATE OR REPLACE FUNCTION refresh_team_performance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Regular view: no refresh needed, data is always live.
  NULL;
END;
$$;

COMMENT ON VIEW team_performance IS
  'Live aggregated team performance metrics for management dashboard. '
  'Replaced materialized view with regular view (2026-04-07) to eliminate stale data.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  team_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO team_count FROM team_performance;
  RAISE NOTICE '✅ team_performance view created as regular VIEW with % teams', team_count;
  RAISE NOTICE '   Data is now live — no refresh needed.';
END;
$$;
