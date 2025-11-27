-- Add Content Head Initiative fields to call_reports table
-- These fields track internal content head initiatives with privacy controls

-- ============================================================
-- PART 1: ADD NEW COLUMNS
-- ============================================================

-- New columns for content head initiatives
ALTER TABLE call_reports
  ADD COLUMN idea_by TEXT,
  ADD COLUMN developed_by TEXT,
  ADD COLUMN management_member_name TEXT;

-- Add column comments for documentation
COMMENT ON COLUMN call_reports.idea_by IS 'Private: Who originated the idea (Content Head Initiative only) - visible only to creator and management';
COMMENT ON COLUMN call_reports.developed_by IS 'Private: Who developed the concept (Content Head Initiative only) - visible only to creator and management';
COMMENT ON COLUMN call_reports.management_member_name IS 'Which management member assigned this (Given by Management only)';

-- ============================================================
-- PART 2: UPDATE CATEGORY CONSTRAINT
-- ============================================================

-- Drop existing constraint
ALTER TABLE call_reports
  DROP CONSTRAINT IF EXISTS call_reports_category_check;

-- Add updated constraint with new categories
ALTER TABLE call_reports
  ADD CONSTRAINT call_reports_category_check
  CHECK (category IN (
    'external_producer',
    'writer_pitch',
    'inhouse_content',
    'content_head_initiative',
    'given_by_management'
  ));

-- Update category column comment
COMMENT ON COLUMN call_reports.category IS 'Source of idea: external_producer, writer_pitch, inhouse_content, content_head_initiative, given_by_management';
