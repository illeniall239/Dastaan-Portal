-- Migration: Add Call Report Support to External Evaluation System
-- Date: 2025-12-14
-- Description: Extends external_evaluation_links and external_evaluations tables
--              to support call_report content type alongside episode and one_liner

-- =====================================================
-- Update external_evaluation_links table
-- =====================================================

-- Drop existing CHECK constraint
ALTER TABLE external_evaluation_links
DROP CONSTRAINT IF EXISTS external_evaluation_links_content_type_check;

-- Add new CHECK constraint with call_report support
ALTER TABLE external_evaluation_links
ADD CONSTRAINT external_evaluation_links_content_type_check
CHECK (content_type IN ('one_liner', 'episode', 'call_report'));

-- =====================================================
-- Update external_evaluations table
-- =====================================================

-- Drop existing CHECK constraint
ALTER TABLE external_evaluations
DROP CONSTRAINT IF EXISTS external_evaluations_content_type_check;

-- Add new CHECK constraint with call_report support
ALTER TABLE external_evaluations
ADD CONSTRAINT external_evaluations_content_type_check
CHECK (content_type IN ('one_liner', 'episode', 'call_report'));

-- =====================================================
-- Verification
-- =====================================================

-- Verify constraints were updated successfully
DO $$
DECLARE
  v_links_constraint_exists BOOLEAN;
  v_evaluations_constraint_exists BOOLEAN;
BEGIN
  -- Check external_evaluation_links constraint
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'external_evaluation_links_content_type_check'
  ) INTO v_links_constraint_exists;

  -- Check external_evaluations constraint
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'external_evaluations_content_type_check'
  ) INTO v_evaluations_constraint_exists;

  IF v_links_constraint_exists AND v_evaluations_constraint_exists THEN
    RAISE NOTICE '✅ Migration successful: Call report support added to external evaluation system';
  ELSE
    RAISE WARNING '⚠️ Migration may have failed - constraints not properly updated';
  END IF;
END $$;
