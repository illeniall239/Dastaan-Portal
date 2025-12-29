-- Migration: Evaluator Stats SQL Function
-- Replaces N+1 query pattern in lib/management/evaluator-performance.ts
-- with a single efficient SQL function

CREATE OR REPLACE FUNCTION get_all_evaluator_stats(
  from_date timestamptz DEFAULT NULL,
  to_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  evaluator_id uuid,
  evaluator_name text,
  evaluator_email text,
  oneliner_evaluations bigint,
  episodic_evals bigint,
  writer_engagement_reports bigint,
  total_evaluations bigint,
  total_time_spent_minutes bigint,
  active_days integer
) AS $$
BEGIN
  RETURN QUERY
  WITH evaluator_list AS (
    SELECT id, name, email
    FROM users
    WHERE role = 'evaluator' AND status = 'active'
  ),
  call_report_stats AS (
    SELECT
      ef.evaluator_id,
      COUNT(*) AS count,
      SUM(COALESCE(ef.time_spent_minutes, 0)) AS time_minutes,
      ARRAY_AGG(DISTINCT DATE(ef.created_at)) AS activity_dates
    FROM evaluator_forms ef
    WHERE (from_date IS NULL OR ef.created_at >= from_date)
      AND (to_date IS NULL OR ef.created_at <= to_date)
    GROUP BY ef.evaluator_id
  ),
  episodic_stats AS (
    SELECT
      ee.evaluator_id,
      COUNT(*) AS count,
      SUM(COALESCE(ee.time_spent_minutes, 0)) AS time_minutes,
      ARRAY_AGG(DISTINCT DATE(ee.submitted_at)) AS activity_dates
    FROM episodic_evaluations ee
    WHERE (from_date IS NULL OR ee.submitted_at >= from_date)
      AND (to_date IS NULL OR ee.submitted_at <= to_date)
    GROUP BY ee.evaluator_id
  ),
  call_report_created_stats AS (
    SELECT
      cr.created_by AS evaluator_id,
      COUNT(*) AS count,
      SUM(COALESCE(cr.time_spent_minutes, 0)) AS time_minutes,
      ARRAY_AGG(DISTINCT DATE(cr.created_at)) AS activity_dates
    FROM call_reports cr
    WHERE (from_date IS NULL OR cr.created_at >= from_date)
      AND (to_date IS NULL OR cr.created_at <= to_date)
    GROUP BY cr.created_by
  )
  SELECT
    el.id AS evaluator_id,
    el.name AS evaluator_name,
    el.email AS evaluator_email,
    COALESCE(crs.count, 0) AS oneliner_evaluations,
    COALESCE(es.count, 0) AS episodic_evals,
    COALESCE(crcs.count, 0) AS writer_engagement_reports,
    COALESCE(crs.count, 0) + COALESCE(es.count, 0) + COALESCE(crcs.count, 0) AS total_evaluations,
    COALESCE(crs.time_minutes, 0) + COALESCE(es.time_minutes, 0) + COALESCE(crcs.time_minutes, 0) AS total_time_spent_minutes,
    CARDINALITY(ARRAY(
      SELECT DISTINCT unnest_val
      FROM unnest(
        COALESCE(crs.activity_dates, ARRAY[]::date[]) ||
        COALESCE(es.activity_dates, ARRAY[]::date[]) ||
        COALESCE(crcs.activity_dates, ARRAY[]::date[])
      ) AS unnest_val
    )) AS active_days
  FROM evaluator_list el
  LEFT JOIN call_report_stats crs ON crs.evaluator_id = el.id
  LEFT JOIN episodic_stats es ON es.evaluator_id = el.id
  LEFT JOIN call_report_created_stats crcs ON crcs.evaluator_id = el.id
  ORDER BY total_evaluations DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION get_all_evaluator_stats IS 'Aggregates evaluator performance stats with optional date filtering. Replaces N+1 query pattern for significant performance improvement.';
