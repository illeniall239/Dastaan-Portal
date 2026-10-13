-- Add archive columns to episodes table
ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES users(id);

-- Index for filtering active episodes
CREATE INDEX IF NOT EXISTS idx_episodes_archived_at ON episodes (archived_at) WHERE archived_at IS NULL;
