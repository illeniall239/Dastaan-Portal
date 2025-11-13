-- Migration: Convert genre from TEXT to TEXT[] to support multiple genres
-- Created: 2025-11-13
-- Purpose: Enable multi-select genre functionality for call reports

-- Step 1: Add new temporary column for genre array
ALTER TABLE call_reports
ADD COLUMN genres_temp TEXT[];

-- Step 2: Migrate existing data - convert single genre to array
-- Handle NULL values and convert single text value to array
UPDATE call_reports
SET genres_temp = CASE
  WHEN genre IS NOT NULL AND genre != '' THEN ARRAY[genre]
  ELSE ARRAY['other']::TEXT[]
END;

-- Step 3: Drop old genre column
ALTER TABLE call_reports
DROP COLUMN genre;

-- Step 4: Rename new column to genre
ALTER TABLE call_reports
RENAME COLUMN genres_temp TO genre;

-- Step 5: Add NOT NULL constraint
ALTER TABLE call_reports
ALTER COLUMN genre SET NOT NULL;

-- Step 6: Add constraint to ensure at least one genre is present
ALTER TABLE call_reports
ADD CONSTRAINT genre_not_empty CHECK (array_length(genre, 1) > 0);

-- Step 7: Add default value for new records
ALTER TABLE call_reports
ALTER COLUMN genre SET DEFAULT ARRAY['other']::TEXT[];

-- Add helpful comment
COMMENT ON COLUMN call_reports.genre IS 'Array of genre tags for the story - supports multiple genres. Examples: Drama, Comedy, Thriller, etc.';
