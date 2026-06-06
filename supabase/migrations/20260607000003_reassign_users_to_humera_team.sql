-- Move ammar.usmani and hunazza.ufaq to humera.safder's team
UPDATE users
SET team_id = (
  SELECT id FROM teams WHERE team_head_id = (
    SELECT id FROM users WHERE email = 'humera.safder@geo.tv'
  )
)
WHERE email IN ('ammar.usmani@geo.tv', 'hunazza.ufaq@geo.tv');
