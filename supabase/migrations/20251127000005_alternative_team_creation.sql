-- ============================================================================
-- ALTERNATIVE TEAM CREATION - RLS BYPASS VIA HELPER FUNCTION
-- ============================================================================
-- Purpose: Alternative approach if direct RLS bypass doesn't work
-- Solution: Use a separate helper function to create teams with RLS disabled
-- ============================================================================

-- Create helper function that bypasses RLS
CREATE OR REPLACE FUNCTION create_team_bypassing_rls(
  p_name TEXT,
  p_description TEXT,
  p_team_type TEXT,
  p_team_head_id UUID
) RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Temporarily disable RLS for this transaction
  SET LOCAL row_security = off;

  INSERT INTO teams (name, description, team_type, team_head_id)
  VALUES (p_name, p_description, p_team_type, p_team_head_id)
  RETURNING id INTO v_team_id;

  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

ALTER FUNCTION create_team_bypassing_rls OWNER TO postgres;

-- Update trigger to use this function
CREATE OR REPLACE FUNCTION auto_create_team_for_evaluator()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
  existing_team_id UUID;
  target_team_name TEXT;
BEGIN
  IF NEW.role = 'evaluator' AND NEW.team_id IS NULL THEN
    target_team_name := NEW.email || ' Team';

    -- Check if team already exists
    SELECT id INTO existing_team_id
    FROM teams
    WHERE name = target_team_name;

    IF existing_team_id IS NOT NULL THEN
      -- Re-link existing team
      UPDATE users SET team_id = existing_team_id WHERE id = NEW.id;
      UPDATE teams SET team_head_id = NEW.id WHERE id = existing_team_id;
      RAISE NOTICE '[TEAM_EXISTS] Re-linked evaluator % to team %', NEW.email, existing_team_id;
    ELSE
      -- Use the RLS-bypassing function to create team
      new_team_id := create_team_bypassing_rls(
        target_team_name,
        'Team led by ' || NEW.name || ' (' || NEW.email || ')',
        'evaluator',
        NEW.id
      );

      -- Update user
      UPDATE users SET team_id = new_team_id WHERE id = NEW.id;
      RAISE NOTICE '[TEAM_CREATED] evaluator=%, team_id=%', NEW.email, new_team_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION auto_create_team_for_evaluator() OWNER TO postgres;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
