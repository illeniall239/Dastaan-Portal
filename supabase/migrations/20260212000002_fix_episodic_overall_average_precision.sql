-- Fix 1: Add missing evaluation_count column to episodes table
-- The trigger update_episode_evaluation_counts() (from 20260103000000) tries to
-- SET evaluation_count on episodes, but the column was never created.
-- This is the root cause of the 500 error on episodic evaluation submission.
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS evaluation_count INT DEFAULT 0;

COMMENT ON COLUMN public.episodes.evaluation_count IS
  'Count of evaluator episodic evaluations (excludes management/programmer). Updated by trigger.';

-- Fix 2: DECIMAL(3,2) overflow on overall_average column
-- DECIMAL(3,2) max is 9.99, but when all 6 scores are 10, the average = 10.00
-- Must drop and recreate the dependent view first

DROP VIEW IF EXISTS episodic_evaluations_with_type;

ALTER TABLE public.episodic_evaluations
  ALTER COLUMN overall_average TYPE DECIMAL(4,2);

-- Recreate the view (from migration 20260104000001)
CREATE OR REPLACE VIEW episodic_evaluations_with_type AS
SELECT
  ee.*,
  u.name AS evaluator_name,
  u.email AS evaluator_email,
  u.role AS evaluator_role,
  CASE
    WHEN u.role = 'programmer' THEN 'programmer'::TEXT
    WHEN u.role IN ('admin', 'management', 'executive') THEN 'management'::TEXT
    ELSE 'evaluator'::TEXT
  END AS evaluation_type
FROM episodic_evaluations ee
INNER JOIN users u ON ee.evaluator_id = u.id;

-- Re-apply security settings (from migration 20260210000002)
ALTER VIEW episodic_evaluations_with_type SET (security_invoker = on);
GRANT SELECT ON episodic_evaluations_with_type TO authenticated;

-- Backfill evaluation_count for existing episodes
UPDATE episodes e
SET evaluation_count = (
  SELECT COUNT(DISTINCT ee.evaluator_id)
  FROM episodic_evaluations ee
  INNER JOIN users u ON ee.evaluator_id = u.id
  WHERE ee.episode_id = e.id
    AND u.role NOT IN ('admin', 'management', 'executive', 'programmer')
);
