-- Fix GCM team assignments: ensure all GCM users are in the shared GCM team

DO $$
DECLARE
  shared_gcm_team_id UUID;
  gcm_users_count INTEGER;
  users_updated_count INTEGER;
BEGIN
  -- Get the shared GCM team ID
  SELECT id INTO shared_gcm_team_id
  FROM teams
  WHERE name = 'GCM Team';

  IF shared_gcm_team_id IS NULL THEN
    RAISE EXCEPTION 'Shared GCM team does not exist. Run the shared GCM team migration first.';
  END IF;

  -- Count total GCM users before update
  SELECT COUNT(*) INTO gcm_users_count
  FROM users
  WHERE role = 'gcm';

  RAISE NOTICE 'Found % total GCM users', gcm_users_count;

  -- Update all GCM users to be assigned to the shared GCM team
  UPDATE users
  SET team_id = shared_gcm_team_id
  WHERE role = 'gcm';

  GET DIAGNOSTICS users_updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Updated % GCM users to shared GCM team (ID: %)', users_updated_count, shared_gcm_team_id;

  -- Verify all GCM users are now in the shared team
  DO $check$
  DECLARE
    gcm_users_wrong_team INTEGER;
    sample_wrong_users TEXT;
    correct_team_id UUID;
  BEGIN
    -- Get the shared GCM team ID again for comparison
    SELECT id INTO correct_team_id
    FROM teams
    WHERE name = 'GCM Team';

    -- Check if any GCM users are still not in the shared team
    SELECT COUNT(*), STRING_AGG(users.email, ', ')
    INTO gcm_users_wrong_team, sample_wrong_users
    FROM users
    WHERE users.role = 'gcm'
      AND users.team_id != correct_team_id;

    IF gcm_users_wrong_team > 0 THEN
      RAISE WARNING '⚠️  WARNING: % GCM users are still not in the shared GCM team. Sample: %',
                   gcm_users_wrong_team, LEFT(sample_wrong_users, 200);
    ELSE
      RAISE NOTICE '✅ SUCCESS: All GCM users are now correctly assigned to the shared GCM team';
    END IF;
  END $check$;

END $$;

-- Verification query to show the final state
DO $$
DECLARE
  result_text TEXT;
BEGIN
  SELECT
    string_agg(
      'Role: ' || role ||
      ', Team Name: ' || COALESCE(team_name, 'NULL') ||
      ', User Count: ' || user_count,
      '; '
    )
  INTO result_text
  FROM (
    SELECT
      u.role,
      t.name as team_name,
      COUNT(u.id) as user_count
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.role = 'gcm'
    GROUP BY u.role, t.name
  ) AS summary;

  RAISE NOTICE 'GCM User Team Assignment Summary: %', COALESCE(result_text, 'None found');
END $$;