-- Replace "Muhammad Waqar" with "Editor" in TEXT fields only
-- UUID foreign key fields will automatically show updated name via JOIN

-- ============================================================
-- UPDATE USERS TABLE (This cascades to all JOINs automatically)
-- ============================================================

UPDATE users
SET name = 'Editor'
WHERE name = 'Muhammad Waqar';

-- ============================================================
-- UPDATE TEXT FIELDS (Denormalized copies)
-- ============================================================

-- Update stories.logged_by (TEXT field)
UPDATE stories
SET logged_by = 'Editor'
WHERE logged_by = 'Muhammad Waqar';

-- Update call_reports.writer_name (business data - external writer info)
UPDATE call_reports
SET writer_name = 'Editor'
WHERE writer_name = 'Muhammad Waqar';

-- Update rejected_archive.logged_by (TEXT field)
UPDATE rejected_archive
SET logged_by = 'Editor'
WHERE logged_by = 'Muhammad Waqar';

-- Update evaluations_snapshot.evaluator_name (TEXT field)
UPDATE evaluations_snapshot
SET evaluator_name = 'Editor'
WHERE evaluator_name = 'Muhammad Waqar';

-- Update one_liners.writer_name (business data)
UPDATE one_liners
SET writer_name = 'Editor'
WHERE writer_name = 'Muhammad Waqar';

-- Update evaluator_forms.target_writer (TEXT field)
UPDATE evaluator_forms
SET target_writer = 'Editor'
WHERE target_writer = 'Muhammad Waqar';

-- Update contracts (business data)
UPDATE contracts
SET party_a_name = 'Editor'
WHERE party_a_name = 'Muhammad Waqar';

UPDATE contracts
SET party_b_name = 'Editor'
WHERE party_b_name = 'Muhammad Waqar';

-- NOTE: All other tables (episodes, call_reports created_by, audit_logs, etc.)
-- use UUID foreign keys that JOIN with users table, so they will automatically
-- show "Editor" after the users.name update above.
