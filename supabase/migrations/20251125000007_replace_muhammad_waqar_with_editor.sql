-- One-time replacement: Change "Muhammad Waqar" to "Editor" across all tables
-- This anonymizes the user's identity in historical records

-- ============================================================
-- UPDATE USER NAME IN USERS TABLE
-- ============================================================

-- Update the user record itself
UPDATE users
SET name = 'Editor'
WHERE name = 'Muhammad Waqar';

-- ============================================================
-- UPDATE DENORMALIZED NAME FIELDS IN RELATED TABLES
-- ============================================================

-- Update stories.logged_by (TEXT field)
UPDATE stories
SET logged_by = 'Editor'
WHERE logged_by = 'Muhammad Waqar';

-- Update rejected_archive.logged_by (archive snapshot)
UPDATE rejected_archive
SET logged_by = 'Editor'
WHERE logged_by = 'Muhammad Waqar';

-- Update evaluations_snapshot.evaluator_name (archive snapshot)
UPDATE evaluations_snapshot
SET evaluator_name = 'Editor'
WHERE evaluator_name = 'Muhammad Waqar';

-- Note: call_reports table uses created_by (UUID FK) which JOINs with users table
-- The name update in users table will automatically reflect in call_reports via JOIN
-- No denormalized name field exists in call_reports

-- Update episodes table if it has denormalized logged_by_name
-- (checking if column exists first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'episodes'
    AND column_name = 'logged_by_name'
  ) THEN
    EXECUTE 'UPDATE episodes SET logged_by_name = ''Editor'' WHERE logged_by_name = ''Muhammad Waqar''';
  END IF;
END $$;

-- Update audit_logs if it has denormalized performed_by_name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs'
    AND column_name = 'performed_by_name'
  ) THEN
    EXECUTE 'UPDATE audit_logs SET performed_by_name = ''Editor'' WHERE performed_by_name = ''Muhammad Waqar''';
  END IF;
END $$;

-- ============================================================
-- VERIFY CHANGES
-- ============================================================

-- Show count of remaining instances (should be 0)
DO $$
DECLARE
  stories_count INT;
  archive_count INT;
  eval_count INT;
  users_count INT;
BEGIN
  SELECT COUNT(*) INTO stories_count FROM stories WHERE logged_by = 'Muhammad Waqar';
  SELECT COUNT(*) INTO archive_count FROM rejected_archive WHERE logged_by = 'Muhammad Waqar';
  SELECT COUNT(*) INTO eval_count FROM evaluations_snapshot WHERE evaluator_name = 'Muhammad Waqar';
  SELECT COUNT(*) INTO users_count FROM users WHERE name = 'Muhammad Waqar';

  RAISE NOTICE 'Replacement complete. Remaining instances:';
  RAISE NOTICE '  stories.logged_by: %', stories_count;
  RAISE NOTICE '  rejected_archive.logged_by: %', archive_count;
  RAISE NOTICE '  evaluations_snapshot.evaluator_name: %', eval_count;
  RAISE NOTICE '  users.name: %', users_count;
END $$;
