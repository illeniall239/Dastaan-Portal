-- Update the auto-create team function to exclude GCM users (they use shared team)

-- Update the function to only handle evaluators (not GCM users)
CREATE OR REPLACE FUNCTION auto_create_team_for_evaluator()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
  existing_team_id UUID;
  team_type_val TEXT;
  target_team_name TEXT;
BEGIN
  -- Only handle evaluators, NOT GCM users
  IF (NEW.role = 'evaluator') AND NEW.team_id IS NULL THEN
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

-- Update the trigger to only fire for evaluators (not GCM users)
DROP TRIGGER IF EXISTS users_auto_create_team_trigger ON users;
CREATE TRIGGER users_auto_create_team_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.role = 'evaluator')
  EXECUTE FUNCTION auto_create_team_for_evaluator();

-- Backfill teams for existing GCM users to the shared GCM team
DO $$
DECLARE
  user_record RECORD;
  shared_gcm_team_id UUID;
  total_assigned INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting assignment of GCM users to shared GCM team ===';

  -- Get the shared GCM team ID
  SELECT id INTO shared_gcm_team_id
  FROM teams
  WHERE name = 'GCM Team';

  IF shared_gcm_team_id IS NULL THEN
    RAISE EXCEPTION 'Shared GCM team does not exist. Run the shared GCM team migration first.';
  END IF;

  FOR user_record IN
    SELECT id, name, email, role
    FROM users
    WHERE role = 'gcm' AND team_id IS NULL
  LOOP
    -- Assign user to the shared GCM team
    UPDATE users
    SET team_id = shared_gcm_team_id
    WHERE id = user_record.id;

    RAISE NOTICE '[ASSIGNED] GCM user % to shared GCM team', user_record.email;
    total_assigned := total_assigned + 1;
  END LOOP;

  RAISE NOTICE '=== Assignment complete: % GCM users assigned to shared team ===', total_assigned;
END;
$$;

-- Verify all GCM users now have teams
DO $$
DECLARE
  gcms_without_teams INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO gcms_without_teams
  FROM users
  WHERE role = 'gcm' AND team_id IS NULL;

  IF gcms_without_teams > 0 THEN
    RAISE WARNING '⚠️  WARNING: % GCM users still without teams!', gcms_without_teams;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All GCM users now have teams assigned';
  END IF;
END;
$$;