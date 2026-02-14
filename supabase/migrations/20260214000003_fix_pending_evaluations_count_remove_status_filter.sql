-- ============================================================================
-- FIX: PENDING EVALUATIONS COUNT — REMOVE STATUS FILTER
-- ============================================================================
-- Problem: RPC filters by cr.status = 'ready_for_evaluation' but the
--          evaluations list page shows ALL unevaluated call reports.
--          This causes the stat card to show 1 less than actual pending count.
-- Fix: Remove status filter. Simple logic: logged = pending, evaluated = done.
-- ============================================================================

-- Drop existing function (both signatures)
DROP FUNCTION IF EXISTS get_pending_evaluations_count(UUID);
DROP FUNCTION IF EXISTS get_pending_evaluations_count(UUID, UUID);

-- Recreate without status filter
CREATE OR REPLACE FUNCTION get_pending_evaluations_count(
  evaluator_user_id UUID,
  team_id_filter UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_count INTEGER;
  user_team_id UUID;
BEGIN
  -- If no team_id provided, get it from user
  IF team_id_filter IS NULL THEN
    SELECT team_id INTO user_team_id
    FROM users
    WHERE id = evaluator_user_id;
  ELSE
    user_team_id := team_id_filter;
  END IF;

  -- Count all unevaluated call reports (no status filter)
  SELECT COUNT(*)::INTEGER INTO result_count
  FROM call_reports cr
  WHERE cr.meeting_type = 'call_report'
  -- TEAM ISOLATION: Filter by team
  AND (user_team_id IS NULL OR cr.team_id = user_team_id)
  -- Exclude already evaluated
  AND NOT EXISTS (
    SELECT 1
    FROM evaluator_forms ef
    WHERE ef.call_report_id = cr.id
    AND ef.evaluator_id = evaluator_user_id
  );

  RETURN result_count;
END;
$$;

COMMENT ON FUNCTION get_pending_evaluations_count IS
  'Counts unevaluated call reports for evaluator with team isolation. Simple: logged = pending, evaluated = done.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
