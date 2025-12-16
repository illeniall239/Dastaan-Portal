-- Migration: Multi-Content External Evaluation Links
-- Description: Create junction table to support bundling multiple content items in one external evaluation link
-- Created: 2025-12-16

-- ============================================================================
-- 1. Create external_link_contents junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS external_link_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES external_evaluation_links(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('call_report', 'episode')),
  content_id UUID NOT NULL,
  display_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure no duplicate content in same link
  UNIQUE(link_id, content_type, content_id)
);

-- Add comments for documentation
COMMENT ON TABLE external_link_contents IS 'Junction table linking external evaluation links to multiple content items (call reports and episodes)';
COMMENT ON COLUMN external_link_contents.link_id IS 'Reference to external_evaluation_links table';
COMMENT ON COLUMN external_link_contents.content_type IS 'Type of content: call_report or episode';
COMMENT ON COLUMN external_link_contents.content_id IS 'UUID of the content item (references call_reports.id or episodes.id)';
COMMENT ON COLUMN external_link_contents.display_order IS 'Order in which content should be displayed/evaluated (0 = first)';
COMMENT ON COLUMN external_link_contents.is_required IS 'Whether evaluation of this content is mandatory';

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

CREATE INDEX idx_external_link_contents_link
  ON external_link_contents(link_id);

CREATE INDEX idx_external_link_contents_content
  ON external_link_contents(content_type, content_id);

CREATE INDEX idx_external_link_contents_order
  ON external_link_contents(link_id, display_order);

-- ============================================================================
-- 3. Migrate existing single-content links to new structure
-- ============================================================================

-- Insert existing links into junction table
-- This preserves backwards compatibility with existing external evaluation links
INSERT INTO external_link_contents (link_id, content_type, content_id, display_order)
SELECT
  id,
  content_type,
  content_id,
  0 as display_order
FROM external_evaluation_links
WHERE content_type IS NOT NULL
  AND content_id IS NOT NULL
  AND NOT EXISTS (
    -- Avoid duplicates if migration runs multiple times
    SELECT 1 FROM external_link_contents
    WHERE external_link_contents.link_id = external_evaluation_links.id
  );

-- ============================================================================
-- 4. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE external_link_contents ENABLE ROW LEVEL SECURITY;

-- Policy: Management users can view all link contents
CREATE POLICY "Management users can view all link contents"
  ON external_link_contents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'content_manager')
    )
  );

-- Policy: Management users can insert link contents
CREATE POLICY "Management users can insert link contents"
  ON external_link_contents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'content_manager')
    )
  );

-- Policy: Management users can update link contents
CREATE POLICY "Management users can update link contents"
  ON external_link_contents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'content_manager')
    )
  );

-- Policy: Management users can delete link contents
CREATE POLICY "Management users can delete link contents"
  ON external_link_contents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'content_manager')
    )
  );

-- ============================================================================
-- 5. Helper function to get all contents for a link
-- ============================================================================

CREATE OR REPLACE FUNCTION get_external_link_contents(p_link_id UUID)
RETURNS TABLE (
  content_type TEXT,
  content_id UUID,
  display_order INT,
  is_required BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    elc.content_type,
    elc.content_id,
    elc.display_order,
    elc.is_required
  FROM external_link_contents elc
  WHERE elc.link_id = p_link_id
  ORDER BY elc.display_order ASC;
END;
$$;

COMMENT ON FUNCTION get_external_link_contents(UUID) IS 'Helper function to retrieve all content items for an external evaluation link, ordered by display_order';

-- ============================================================================
-- NOTES FOR FUTURE CLEANUP (After confirming migration success)
-- ============================================================================

-- The following columns in external_evaluation_links are now redundant:
-- - content_type (now in external_link_contents)
-- - content_id (now in external_link_contents)
--
-- These are kept for backwards compatibility during transition.
-- After confirming all code uses the new junction table:
-- 1. Update application code to use external_link_contents
-- 2. Test thoroughly
-- 3. Create new migration to drop these columns:
--    ALTER TABLE external_evaluation_links DROP COLUMN content_type;
--    ALTER TABLE external_evaluation_links DROP COLUMN content_id;
