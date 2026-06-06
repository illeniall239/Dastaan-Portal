-- Migrate all work records for ammar.usmani and hunazza.ufaq to humera.safder's team.
-- Run AFTER 20260607000003_reassign_users_to_humera_team.sql (which already updated users.team_id).

DO $$
DECLARE
  humera_team_id UUID;
  ammar_id UUID;
  hunazza_id UUID;
BEGIN
  -- Resolve IDs
  SELECT id INTO ammar_id   FROM users WHERE email = 'ammar.usmani@geo.tv';
  SELECT id INTO hunazza_id FROM users WHERE email = 'hunazza.ufaq@geo.tv';
  SELECT id INTO humera_team_id FROM teams WHERE team_head_id = (
    SELECT id FROM users WHERE email = 'humera.safder@geo.tv'
  );

  IF humera_team_id IS NULL THEN
    RAISE EXCEPTION 'Could not find humera.safder''s team. Make sure migration 20260607000002 ran first.';
  END IF;

  -- call_reports (created_by)
  UPDATE call_reports
  SET team_id = humera_team_id
  WHERE created_by IN (ammar_id, hunazza_id);

  -- stories (created_by)
  UPDATE stories
  SET team_id = humera_team_id
  WHERE created_by IN (ammar_id, hunazza_id);

  -- evaluator_forms (evaluator_id)
  UPDATE evaluator_forms
  SET team_id = humera_team_id
  WHERE evaluator_id IN (ammar_id, hunazza_id);

  -- episodes (logged_by)
  UPDATE episodes
  SET team_id = humera_team_id
  WHERE logged_by IN (ammar_id, hunazza_id);

  -- episodic_evaluations (evaluator_id)
  UPDATE episodic_evaluations
  SET team_id = humera_team_id
  WHERE evaluator_id IN (ammar_id, hunazza_id);

  -- detailed_one_liners (created_by)
  UPDATE detailed_one_liners
  SET team_id = humera_team_id
  WHERE created_by IN (ammar_id, hunazza_id);

  -- evaluator_assignments (evaluator_id)
  UPDATE evaluator_assignments
  SET team_id = humera_team_id
  WHERE evaluator_id IN (ammar_id, hunazza_id);

  RAISE NOTICE 'Done. Migrated all work for ammar (%) and hunazza (%) to team %.',
    ammar_id, hunazza_id, humera_team_id;
END;
$$;
