-- ============================================================================
-- ADD INITIAL ASSESSMENT TO EPISODES
-- ============================================================================
-- Purpose: Add a 1-10 initial assessment score to episodes, mirroring the
--          call_reports.overall_rating pattern.
-- ============================================================================

ALTER TABLE episodes ADD COLUMN IF NOT EXISTS initial_assessment INTEGER;

ALTER TABLE episodes ADD CONSTRAINT episodes_initial_assessment_range
  CHECK (initial_assessment IS NULL OR (initial_assessment >= 1 AND initial_assessment <= 10));

COMMENT ON COLUMN episodes.initial_assessment IS
  'Initial assessment score (1-10) from content manager when logging the episode';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
