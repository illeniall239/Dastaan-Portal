-- =====================================================
-- Character Relationships for Detailed One-Liners
-- =====================================================
-- Created: 2025-11-12
-- Purpose: Store character relationship mappings for story analysis
-- Enables visual graph representation of character dynamics
-- =====================================================

BEGIN;

-- =====================================================
-- Create character_relationships table
-- =====================================================

CREATE TABLE IF NOT EXISTS character_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailed_one_liner_id UUID NOT NULL REFERENCES detailed_one_liners(id) ON DELETE CASCADE,

  -- Character Information
  character_a_name TEXT NOT NULL,
  character_a_role TEXT NOT NULL CHECK (character_a_role IN (
    'protagonist',
    'antagonist',
    'supporting',
    'minor'
  )),

  character_b_name TEXT NOT NULL,
  character_b_role TEXT NOT NULL CHECK (character_b_role IN (
    'protagonist',
    'antagonist',
    'supporting',
    'minor'
  )),

  -- Relationship Details
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'family',
    'romantic',
    'professional',
    'friendship',
    'rivalry',
    'mentor_mentee',
    'alliance',
    'conflict',
    'other'
  )),
  relationship_description TEXT NOT NULL,

  -- Relationship Evolution (Optional)
  initial_state TEXT,
  final_state TEXT,
  key_turning_points TEXT,

  -- Story Impact
  emotional_weight TEXT CHECK (emotional_weight IN ('high', 'medium', 'low')),
  drives_plot BOOLEAN DEFAULT false,

  -- Metadata
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure we don't create self-referential relationships
  CONSTRAINT different_characters CHECK (character_a_name != character_b_name)
);

-- =====================================================
-- Create indexes for performance
-- =====================================================

CREATE INDEX idx_character_relationships_detailed_one_liner
  ON character_relationships(detailed_one_liner_id);

CREATE INDEX idx_character_relationships_characters
  ON character_relationships(character_a_name, character_b_name);

CREATE INDEX idx_character_relationships_type
  ON character_relationships(relationship_type);

-- =====================================================
-- Add comments for documentation
-- =====================================================

COMMENT ON TABLE character_relationships IS
  'Character relationship mapping for detailed one-liner analyses. Enables visual graph representation of character dynamics.';

COMMENT ON COLUMN character_relationships.character_a_name IS
  'First character in the relationship';

COMMENT ON COLUMN character_relationships.character_a_role IS
  'Role of first character: protagonist, antagonist, supporting, or minor';

COMMENT ON COLUMN character_relationships.character_b_name IS
  'Second character in the relationship';

COMMENT ON COLUMN character_relationships.character_b_role IS
  'Role of second character: protagonist, antagonist, supporting, or minor';

COMMENT ON COLUMN character_relationships.relationship_type IS
  'Type of relationship: family, romantic, professional, friendship, rivalry, mentor_mentee, alliance, conflict, or other';

COMMENT ON COLUMN character_relationships.relationship_description IS
  'Brief description of the relationship dynamics';

COMMENT ON COLUMN character_relationships.initial_state IS
  'How the relationship begins at the start of the story (optional)';

COMMENT ON COLUMN character_relationships.final_state IS
  'How the relationship evolves by the end of the story (optional)';

COMMENT ON COLUMN character_relationships.key_turning_points IS
  'Critical moments that transform this relationship (optional)';

COMMENT ON COLUMN character_relationships.emotional_weight IS
  'Emotional impact level: high, medium, or low';

COMMENT ON COLUMN character_relationships.drives_plot IS
  'Whether this relationship is a key driver of plot progression';

COMMENT ON COLUMN character_relationships.sort_order IS
  'Display order for relationships in the UI';

-- =====================================================
-- Enable Row Level Security
-- =====================================================

ALTER TABLE character_relationships ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policy: SELECT
-- =====================================================
-- Allow authenticated users with appropriate roles to view relationships

CREATE POLICY character_relationships_select ON character_relationships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = character_relationships.detailed_one_liner_id
      AND (
        get_user_role() = 'evaluator'
        OR get_user_role() = 'content_manager'
        OR get_user_role() = 'management'
        OR is_admin()
      )
    )
  );

-- =====================================================
-- RLS Policy: INSERT
-- =====================================================
-- Allow users to create relationships for their own detailed one-liners

CREATE POLICY character_relationships_insert ON character_relationships
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = character_relationships.detailed_one_liner_id
      AND dol.created_by = auth.uid()
    )
    OR is_admin()
  );

-- =====================================================
-- RLS Policy: UPDATE
-- =====================================================
-- Allow users to update relationships they created

CREATE POLICY character_relationships_update ON character_relationships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = character_relationships.detailed_one_liner_id
      AND (dol.created_by = auth.uid() OR is_admin())
    )
  );

-- =====================================================
-- RLS Policy: DELETE
-- =====================================================
-- Allow users to delete relationships they created

CREATE POLICY character_relationships_delete ON character_relationships
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = character_relationships.detailed_one_liner_id
      AND (dol.created_by = auth.uid() OR is_admin())
    )
  );

-- =====================================================
-- Create updated_at trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_character_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER character_relationships_updated_at
  BEFORE UPDATE ON character_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_character_relationships_updated_at();

COMMIT;

-- =====================================================
-- Verification Queries (for testing)
-- =====================================================
-- Run these to verify the migration succeeded:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'character_relationships';
-- SELECT * FROM character_relationships LIMIT 1;
-- \d character_relationships
