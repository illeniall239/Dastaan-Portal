-- Migration: Writer Financial Summary Materialized View
-- Replaces JavaScript aggregations in app/api/management/writer-financial-summary/route.ts
-- with efficient SQL aggregations

CREATE MATERIALIZED VIEW writer_financial_summary AS
WITH writer_negotiations AS (
  SELECT
    n.writer_producer_name,
    s.story_id,
    SUM(CAST(n.agreed_price AS numeric)) AS total_negotiated
  FROM negotiations n
  LEFT JOIN stories s ON s.id = n.story_id
  WHERE n.status = 'agreed'
  GROUP BY n.writer_producer_name, s.story_id
),
writer_contracts AS (
  SELECT
    ps.writer_producer_name,
    s.story_id,
    -- Distribute contract value evenly across all payment schedules for that contract
    SUM(CAST(c.total_value AS numeric) / GREATEST(1, (
      SELECT COUNT(*)
      FROM payment_schedules ps2
      WHERE ps2.contract_id = c.id
    ))) AS total_contracted
  FROM contracts c
  JOIN payment_schedules ps ON ps.contract_id = c.id
  LEFT JOIN stories s ON s.id = c.story_id
  WHERE c.status IN ('active', 'pending_signatures', 'completed')
  GROUP BY ps.writer_producer_name, s.story_id
),
writer_payments AS (
  SELECT
    ps.writer_producer_name,
    SUM(CAST(p.net_amount AS numeric)) AS total_paid
  FROM payments p
  JOIN payment_schedules ps ON ps.id = p.schedule_id
  WHERE p.status = 'paid'
  GROUP BY ps.writer_producer_name
),
all_writers AS (
  -- Get unique list of all writer names
  SELECT DISTINCT writer_producer_name
  FROM (
    SELECT writer_producer_name FROM writer_negotiations
    UNION
    SELECT writer_producer_name FROM writer_contracts
    UNION
    SELECT writer_producer_name FROM writer_payments
  ) writers
  WHERE writer_producer_name IS NOT NULL
)
SELECT
  COALESCE(w.writer_producer_name, 'Unknown') AS writer_name,
  COALESCE(SUM(wn.total_negotiated), 0) AS total_negotiated,
  COALESCE(SUM(wc.total_contracted), 0) AS total_contracted,
  COALESCE(MAX(wp.total_paid), 0) AS total_paid,
  -- Outstanding = max(contracted, negotiated) - paid
  GREATEST(
    COALESCE(SUM(wn.total_negotiated), 0),
    COALESCE(SUM(wc.total_contracted), 0)
  ) - COALESCE(MAX(wp.total_paid), 0) AS outstanding_balance,
  -- Count unique story IDs for project count
  COUNT(DISTINCT COALESCE(wn.story_id, wc.story_id)) AS project_count
FROM all_writers w
LEFT JOIN writer_negotiations wn ON w.writer_producer_name = wn.writer_producer_name
LEFT JOIN writer_contracts wc ON w.writer_producer_name = wc.writer_producer_name
LEFT JOIN writer_payments wp ON w.writer_producer_name = wp.writer_producer_name
GROUP BY w.writer_producer_name;

-- Index for performance
CREATE INDEX idx_writer_financial_summary_writer ON writer_financial_summary(writer_name);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_writer_financial_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW writer_financial_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the view
COMMENT ON MATERIALIZED VIEW writer_financial_summary IS 'Aggregated financial data per writer. Refresh with refresh_writer_financial_summary(). Replaces JavaScript aggregations for significant performance improvement.';

-- Grant SELECT permissions
GRANT SELECT ON writer_financial_summary TO authenticated;
GRANT SELECT ON writer_financial_summary TO service_role;
