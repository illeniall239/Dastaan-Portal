-- Episode Revisions Table
-- Tracks revised versions of episode scripts with comments

CREATE TABLE IF NOT EXISTS episode_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  revision_number INT NOT NULL CHECK (revision_number > 0),
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  comment TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(episode_id, revision_number)
);

CREATE INDEX idx_episode_revisions_episode_id ON episode_revisions(episode_id);
CREATE INDEX idx_episode_revisions_uploaded_by ON episode_revisions(uploaded_by);

-- Enable RLS
ALTER TABLE episode_revisions ENABLE ROW LEVEL SECURITY;

-- View policy: same users who can view episodes can view revisions
CREATE POLICY "episode_revisions_select" ON episode_revisions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM episodes e
      WHERE e.id = episode_revisions.episode_id
    )
  );

-- Insert policy: users who can edit episodes can add revisions
CREATE POLICY "episode_revisions_insert" ON episode_revisions
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM episodes e
      WHERE e.id = episode_revisions.episode_id
    )
  );

-- Delete policy: uploader or content_manager/admin
CREATE POLICY "episode_revisions_delete" ON episode_revisions
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('content_manager', 'admin', 'management')
    )
  );
