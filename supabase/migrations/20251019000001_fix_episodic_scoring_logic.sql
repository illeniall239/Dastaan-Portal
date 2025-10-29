-- =====================================================
-- Fix Episodic Evaluation Scoring Logic
-- =====================================================
-- This migration updates the scoring functions to calculate
-- scores relative to the standard (45 pages, 22 scenes)
-- instead of fixed +5/-5 values.
--
-- New Logic:
-- - 45 pages = 0 (meets standard)
-- - 46 pages = +1, 47 = +2, etc. (exceeds standard)
-- - 44 pages = -1, 43 = -2, etc. (below standard)
-- - Same for scenes (22 scenes = 0)

-- =====================================================
-- Update Pages Score Function
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_pages_score(pages INT)
RETURNS INT AS $$
BEGIN
  -- Return difference from standard (45 pages)
  RETURN pages - 45;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Update Scenes Score Function
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_scenes_score(scenes INT)
RETURNS INT AS $$
BEGIN
  -- Return difference from standard (22 scenes)
  RETURN scenes - 22;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Update Table Comments
-- =====================================================
COMMENT ON COLUMN public.episodic_evaluations.pages_score IS
'Auto-calculated: difference from standard (45 pages = 0, 46 = +1, 44 = -1, etc.)';

COMMENT ON COLUMN public.episodic_evaluations.scenes_score IS
'Auto-calculated: difference from standard (22 scenes = 0, 23 = +1, 21 = -1, etc.)';
