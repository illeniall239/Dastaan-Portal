-- ============================================================================
-- FIX EVALUATOR TEAM NAMING TO ENSURE UNIQUENESS
-- ============================================================================
-- Purpose: Fix team name uniqueness issue when creating evaluators
-- Problem: Using name + "'s Team" causes UNIQUE violation for evaluators with same name
-- Solution: Use email + " Team" since email is guaranteed unique
-- ============================================================================

-- Replace the function with email-based naming
CREATE OR REPLACE FUNCTION auto_create_team_for_evaluator()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
  team_type_val TEXT;
BEGIN
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

    BEGIN
      -- Use email for team name (guaranteed unique since users.email is unique)
      INSERT INTO teams (
        name,
        description,
        team_type,
        team_head_id
      ) VALUES (
        NEW.email || ' Team',  -- FIX: Use email instead of name
        'Team led by ' || NEW.name || ' (' || NEW.email || ')',
        team_type_val,
        NEW.id
      )
      RETURNING id INTO new_team_id;

      -- Update user with team_id
      UPDATE users
      SET team_id = new_team_id
      WHERE id = NEW.id;

      RAISE NOTICE '[TEAM_AUTO_CREATED] evaluator=%, email=%, team_id=%', NEW.name, NEW.email, new_team_id;

    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION 'TEAM_UNIQUE_VIOLATION: Team name collision for evaluator % (email=%)', NEW.name, NEW.email
          USING HINT = 'This should not happen with email-based names';
      WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'TEAM_FK_VIOLATION: Invalid team_head_id for evaluator % (email=%)', NEW.name, NEW.email;
      WHEN OTHERS THEN
        RAISE EXCEPTION 'TEAM_CREATION_FAILED: % (evaluator=%, email=%)', SQLERRM, NEW.name, NEW.email;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper permissions
ALTER FUNCTION auto_create_team_for_evaluator() OWNER TO postgres;
ALTER FUNCTION auto_create_team_for_evaluator() SET row_security = off;

-- Recreate trigger (in case it was dropped)
DROP TRIGGER IF EXISTS users_auto_create_team_trigger ON users;
CREATE TRIGGER users_auto_create_team_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.role = 'evaluator')
  EXECUTE FUNCTION auto_create_team_for_evaluator();

COMMENT ON FUNCTION auto_create_team_for_evaluator() IS
  'Auto-creates a team when an evaluator is created. Team name uses email to ensure uniqueness.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
