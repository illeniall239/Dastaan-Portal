-- ============================================================================
-- REMOVE UNUSED SLOT COLUMN FROM CALL_REPORTS
-- ============================================================================
-- Problem: The call_reports table has two slot-related columns: 'slot' and
--          'target_slot'. The system uses 'target_slot' but the unused 'slot'
--          column causes confusion and bugs when editing call reports.
-- Solution: Remove the unused 'slot' column to eliminate confusion
-- ============================================================================

-- Remove the unused 'slot' column
ALTER TABLE call_reports DROP COLUMN IF EXISTS slot;

-- Add comment for clarity on the remaining column
COMMENT ON COLUMN call_reports.target_slot IS
  'Target time slot for the content (e.g., prime time, afternoon, late night). This is the primary slot field used throughout the application.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the column was removed
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'call_reports'
      AND column_name = 'slot'
  ) INTO column_exists;

  IF column_exists THEN
    RAISE WARNING '⚠️  WARNING: The slot column still exists!';
  ELSE
    RAISE NOTICE '✅ SUCCESS: The unused slot column has been removed. Only target_slot remains.';
  END IF;
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
