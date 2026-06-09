-- Set Salman Ahmed as the head of the Programming Team
-- This makes Salman the visible leader of the programming group in the management portal.
-- Programmer users' roles, team_id assignments, and all their work are unaffected.
UPDATE teams
SET team_head_id = (
  SELECT id FROM users WHERE email = 'salman.ahmed@geo.tv'
),
updated_at = now()
WHERE name = 'Programming Team' AND team_type = 'programmer';
