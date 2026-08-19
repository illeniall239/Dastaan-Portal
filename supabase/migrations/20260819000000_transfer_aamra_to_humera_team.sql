-- Transfer all of Aamra Shahid's data to Humera's team, deactivate her account, and delete her team.
-- Aamra has left the organization.

DO $$
DECLARE
  humera_team_id UUID;
  aamra_id UUID;
  aamra_team_id UUID := '2c8d93a9-0034-4b8d-af8d-696e5da11fae';
BEGIN
  SELECT id INTO aamra_id FROM users WHERE email = 'aamra.shahid@geo.tv';
  SELECT id INTO humera_team_id FROM teams WHERE team_head_id = (
    SELECT id FROM users WHERE email = 'humera.safder@geo.tv'
  );

  -- 1. Move Aamra's user record to Humera's team
  UPDATE users SET team_id = humera_team_id WHERE id = aamra_id;

  -- 2. Reassign all work records from Aamra's team to Humera's team
  UPDATE call_reports SET team_id = humera_team_id WHERE team_id = aamra_team_id;
  UPDATE stories SET team_id = humera_team_id WHERE team_id = aamra_team_id;
  UPDATE episodes SET team_id = humera_team_id WHERE team_id = aamra_team_id;
  UPDATE evaluator_forms SET team_id = humera_team_id WHERE team_id = aamra_team_id;
  UPDATE episodic_evaluations SET team_id = humera_team_id WHERE team_id = aamra_team_id;
  UPDATE detailed_one_liners SET team_id = humera_team_id WHERE team_id = aamra_team_id;
  UPDATE evaluator_assignments SET team_id = humera_team_id WHERE team_id = aamra_team_id;

  -- 3. Deactivate Aamra's account
  UPDATE users SET status = 'inactive' WHERE id = aamra_id;

  -- 4. Delete Aamra's now-empty team
  DELETE FROM teams WHERE id = aamra_team_id;

  RAISE NOTICE 'Done. Transferred Aamra (%) to Humera team (%), deactivated, and deleted team %.',
    aamra_id, humera_team_id, aamra_team_id;
END;
$$;
