-- ============================================================================
-- CREATE GENRES TABLE
-- ============================================================================
-- Purpose: Create a persistent genres table to store both predefined and
--          custom user-created genres, similar to the writers table pattern
-- Problem: Genres were previously hardcoded in PREDEFINED_GENRES constant,
--          causing custom genres to disappear after form closes
-- Solution: Database table + API endpoint for persistent genre storage
-- ============================================================================

-- Create genres table (similar to writers table)
CREATE TABLE IF NOT EXISTS genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_predefined BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX idx_genres_name ON genres(name);
CREATE INDEX idx_genres_status ON genres(status);
CREATE INDEX idx_genres_is_predefined ON genres(is_predefined);

-- Enable RLS
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all authenticated users to read/create genres)
CREATE POLICY "Anyone can view active genres"
  ON genres FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Authenticated users can create genres"
  ON genres FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update genres"
  ON genres FOR UPDATE
  TO authenticated
  USING (true);

-- Insert predefined genres from PREDEFINED_GENRES constant
INSERT INTO genres (name, is_predefined) VALUES
  ('Drama', true),
  ('Comedy', true),
  ('Action', true),
  ('Romance', true),
  ('Thriller', true),
  ('Horror', true),
  ('Mystery', true),
  ('Fantasy', true),
  ('Sci-Fi', true),
  ('Adventure', true),
  ('Crime', true),
  ('Family', true),
  ('Musical', true),
  ('Historical', true),
  ('War', true),
  ('Western', true),
  ('Animation', true),
  ('Documentary', true),
  ('Biography', true),
  ('Sports', true),
  ('Superhero', true),
  ('Martial Arts', true),
  ('Political', true),
  ('Legal', true),
  ('Medical', true),
  ('Psychological', true),
  ('Supernatural', true),
  ('Period Piece', true),
  ('Slice of Life', true),
  ('Coming of Age', true),
  ('Social', true),
  ('Satire', true),
  ('Dark Comedy', true),
  ('Romantic Comedy', true),
  ('Action Comedy', true),
  ('Thriller Drama', true),
  ('Crime Drama', true),
  ('Family Drama', true),
  ('Teen Drama', true),
  ('Melodrama', true),
  ('Soap Opera', true),
  ('Sitcom', true),
  ('Sketch Comedy', true),
  ('Black Comedy', true),
  ('Slapstick', true),
  ('Parody', true),
  ('Mockumentary', true),
  ('Anthology', true),
  ('Miniseries', true),
  ('Limited Series', true),
  ('Web Series', true),
  ('Reality', true),
  ('Talk Show', true),
  ('Game Show', true),
  ('Variety Show', true),
  ('News', true),
  ('Educational', true),
  ('Cooking', true),
  ('Travel', true),
  ('Nature', true),
  ('Science', true)
ON CONFLICT (name) DO NOTHING;

-- Add table comment
COMMENT ON TABLE genres IS 'Genre registry for call reports - stores both predefined and custom user-created genres';
COMMENT ON COLUMN genres.is_predefined IS 'True for pre-populated genres, false for user-created custom genres';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  genre_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO genre_count FROM genres;
  RAISE NOTICE '✅ SUCCESS: Genres table created with % genres', genre_count;
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
