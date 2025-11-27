-- Cascade user name updates to all related tables
-- When a user's name is updated in the users table, automatically update
-- all tables that display the user's name via JOIN relationships

-- ============================================================
-- TRIGGER FUNCTION: Update User Display Names
-- ============================================================

CREATE OR REPLACE FUNCTION cascade_user_name_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the name actually changed
  IF OLD.name IS DISTINCT FROM NEW.name THEN

    -- Log the update for debugging
    RAISE NOTICE 'Cascading name update for user % from "%" to "%"',
      NEW.id, OLD.name, NEW.name;

    -- Note: Most tables use JOINs with users table, so they automatically
    -- get updated names when queried. This trigger is for denormalized fields.

    -- UPDATE stories.logged_by (TEXT field, not FK)
    -- This field stores the name as plain text without FK relationship
    UPDATE stories
    SET logged_by = NEW.name
    WHERE created_by = NEW.id;

    -- UPDATE rejected_archive.logged_by (archive snapshot)
    UPDATE rejected_archive
    SET logged_by = NEW.name
    WHERE created_by = NEW.id;

    -- UPDATE evaluations_snapshot (archive snapshots)
    UPDATE evaluations_snapshot
    SET
      evaluator_name = NEW.name,
      evaluator_email = NEW.email
    WHERE evaluator_id = NEW.id;

    RAISE NOTICE 'User name cascade complete for user %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ATTACH TRIGGER TO USERS TABLE
-- ============================================================

DROP TRIGGER IF EXISTS cascade_user_name_on_update ON users;

CREATE TRIGGER cascade_user_name_on_update
  AFTER UPDATE OF name, email ON users
  FOR EACH ROW
  EXECUTE FUNCTION cascade_user_name_update();

COMMENT ON TRIGGER cascade_user_name_on_update ON users IS
  'Automatically updates denormalized user name fields in related tables when users.name changes';

-- ============================================================
-- ONE-TIME BACKFILL: Sync existing data
-- ============================================================

-- Sync stories.logged_by with current user names
UPDATE stories s
SET logged_by = u.name
FROM users u
WHERE s.created_by = u.id
AND s.logged_by IS DISTINCT FROM u.name;

-- Sync rejected_archive.logged_by
UPDATE rejected_archive ra
SET logged_by = u.name
FROM users u
WHERE ra.created_by = u.id
AND ra.logged_by IS DISTINCT FROM u.name;

-- Sync evaluations_snapshot
UPDATE evaluations_snapshot es
SET
  evaluator_name = u.name,
  evaluator_email = u.email
FROM users u
WHERE es.evaluator_id = u.id
AND (es.evaluator_name IS DISTINCT FROM u.name OR es.evaluator_email IS DISTINCT FROM u.email);
