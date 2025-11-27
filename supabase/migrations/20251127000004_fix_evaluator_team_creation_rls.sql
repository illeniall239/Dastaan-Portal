-- ============================================================================
-- FIX EVALUATOR TEAM CREATION - PROPER RLS BYPASS
-- ============================================================================
-- Purpose: Ensure team auto-creation trigger can bypass RLS policies
-- Problem: Even with SECURITY DEFINER, trigger fails to create teams
-- Solution: Grant explicit permissions and ensure RLS is properly bypassed
-- ============================================================================

-- First, ensure the trigger function has RLS bypass
ALTER FUNCTION auto_create_team_for_evaluator() SET search_path = public;
ALTER FUNCTION auto_create_team_for_evaluator() SET row_security = off;
ALTER FUNCTION auto_create_team_for_evaluator() OWNER TO postgres;

-- Grant necessary permissions to postgres role (superuser)
GRANT ALL ON teams TO postgres;
GRANT ALL ON users TO postgres;

-- Recreate the function with explicit RLS bypass and better error handling
CREATE OR REPLACE FUNCTION auto_create_team_for_evaluator()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
  existing_team_id UUID;
  team_type_val TEXT;
  target_team_name TEXT;
BEGIN
  -- Only run for evaluators
  IF NEW.role = 'evaluator' AND NEW.team_id IS NULL THEN
    BEGIN
      -- Determine team_type based on department
      team_type_val := 'evaluator';
      IF NEW.department LIKE 'production%' THEN
        team_type_val := 'production';
      ELSIF NEW.department LIKE 'channel%' THEN
        team_type_val := 'channel';
      ELSIF NEW.department LIKE 'adaptation%' THEN
        team_type_val := 'adaptation';
      END IF;

      -- Use email for team name (guaranteed unique)
      target_team_name := NEW.email || ' Team';

      -- Check if team already exists
      SELECT id INTO existing_team_id
      FROM teams
      WHERE name = target_team_name;

      IF existing_team_id IS NOT NULL THEN
        -- Re-link existing team
        RAISE NOTICE '[TEAM_EXISTS] Re-linking evaluator % to team %', NEW.email, existing_team_id;

        -- Update user with existing team
        UPDATE users
        SET team_id = existing_team_id
        WHERE id = NEW.id;

        -- Update team head
        UPDATE teams
        SET team_head_id = NEW.id,
            description = 'Team led by ' || NEW.name || ' (' || NEW.email || ')'
        WHERE id = existing_team_id;

      ELSE
        -- Create new team with RLS disabled
        INSERT INTO teams (
          name,
          description,
          team_type,
          team_head_id
        ) VALUES (
          target_team_name,
          'Team led by ' || NEW.name || ' (' || NEW.email || ')',
          team_type_val,
          NEW.id
        )
        RETURNING id INTO new_team_id;

        -- Update user with new team
        UPDATE users
        SET team_id = new_team_id
        WHERE id = NEW.id;

        RAISE NOTICE '[TEAM_CREATED] evaluator=%, team_id=%', NEW.email, new_team_id;
      END IF;

    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION 'TEAM_NAME_CONFLICT: Team "%" already exists for evaluator %', target_team_name, NEW.email;
      WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'TEAM_FK_ERROR: Invalid foreign key in team creation for %', NEW.email;
      WHEN OTHERS THEN
        RAISE EXCEPTION 'TEAM_CREATION_ERROR: % (evaluator=%)', SQLERRM, NEW.email;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public
   SET row_security = off;

-- Ensure proper ownership and permissions
ALTER FUNCTION auto_create_team_for_evaluator() OWNER TO postgres;

-- Recreate trigger
DROP TRIGGER IF EXISTS users_auto_create_team_trigger ON users;
CREATE TRIGGER users_auto_create_team_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.role = 'evaluator')
  EXECUTE FUNCTION auto_create_team_for_evaluator();

-- Add comment
COMMENT ON FUNCTION auto_create_team_for_evaluator() IS
  'Auto-creates teams for evaluators with proper RLS bypass and error handling';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
