-- ============================================================================
-- FIX EVALUATOR TEAM CREATION - PROPER RLS BYPASS
-- ============================================================================

-- Grant necessary permissions to postgres role
GRANT ALL ON teams TO postgres;
GRANT ALL ON users TO postgres;

-- Create the function with explicit RLS bypass and error handling
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

-- Ensure proper ownership
ALTER FUNCTION auto_create_team_for_evaluator() OWNER TO postgres;

-- Create trigger
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
-- BACKFILL EXISTING EVALUATORS
-- ============================================================================

-- Backfill teams for existing evaluators without teams
DO $$
DECLARE
  user_record RECORD;
  new_team_id UUID;
  team_name TEXT;
  team_type_val TEXT;
  total_created INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting backfill for evaluators without teams ===';

  FOR user_record IN
    SELECT id, name, email, role, department
    FROM users
    WHERE role = 'evaluator' AND team_id IS NULL
  LOOP
    -- Use email for unique team name
    team_name := user_record.email || ' Team';

    -- Determine team type
    team_type_val := 'evaluator';
    IF user_record.department LIKE 'production%' THEN
      team_type_val := 'production';
    ELSIF user_record.department LIKE 'channel%' THEN
      team_type_val := 'channel';
    ELSIF user_record.department LIKE 'adaptation%' THEN
      team_type_val := 'adaptation';
    END IF;

    -- Create team
    INSERT INTO teams (name, description, team_type, team_head_id)
    VALUES (
      team_name,
      'Team led by ' || user_record.name,
      team_type_val,
      user_record.id
    )
    RETURNING id INTO new_team_id;

    -- Update user
    UPDATE users SET team_id = new_team_id WHERE id = user_record.id;

    RAISE NOTICE '[BACKFILL] Created team % for evaluator %', new_team_id, user_record.email;
    total_created := total_created + 1;
  END LOOP;

  RAISE NOTICE '=== Backfill complete: % teams created ===', total_created;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all evaluators now have teams
DO $$
DECLARE
  evaluators_without_teams INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO evaluators_without_teams
  FROM users
  WHERE role = 'evaluator' AND team_id IS NULL;

  IF evaluators_without_teams > 0 THEN
    RAISE WARNING '⚠️  WARNING: % evaluators still without teams!', evaluators_without_teams;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All evaluators now have teams assigned';
  END IF;
END;
$$;
