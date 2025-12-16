-- Migration: Fix external_link_contents RLS policies
-- Description: Update RLS policies to allow management, executive, and evaluator roles
-- Created: 2025-12-16

-- Drop existing policies
DROP POLICY IF EXISTS "Management users can view all link contents" ON external_link_contents;
DROP POLICY IF EXISTS "Management users can insert link contents" ON external_link_contents;
DROP POLICY IF EXISTS "Management users can update link contents" ON external_link_contents;
DROP POLICY IF EXISTS "Management users can delete link contents" ON external_link_contents;

-- Recreate policies with correct roles (matching other tables in the system)
-- Policy: Management and evaluators can view all link contents
CREATE POLICY "Management and evaluators can view all link contents"
  ON external_link_contents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'management', 'executive', 'evaluator')
    )
  );

-- Policy: Management and evaluators can insert link contents
CREATE POLICY "Management and evaluators can insert link contents"
  ON external_link_contents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'management', 'executive', 'evaluator')
    )
  );

-- Policy: Management and evaluators can update link contents
CREATE POLICY "Management and evaluators can update link contents"
  ON external_link_contents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'management', 'executive', 'evaluator')
    )
  );

-- Policy: Management and evaluators can delete link contents
CREATE POLICY "Management and evaluators can delete link contents"
  ON external_link_contents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'management', 'executive', 'evaluator')
    )
  );
