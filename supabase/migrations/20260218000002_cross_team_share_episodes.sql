-- Cross-Team Share Episodes: Allow episodes to be included in cross-team shares
-- Supports both bulk sharing (call report + episodes) and episode-only shares

-- 1. Make call_report_id nullable to support episode-only shares
ALTER TABLE cross_team_shares ALTER COLUMN call_report_id DROP NOT NULL;

-- 2. Junction table linking episodes to cross-team shares
CREATE TABLE IF NOT EXISTS cross_team_share_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cross_team_share_id UUID NOT NULL REFERENCES cross_team_shares(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cross_team_share_id, episode_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ctse_share ON cross_team_share_episodes(cross_team_share_id);
CREATE INDEX IF NOT EXISTS idx_ctse_episode ON cross_team_share_episodes(episode_id);

-- RLS
ALTER TABLE cross_team_share_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cross_team_share_episodes_select" ON cross_team_share_episodes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "cross_team_share_episodes_insert" ON cross_team_share_episodes
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "cross_team_share_episodes_delete" ON cross_team_share_episodes
  FOR DELETE TO authenticated
  USING (true);

-- 3. Add cross_team_share_id to episodic_evaluations for tracking cross-team episode evaluations
ALTER TABLE episodic_evaluations
  ADD COLUMN IF NOT EXISTS cross_team_share_id UUID REFERENCES cross_team_shares(id);

CREATE INDEX IF NOT EXISTS idx_episodic_eval_cross_team ON episodic_evaluations(cross_team_share_id)
  WHERE cross_team_share_id IS NOT NULL;
