-- Migration: Add Programmer Evaluation Type
-- Description: Extends evaluation segregation to include programmer as third category
-- Date: 2026-01-04

-- ============================================================================
-- Step 1: Update call_report_evaluations_with_type view
-- ============================================================================
-- Add three-way classification: evaluator, management, programmer

CREATE OR REPLACE VIEW call_report_evaluations_with_type AS
SELECT
  ef.*,
  u.name AS evaluator_name,
  u.email AS evaluator_email,
  u.role AS evaluator_role,
  CASE
    WHEN u.role = 'programmer' THEN 'programmer'::TEXT
    WHEN u.role IN ('admin', 'management', 'executive') THEN 'management'::TEXT
    ELSE 'evaluator'::TEXT
  END AS evaluation_type
FROM evaluator_forms ef
INNER JOIN users u ON ef.evaluator_id = u.id;

-- ============================================================================
-- Step 2: Update episodic_evaluations_with_type view
-- ============================================================================
-- Add three-way classification: evaluator, management, programmer

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

-- ============================================================================
-- Step 3: Update call report evaluation count trigger
-- ============================================================================
-- Exclude programmer evaluations from required evaluator quota counts

CREATE OR REPLACE FUNCTION update_call_report_evaluation_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE call_reports
  SET
    completed_evaluations = (
      SELECT COUNT(DISTINCT ef.evaluator_id)
      FROM evaluator_forms ef
      INNER JOIN users u ON ef.evaluator_id = u.id
      WHERE ef.call_report_id = COALESCE(NEW.call_report_id, OLD.call_report_id)
        AND u.role NOT IN ('admin', 'management', 'executive', 'programmer')
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.call_report_id, OLD.call_report_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- Step 4: Update episode evaluation count trigger
-- ============================================================================
-- Exclude programmer evaluations from required evaluator quota counts

CREATE OR REPLACE FUNCTION update_episode_evaluation_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE episodes
  SET
    evaluation_count = (
      SELECT COUNT(DISTINCT ee.evaluator_id)
      FROM episodic_evaluations ee
      INNER JOIN users u ON ee.evaluator_id = u.id
      WHERE ee.episode_id = COALESCE(NEW.episode_id, OLD.episode_id)
        AND u.role NOT IN ('admin', 'management', 'executive', 'programmer')
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.episode_id, OLD.episode_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Programmer evaluations will now:
-- 1. Be classified as 'programmer' type in views (retroactively for existing data)
-- 2. Not count toward required evaluator quotas (like management evaluations)
-- 3. Display separately in UI with green styling
