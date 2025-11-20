-- Make category field optional in stories table
-- This allows call reports to be created without selecting a Source of Idea

-- Drop the existing constraint
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_category_check;

-- Make category nullable
ALTER TABLE stories ALTER COLUMN category DROP NOT NULL;

-- Add new constraint that allows NULL or the valid values
ALTER TABLE stories ADD CONSTRAINT stories_category_check
  CHECK (category IS NULL OR category IN (
    'external_producer',
    'writer_pitch',
    'inhouse_content'
  ));

-- Update comment
COMMENT ON COLUMN stories.category IS 'Source of idea: external_producer, writer_pitch, or inhouse_content (optional)';
