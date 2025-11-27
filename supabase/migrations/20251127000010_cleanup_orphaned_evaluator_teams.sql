-- Migration: Cleanup Orphaned Evaluator Teams
-- Date: 2025-11-27
-- Description: Add triggers to automatically delete evaluator teams when:
--              1. Team head is deleted (team_head_id becomes NULL)
--              2. User role changes from evaluator to non-evaluator
--              Also cleans up existing orphaned evaluator teams

-- =============================================================================
-- PART 1: Cleanup when team head is deleted
-- =============================================================================

-- Function to cleanup orphaned evaluator teams
CREATE OR REPLACE FUNCTION cleanup_orphaned_evaluator_teams()
RETURNS TRIGGER AS $$
BEGIN
  -- When team_head_id becomes NULL for an evaluator team, delete the team
  IF OLD.team_head_id IS NOT NULL AND NEW.team_head_id IS NULL THEN
    IF NEW.team_type = 'evaluator' THEN
      -- Delete the orphaned evaluator team
      DELETE FROM teams WHERE id = NEW.id;
      -- Return NULL to prevent the UPDATE since row is deleted
      RETURN NULL;
    END IF;
  END IF;
  -- For all other cases, allow the update to proceed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION cleanup_orphaned_evaluator_teams() IS
  'Automatically deletes evaluator teams when their team_head_id becomes NULL (team head deleted). Only affects evaluator teams - other team types are preserved for organizational continuity.';

-- Create trigger on teams table
CREATE TRIGGER trigger_cleanup_orphaned_evaluator_teams
  BEFORE UPDATE OF team_head_id ON teams
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_orphaned_evaluator_teams();

-- Add comment explaining the trigger
COMMENT ON TRIGGER trigger_cleanup_orphaned_evaluator_teams ON teams IS
  'Triggers cleanup of evaluator teams when their head is deleted. Evaluator teams are auto-created per user, so auto-deletion maintains data consistency.';

-- =============================================================================
-- PART 2: Cleanup when user role changes from evaluator to non-evaluator
-- =============================================================================

-- Function to cleanup evaluator teams when user role changes
CREATE OR REPLACE FUNCTION cleanup_team_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When role changes FROM evaluator TO non-evaluator
  IF OLD.role = 'evaluator' AND NEW.role != 'evaluator' THEN
    -- Delete any evaluator team where this user is the head
    DELETE FROM teams
    WHERE team_head_id = NEW.id
      AND team_type = 'evaluator';

    -- Also clear the user's team_id reference
    NEW.team_id = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION cleanup_team_on_role_change() IS
  'Automatically deletes evaluator teams when user role changes from evaluator to another role. Evaluator teams are role-specific, so they should be removed when the user is no longer an evaluator.';

-- Create trigger on users table when role changes
CREATE TRIGGER trigger_cleanup_team_on_role_change
  BEFORE UPDATE OF role ON users
  FOR EACH ROW
  WHEN (OLD.role = 'evaluator' AND NEW.role IS DISTINCT FROM 'evaluator')
  EXECUTE FUNCTION cleanup_team_on_role_change();

-- Add comment explaining the trigger
COMMENT ON TRIGGER trigger_cleanup_team_on_role_change ON users IS
  'Triggers cleanup of evaluator teams when user role changes from evaluator to non-evaluator. Ensures team data stays consistent with user roles.';

-- =============================================================================
-- PART 3: One-time cleanup of existing orphaned/mismatched teams
-- =============================================================================

-- Clean up existing orphaned evaluator teams (team_head_id is NULL)
DELETE FROM teams
WHERE team_head_id IS NULL
  AND team_type = 'evaluator';

-- Clean up existing teams for users who are no longer evaluators
DELETE FROM teams t
WHERE t.team_type = 'evaluator'
  AND t.team_head_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = t.team_head_id
      AND u.role != 'evaluator'
  );

-- Log the cleanup
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % orphaned or mismatched evaluator team(s)', deleted_count;
END $$;
