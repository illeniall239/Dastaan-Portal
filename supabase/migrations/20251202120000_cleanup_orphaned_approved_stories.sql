-- Cleanup Migration: Revert orphaned approved stories
--
-- This migration finds stories that are marked as "approved" but have no
-- associated call_reports (because the call reports were deleted).
-- It reverts these stories back to "submitted" status.

DO $$
DECLARE
  v_affected_count INT;
BEGIN
  -- Find and update stories that are approved but have no call reports
  WITH orphaned_stories AS (
    SELECT s.id, s.story_id, s.title, s.status
    FROM stories s
    WHERE s.status = 'approved'
    AND NOT EXISTS (
      SELECT 1
      FROM call_reports cr
      WHERE cr.story_id = s.id
    )
  )
  UPDATE stories
  SET
    status = 'submitted',
    updated_at = NOW()
  FROM orphaned_stories
  WHERE stories.id = orphaned_stories.id;

  -- Get count of affected rows
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;

  -- Log the cleanup
  RAISE NOTICE 'Cleanup complete: % orphaned approved stories reverted to submitted status', v_affected_count;
END $$;

-- Verify the cleanup
DO $$
DECLARE
  v_remaining_orphaned INT;
BEGIN
  -- Check if any orphaned approved stories still exist
  SELECT COUNT(*) INTO v_remaining_orphaned
  FROM stories s
  WHERE s.status = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM call_reports cr
    WHERE cr.story_id = s.id
  );

  IF v_remaining_orphaned > 0 THEN
    RAISE WARNING 'Warning: % orphaned approved stories still exist', v_remaining_orphaned;
  ELSE
    RAISE NOTICE '✅ Verification passed: No orphaned approved stories remain';
  END IF;
END $$;
