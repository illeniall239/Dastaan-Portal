-- Allow NULL genre values for stories and call reports
-- Previously genre defaulted to 'other', but we now want to preserve NULL when unspecified

BEGIN;

-- Allow stories.genre to be NULL
ALTER TABLE stories
ALTER COLUMN genre DROP NOT NULL;

-- Allow call_reports.genre (TEXT[] column) to be NULL
ALTER TABLE call_reports
ALTER COLUMN genre DROP NOT NULL;

-- Remove default array value so NULL is preserved when no genre is selected
ALTER TABLE call_reports
ALTER COLUMN genre DROP DEFAULT;

-- Update genre constraint to allow NULL but still prevent empty arrays
ALTER TABLE call_reports
DROP CONSTRAINT IF EXISTS genre_not_empty;

ALTER TABLE call_reports
ADD CONSTRAINT genre_not_empty CHECK (
  genre IS NULL OR array_length(genre, 1) > 0
);

COMMIT;

