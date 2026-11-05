-- A team's head is a member of the team they head.
--
-- Every team already works this way except one: Salman Ahmed heads the Programming Team, but his account
-- sits in the personal team auto-created for him when he became management ("Team automatically created
-- for Salman Ahmed", only member: him, no data). So he shows up as two teams, and code had to special-case
-- him. The admin team routes set team_head_id without ever making the head a member, which is how it
-- happened.
--
-- This migration:
-- 1. ensure_team_head_is_member(team): moves the head into the team they head, but only when their current
--    team is an auto-created personal management team that holds nothing but them; that empty team is then
--    deleted. Anything else (a real team, other members, any data) is left alone with a notice.
-- 2. A trigger runs it whenever a team is created or its head changes, so this can't drift again.
-- 3. Runs it once for every existing team (today that only changes Salman).
-- Membership never affects management permissions (those come from the role), and a management user's
-- evaluations never count toward programmers' "evaluated" status (that requires the programmer role).
-- Run on staging first, then production. Salman should log out and back in afterwards, since his session
-- cookie caches his team.

CREATE OR REPLACE FUNCTION public.ensure_team_head_is_member(p_team_id UUID)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_head_id UUID;
  v_current_team UUID;
BEGIN
  SELECT team_head_id INTO v_head_id FROM teams WHERE id = p_team_id;
  IF v_head_id IS NULL THEN
    RETURN;
  END IF;

  SELECT team_id INTO v_current_team FROM users WHERE id = v_head_id;
  IF v_current_team IS NOT DISTINCT FROM p_team_id THEN
    RETURN;  -- already a member
  END IF;

  IF v_current_team IS NULL THEN
    UPDATE users SET team_id = p_team_id WHERE id = v_head_id;
    RETURN;
  END IF;

  -- Only an auto-created personal management team holding nothing but the head may be left behind
  IF NOT EXISTS (
       SELECT 1 FROM teams
       WHERE id = v_current_team
         AND team_type = 'management'
         AND team_head_id = v_head_id
         AND description LIKE 'Team automatically created for %')
     OR EXISTS (SELECT 1 FROM users WHERE team_id = v_current_team AND id <> v_head_id)
     OR EXISTS (SELECT 1 FROM stories WHERE team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM call_reports WHERE team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM evaluator_forms WHERE team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM evaluator_assignments WHERE team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM episodes WHERE team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM episodic_evaluations WHERE team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM detailed_one_liners WHERE team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM teams WHERE parent_team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM writer_engagements WHERE team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM cross_team_shares WHERE from_team_id = v_current_team OR to_team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM meetings WHERE team_id = v_current_team)
     OR EXISTS (SELECT 1 FROM annual_targets WHERE team_id = v_current_team)
  THEN
    RAISE NOTICE 'Head % of team % stays in team %: it is not an empty auto-created personal team',
      v_head_id, p_team_id, v_current_team;
    RETURN;
  END IF;

  UPDATE users SET team_id = p_team_id WHERE id = v_head_id;
  DELETE FROM teams WHERE id = v_current_team;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_team_head_is_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.team_head_id IS NOT NULL THEN
    PERFORM ensure_team_head_is_member(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS teams_head_is_member_trigger ON public.teams;
CREATE TRIGGER teams_head_is_member_trigger
  AFTER INSERT OR UPDATE OF team_head_id ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.trg_team_head_is_member();

-- Existing teams
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM teams WHERE team_head_id IS NOT NULL LOOP
    PERFORM ensure_team_head_is_member(r.id);
  END LOOP;
END $$;
