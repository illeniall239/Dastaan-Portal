-- Fix writer_engagements FK: should reference writers(id) not call_report_writers(id)
-- Run this ONLY if 20260207120000 was already applied with the old FK.
-- If you dropped and re-ran 20260207120000 with the fix, skip this migration.

ALTER TABLE writer_engagements
  DROP CONSTRAINT IF EXISTS writer_engagements_writer_id_fkey;

ALTER TABLE writer_engagements
  ADD CONSTRAINT writer_engagements_writer_id_fkey
  FOREIGN KEY (writer_id) REFERENCES writers(id);
