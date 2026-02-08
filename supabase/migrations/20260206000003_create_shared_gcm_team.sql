-- Create a single shared GCM team for all GCM users

DO $$
DECLARE
  gcm_team_id UUID;
  gcm_head_user_id UUID;
BEGIN
  -- Find a GCM user to designate as team head (if any exist)
  SELECT id INTO gcm_head_user_id 
  FROM users 
  WHERE role = 'gcm' 
  LIMIT 1;

  -- Create a single shared GCM team
  INSERT INTO teams (
    name,
    description,
    team_type,
    team_head_id
  ) VALUES (
    'GCM Team',
    'Shared team for all GCM department users',
    'production',
    gcm_head_user_id  -- Will be NULL if no GCM users exist yet
  )
  ON CONFLICT (name) DO NOTHING  -- In case this migration is run multiple times
  RETURNING id INTO gcm_team_id;

  -- If a GCM team was created and we have a team head, update the team
  IF gcm_team_id IS NOT NULL AND gcm_head_user_id IS NOT NULL THEN
    UPDATE teams 
    SET team_head_id = gcm_head_user_id 
    WHERE id = gcm_team_id;
  END IF;

  -- Assign all existing GCM users to the shared GCM team
  UPDATE users 
  SET team_id = (
    SELECT id 
    FROM teams 
    WHERE name = 'GCM Team'
  )
  WHERE role = 'gcm';

  RAISE NOTICE 'Shared GCM team created/updated and all GCM users assigned to it';
END $$;

-- Verify the shared GCM team exists
DO $$
DECLARE
  gcm_team_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO gcm_team_count
  FROM teams
  WHERE name = 'GCM Team';

  IF gcm_team_count = 0 THEN
    RAISE EXCEPTION '❌ ERROR: Shared GCM team was not created!';
  ELSE
    RAISE NOTICE '✅ SUCCESS: Shared GCM team exists';
  END IF;
END $$;

-- Verify all GCM users are assigned to the shared team
DO $$
DECLARE
  gcm_users_without_team INTEGER;
BEGIN
  SELECT COUNT(*) INTO gcm_users_without_team
  FROM users
  WHERE role = 'gcm' AND team_id IS NULL;

  IF gcm_users_without_team > 0 THEN
    RAISE WARNING '⚠️  WARNING: % GCM users still without team assignment!', gcm_users_without_team;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All GCM users assigned to shared team';
  END IF;
END $$;