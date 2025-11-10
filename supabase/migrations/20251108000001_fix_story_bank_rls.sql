-- Fix RLS policies for Story Bank access
-- This migration fixes data access issues for management and executive roles

-- Drop old conflicting one_liners policies
DROP POLICY IF EXISTS "Executives and managers can view one liners" ON one_liners;
DROP POLICY IF EXISTS "Management can view all one liners" ON one_liners;

-- Create unified one_liners SELECT policy with all necessary roles
CREATE POLICY "Authorized users can view one liners"
  ON one_liners FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('executive', 'content_manager', 'management', 'admin')
  );

-- Ensure stories table includes management role for joins
-- This is critical for !inner joins in Story Bank queries
DROP POLICY IF EXISTS "Authenticated users can view stories" ON stories;

CREATE POLICY "Authenticated users can view stories"
  ON stories FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'executive', 'management', 'admin')
  );

-- Verify episodes table policy includes management role
-- Check if we need to update it
DO $$
BEGIN
  -- Drop old episodes policy if it doesn't include management
  DROP POLICY IF EXISTS "Authenticated users can view episodes" ON episodes;

  -- Recreate with all necessary roles
  CREATE POLICY "Authenticated users can view episodes"
    ON episodes FOR SELECT
    TO authenticated
    USING (
      get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'executive', 'management', 'admin')
    );
END $$;
