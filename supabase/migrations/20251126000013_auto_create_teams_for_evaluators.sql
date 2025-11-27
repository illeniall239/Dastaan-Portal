-- ============================================================================
-- AUTO-CREATE TEAMS FOR EVALUATORS (FIXED)
-- ============================================================================
-- Purpose: Automatically create teams when evaluators are created
-- Trigger timing: AFTER INSERT (so user row exists for FK constraint)
-- ============================================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS users_auto_create_team_trigger ON users;

-- Create AFTER INSERT trigger function
CREATE OR REPLACE FUNCTION auto_create_team_for_evaluator()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
  team_type_val TEXT;
BEGIN
  -- Only create team for evaluator role with no team assigned
  IF NEW.role = 'evaluator' AND NEW.team_id IS NULL THEN
    -- Determine team_type based on department
    team_type_val := 'evaluator';
    IF NEW.department LIKE 'production%' THEN
      team_type_val := 'production';
    ELSIF NEW.department LIKE 'channel%' THEN
      team_type_val := 'channel';
    ELSIF NEW.department LIKE 'adaptation%' THEN
      team_type_val := 'adaptation';
    END IF;

    -- Create new team (user row exists now, FK constraint works)
    INSERT INTO teams (
      name,
      description,
      team_type,
      team_head_id
    ) VALUES (
      NEW.name || '''s Team',
      'Team automatically created for evaluator ' || NEW.name,
      team_type_val,
      NEW.id  -- This works because NEW is already in database
    )
    RETURNING id INTO new_team_id;

    -- Update user with team_id
    UPDATE users
    SET team_id = new_team_id
    WHERE id = NEW.id;

    RAISE NOTICE 'Auto-created team % for evaluator %', new_team_id, NEW.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set function owner to postgres to bypass RLS
ALTER FUNCTION auto_create_team_for_evaluator() OWNER TO postgres;

-- Disable RLS for this function
ALTER FUNCTION auto_create_team_for_evaluator() SET row_security = off;

-- Create AFTER INSERT trigger (CRITICAL: must be AFTER, not BEFORE)
CREATE TRIGGER users_auto_create_team_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.role = 'evaluator')
  EXECUTE FUNCTION auto_create_team_for_evaluator();

COMMENT ON FUNCTION auto_create_team_for_evaluator() IS
  'Trigger function to auto-create teams for evaluators. Runs AFTER INSERT so user row exists for FK constraint.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
