-- Migration: Rename team_type values to match real organizational structure
-- Old values: production, channel, adaptation, evaluator, other
-- New values: content, evaluator, programmer, gcm, management, other
--
-- Run this via Supabase Dashboard → SQL Editor

-- ────────────────────────────────────────────────────────────────────────────
-- Step 1: Drop ALL existing team_type constraints (may exist from prior migrations)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_team_type_check;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_team_type_check1;

-- ────────────────────────────────────────────────────────────────────────────
-- Step 2: Migrate existing rows BEFORE enforcing the new constraint
-- ────────────────────────────────────────────────────────────────────────────

-- GCM shared team: 'production' → 'gcm'
UPDATE teams SET team_type = 'gcm', updated_at = now()
  WHERE name = 'GCM Team' AND team_type = 'production';

-- Content head auto-teams: remaining 'production' rows → 'content'
UPDATE teams SET team_type = 'content', updated_at = now()
  WHERE team_type = 'production';

-- Dead values: channel/adaptation → 'other'
UPDATE teams SET team_type = 'other', updated_at = now()
  WHERE team_type IN ('channel', 'adaptation');

-- Programming Team: ensure type is 'programmer'
UPDATE teams SET team_type = 'programmer', updated_at = now()
  WHERE name = 'Programming Team' AND team_type != 'programmer';

-- Insert Programming Team if it doesn't already exist
INSERT INTO teams (id, name, team_type, created_at, updated_at)
SELECT gen_random_uuid(), 'Programming Team', 'programmer', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Programming Team');

-- Insert Management Team if it doesn't already exist
INSERT INTO teams (id, name, team_type, created_at, updated_at)
SELECT gen_random_uuid(), 'Management', 'management', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE team_type = 'management');

-- ────────────────────────────────────────────────────────────────────────────
-- Step 3: Add new constraint with the real org team types
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE teams ADD CONSTRAINT teams_team_type_check
  CHECK (team_type IN ('content', 'evaluator', 'programmer', 'gcm', 'management', 'other'));

-- ────────────────────────────────────────────────────────────────────────────
-- Step 4: Update content_head auto-team trigger ('production' → 'content')
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_create_team_for_content_head()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  IF NEW.role = 'content_head' AND NEW.team_id IS NULL THEN
    INSERT INTO teams (
      name,
      description,
      team_type,
      team_head_id
    ) VALUES (
      NEW.name || '''s Team',
      'Team automatically created for ' || NEW.name,
      'content',
      NEW.id
    )
    RETURNING id INTO new_team_id;

    NEW.team_id = new_team_id;

    RAISE NOTICE 'Auto-created team % for content_head %', new_team_id, NEW.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────────────
-- Step 5: Update evaluator auto-team trigger (remove dead department branches)
-- All evaluators always get team_type = 'evaluator' — the production/channel/
-- adaptation branches were dead code (no user has those department values).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_create_team_for_evaluator()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
  existing_team_id UUID;
  target_team_name TEXT;
BEGIN
  IF (NEW.role = 'evaluator') AND NEW.team_id IS NULL THEN
    BEGIN
      target_team_name := NEW.email || ' Team';

      SELECT id INTO existing_team_id
      FROM teams
      WHERE name = target_team_name;

      IF existing_team_id IS NOT NULL THEN
        RAISE NOTICE '[TEAM_EXISTS] Re-linking evaluator % to team %', NEW.email, existing_team_id;

        UPDATE users SET team_id = existing_team_id WHERE id = NEW.id;

        UPDATE teams
        SET team_head_id = NEW.id,
            description = 'Team led by ' || NEW.name || ' (' || NEW.email || ')'
        WHERE id = existing_team_id;

      ELSE
        INSERT INTO teams (name, description, team_type, team_head_id)
        VALUES (
          target_team_name,
          'Team led by ' || NEW.name || ' (' || NEW.email || ')',
          'evaluator',
          NEW.id
        )
        RETURNING id INTO new_team_id;

        UPDATE users SET team_id = new_team_id WHERE id = NEW.id;

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

ALTER FUNCTION auto_create_team_for_evaluator() OWNER TO postgres;

-- ────────────────────────────────────────────────────────────────────────────
-- Step 6: Auto-assign programmer users to the shared Programming Team
-- (Same pattern as GCM shared team assignment)
-- ────────────────────────────────────────────────────────────────────────────

-- Trigger function: fires AFTER INSERT on users when role = 'programmer'
-- Assigns the user to the shared Programming Team (if not already assigned)
CREATE OR REPLACE FUNCTION auto_assign_programmer_to_team()
RETURNS TRIGGER AS $$
DECLARE
  programming_team_id UUID;
BEGIN
  IF NEW.role = 'programmer' AND NEW.team_id IS NULL THEN
    SELECT id INTO programming_team_id
    FROM teams
    WHERE name = 'Programming Team'
    LIMIT 1;

    IF programming_team_id IS NOT NULL THEN
      UPDATE users
      SET team_id = programming_team_id
      WHERE id = NEW.id;

      RAISE NOTICE '[PROGRAMMER_ASSIGNED] user=%, team_id=%', NEW.email, programming_team_id;
    ELSE
      RAISE WARNING '[PROGRAMMER_ASSIGN_SKIP] Programming Team not found for user=%', NEW.email;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public
   SET row_security = off;

ALTER FUNCTION auto_assign_programmer_to_team() OWNER TO postgres;

DROP TRIGGER IF EXISTS users_auto_assign_programmer_trigger ON users;
CREATE TRIGGER users_auto_assign_programmer_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.role = 'programmer')
  EXECUTE FUNCTION auto_assign_programmer_to_team();

-- Backfill: assign existing programmer users who have no team
DO $$
DECLARE
  user_record RECORD;
  programming_team_id UUID;
  total_assigned INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Backfilling programmer users to shared Programming Team ===';

  SELECT id INTO programming_team_id
  FROM teams
  WHERE name = 'Programming Team'
  LIMIT 1;

  IF programming_team_id IS NULL THEN
    RAISE WARNING 'Programming Team not found — skipping programmer backfill';
    RETURN;
  END IF;

  FOR user_record IN
    SELECT id, name, email
    FROM users
    WHERE role = 'programmer' AND team_id IS NULL
  LOOP
    UPDATE users
    SET team_id = programming_team_id
    WHERE id = user_record.id;

    RAISE NOTICE '[ASSIGNED] programmer % to Programming Team', user_record.email;
    total_assigned := total_assigned + 1;
  END LOOP;

  RAISE NOTICE '=== Done: % programmer users assigned ===', total_assigned;
END;
$$;

-- Note: The team_performance materialized view (used for overview charts) will
-- auto-refresh via its existing DB trigger on next team activity.
-- The Team Accountability table queries the teams table directly and is unaffected.
