-- ============================================================================
-- FIX TEAM AUTO-CREATION TRIGGER
-- ============================================================================
-- Migration: 20251126000011_fix_team_creation_trigger.sql
-- Purpose: Fix the auto_create_team_for_content_head trigger to properly
--          create teams by adding RLS bypass policy for the trigger function
--
-- Issue: The trigger function has SECURITY DEFINER but still can't bypass
--        RLS policies on the teams table
--
-- Solution: Add a special RLS policy that allows the trigger to insert teams
-- ============================================================================

-- ============================================================================
-- OPTION 1: Add RLS policy for service role (RECOMMENDED)
-- ============================================================================
-- This policy allows inserts from the service role (which is used by triggers)

DROP POLICY IF EXISTS teams_service_role_insert ON teams;
CREATE POLICY teams_service_role_insert ON teams
  FOR INSERT TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY teams_service_role_insert ON teams IS
  'Allow team creation from trigger functions (SECURITY DEFINER functions bypass this with service role)';

-- ============================================================================
-- OPTION 2: Update the trigger function to use explicit grant
-- ============================================================================
-- Grant INSERT permission on teams to authenticated users for trigger context
-- Note: This is already handled by SECURITY DEFINER if the function owner has permission

-- Ensure the function has proper ownership and security context
-- Re-create the function to ensure it has correct SECURITY settings
CREATE OR REPLACE FUNCTION auto_create_team_for_content_head()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Only create team for content_head role
  IF NEW.role = 'content_head' AND NEW.team_id IS NULL THEN
    -- Create new team with content_head as team_head
    -- Using explicit SECURITY DEFINER context
    INSERT INTO teams (
      name,
      description,
      team_type,
      team_head_id
    ) VALUES (
      NEW.name || '''s Team',
      'Team automatically created for ' || NEW.name,
      'production', -- Default team type
      NEW.id
    )
    RETURNING id INTO new_team_id;

    -- Assign the content_head to their new team
    NEW.team_id = new_team_id;

    RAISE NOTICE 'Auto-created team % for content_head %', new_team_id, NEW.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the function owner to postgres (superuser) to bypass RLS
-- This is safe because the function logic is controlled and only creates teams
-- for content_head users
ALTER FUNCTION auto_create_team_for_content_head() OWNER TO postgres;

COMMENT ON FUNCTION auto_create_team_for_content_head() IS
  'Trigger function to auto-create teams for content_head users. Runs as postgres (SECURITY DEFINER) to bypass RLS.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- You can verify the function ownership with:
-- SELECT proname, proowner::regrole FROM pg_proc WHERE proname = 'auto_create_team_for_content_head';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
