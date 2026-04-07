-- ============================================================================
-- TEAM PERFORMANCE VIEW: ALL-TIME COUNTS
-- ============================================================================
-- Change: Remove 90-day date filters from primary metric columns so charts
-- and stat cards reflect all-time activity, not just the last 90 days.
-- The _last_30_days columns remain 30-day filtered for reference.
-- ============================================================================

DROP VIEW IF EXISTS team_performance CASCADE;

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

  -- Call Reports — all time
  COUNT(DISTINCT cr.id) AS call_reports_created,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.created_at > NOW() - INTERVAL '30 days') AS call_reports_last_30_days,

  -- Evaluations — all time
  COUNT(DISTINCT ef.id) AS evaluations_completed,
  COUNT(DISTINCT ef.id) FILTER (WHERE ef.created_at > NOW() - INTERVAL '30 days') AS evaluations_last_30_days,
  AVG(ef.average_score) AS avg_evaluation_score,

  -- One-Liners — all time
  COUNT(DISTINCT dol.id) AS one_liners_logged,
  COUNT(DISTINCT dol.id) FILTER (WHERE dol.created_at > NOW() - INTERVAL '30 days') AS one_liners_last_30_days,

  -- Approvals/Rejections — all time
  COUNT(DISTINCT CASE WHEN ol.decision = 'approved' THEN s.id END) AS stories_approved,
  COUNT(DISTINCT CASE WHEN ol.decision = 'rejected' THEN s.id END) AS stories_rejected,
  COUNT(DISTINCT CASE WHEN ol.decision = 'approved' AND ol.decided_at > NOW() - INTERVAL '30 days' THEN s.id END) AS stories_approved_last_30_days,
  COUNT(DISTINCT CASE WHEN ol.decision = 'rejected' AND ol.decided_at > NOW() - INTERVAL '30 days' THEN s.id END) AS stories_rejected_last_30_days,

  -- Last activity timestamp
  MAX(GREATEST(
    COALESCE(cr.created_at, '1970-01-01'::timestamptz),
    COALESCE(ef.created_at, '1970-01-01'::timestamptz),
    COALESCE(dol.created_at, '1970-01-01'::timestamptz),
    COALESCE(ol.decided_at, '1970-01-01'::timestamptz)
  )) AS last_activity,

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

GROUP BY t.id, t.name, t.team_type, t.description, t.created_at, th.name, th.email
HAVING COUNT(DISTINCT u.id) > 0;

-- Security
ALTER VIEW team_performance SET (security_invoker = on);
REVOKE ALL ON team_performance FROM anon, public;
GRANT SELECT ON team_performance TO authenticated;
GRANT SELECT ON team_performance TO service_role;

COMMENT ON VIEW team_performance IS
  'Live team performance metrics — all-time counts, no date restrictions. Updated 2026-04-07.';
