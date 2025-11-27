-- Simple direct replacement: Find and replace "Muhammad Waqar" with "Editor" in ALL relevant columns

-- Update users table
UPDATE users SET name = 'Editor' WHERE name = 'Muhammad Waqar';

-- Update stories table
UPDATE stories SET logged_by = 'Editor' WHERE logged_by = 'Muhammad Waqar';

-- Update call_reports table (if it has a logged_by or created_by_name column)
UPDATE call_reports SET writer_name = 'Editor' WHERE writer_name = 'Muhammad Waqar';

-- Update rejected_archive table
UPDATE rejected_archive SET logged_by = 'Editor' WHERE logged_by = 'Muhammad Waqar';

-- Update evaluations_snapshot table
UPDATE evaluations_snapshot SET evaluator_name = 'Editor' WHERE evaluator_name = 'Muhammad Waqar';
UPDATE evaluations_snapshot SET evaluator_email = 'editor@geo.com' WHERE evaluator_name = 'Editor' AND evaluator_email LIKE '%muhammad%';

-- Update episodes table (if column exists)
UPDATE episodes SET logged_by = 'Editor' WHERE logged_by = 'Muhammad Waqar';

-- Update audit_logs table (if column exists)
UPDATE audit_logs SET performed_by = 'Editor' WHERE performed_by = 'Muhammad Waqar';

-- Update one_liners table
UPDATE one_liners SET writer_name = 'Editor' WHERE writer_name = 'Muhammad Waqar';

-- Update any other table that might have the name
UPDATE contracts SET party_a_name = 'Editor' WHERE party_a_name = 'Muhammad Waqar';
UPDATE contracts SET party_b_name = 'Editor' WHERE party_b_name = 'Muhammad Waqar';

UPDATE evaluator_forms SET target_writer = 'Editor' WHERE target_writer = 'Muhammad Waqar';

-- Refresh materialized views to reflect changes (if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'team_performance'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY team_performance;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'team_hierarchy'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY team_hierarchy;
  END IF;
END $$;
