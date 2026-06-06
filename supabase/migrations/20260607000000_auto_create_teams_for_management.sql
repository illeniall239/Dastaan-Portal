-- Auto-create teams for management users
-- Mirrors the existing evaluator auto-team trigger so management users
-- appear in the user creation team dropdown as "[Name]'s Team"

-- 1. Extend team_type constraint to include 'management'
ALTER TABLE teams
  DROP CONSTRAINT IF EXISTS teams_team_type_check;
ALTER TABLE teams
  ADD CONSTRAINT teams_team_type_check
  CHECK (team_type IN ('production', 'channel', 'adaptation', 'evaluator', 'management', 'gcm', 'programmer', 'other'));

-- 2. Trigger function
CREATE OR REPLACE FUNCTION auto_create_team_for_management()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  IF NEW.role = 'management' AND NEW.team_id IS NULL THEN
    INSERT INTO teams (name, description, team_type, team_head_id)
    VALUES (
      NEW.name || '''s Team',
      'Team automatically created for ' || NEW.name,
      'management',
      NEW.id
    )
    RETURNING id INTO new_team_id;

    UPDATE users SET team_id = new_team_id WHERE id = NEW.id;

    RAISE NOTICE 'Auto-created team % for management user %', new_team_id, NEW.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION auto_create_team_for_management() OWNER TO postgres;
ALTER FUNCTION auto_create_team_for_management() SET row_security = off;

-- 3. Trigger (AFTER INSERT, same pattern as evaluator trigger)
DROP TRIGGER IF EXISTS management_auto_create_team_trigger ON users;
CREATE TRIGGER management_auto_create_team_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.role = 'management')
  EXECUTE FUNCTION auto_create_team_for_management();

-- 4. Backfill: create teams for existing management users without one
DO $$
DECLARE
  mgmt_user RECORD;
  new_team_id UUID;
BEGIN
  FOR mgmt_user IN
    SELECT id, name FROM users
    WHERE role = 'management' AND team_id IS NULL
    ORDER BY created_at
  LOOP
    INSERT INTO teams (name, description, team_type, team_head_id)
    VALUES (
      mgmt_user.name || '''s Team',
      'Team automatically created for ' || mgmt_user.name,
      'management',
      mgmt_user.id
    )
    RETURNING id INTO new_team_id;

    UPDATE users SET team_id = new_team_id WHERE id = mgmt_user.id;

    RAISE NOTICE 'Backfilled team % for existing management user %', new_team_id, mgmt_user.name;
  END LOOP;
END;
$$;
