-- =====================================================
-- Episode Tracking Table
-- Stores manually-entered per-episode fields for the
-- revision tracking tab (payment dates, status)
-- =====================================================

CREATE TABLE IF NOT EXISTS episode_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  payment_request_date TEXT,
  payment_date TEXT,
  tracking_status TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(episode_id)
);

CREATE INDEX idx_episode_tracking_episode_id ON episode_tracking(episode_id);

-- Add per-project tracking notes (writer's commitment free-text)
ALTER TABLE call_reports ADD COLUMN IF NOT EXISTS tracking_notes TEXT;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE episode_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "episode_tracking_select" ON episode_tracking
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('admin', 'management', 'programmer', 'management_viewer', 'executive')
    )
  );

CREATE POLICY "episode_tracking_insert" ON episode_tracking
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('admin', 'management', 'programmer')
    )
  );

CREATE POLICY "episode_tracking_update" ON episode_tracking
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('admin', 'management', 'programmer')
    )
  );
