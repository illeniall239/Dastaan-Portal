-- Add team_id to writer_engagements for team isolation
ALTER TABLE writer_engagements
  ADD COLUMN team_id UUID REFERENCES teams(id);

-- Backfill existing rows with creator's team_id
UPDATE writer_engagements
SET team_id = users.team_id
FROM users
WHERE writer_engagements.created_by = users.id
  AND users.team_id IS NOT NULL;

-- Index for team-based queries
CREATE INDEX idx_writer_engagements_team_id ON writer_engagements(team_id);
