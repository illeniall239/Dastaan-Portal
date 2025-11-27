-- ============================================================================
-- ADD MISSING STORY CATEGORIES
-- ============================================================================
-- Problem: Call report form has 5 category options but stories table constraint
--          only allows 3, causing check constraint violations
-- Solution: Update the constraint to include all 5 category values
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_category_check;

-- Add updated constraint with all 5 category values
ALTER TABLE stories ADD CONSTRAINT stories_category_check
  CHECK (category IS NULL OR category IN (
    'external_producer',
    'writer_pitch',
    'inhouse_content',
    'content_head_initiative',
    'given_by_management'
  ));

-- Update comment
COMMENT ON COLUMN stories.category IS 'Source of idea: external_producer, writer_pitch, inhouse_content, content_head_initiative, or given_by_management (optional)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
