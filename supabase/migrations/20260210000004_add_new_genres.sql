-- Add new genres to the genres table
INSERT INTO genres (name, is_predefined) VALUES
  ('Spiritual Drama', true),
  ('Women Centric Drama', true),
  ('Class Conflict Drama', true),
  ('Feudal', true),
  ('Rural Drama', true),
  ('Siblings Rivalry', true),
  ('Inheritance Drama', true),
  ('Tragedy', true),
  ('Religious', true) -- Ensure this one is added if not already present (it was in the list but might be missing)
ON CONFLICT (name) DO NOTHING;
