-- ============================================================
-- Migration: revision-aware approvals + episode discussions
-- ============================================================

-- 1a — Extend call_report_discussions with revision tracking
ALTER TABLE call_report_discussions
  ADD COLUMN IF NOT EXISTS revision_id UUID REFERENCES call_report_revisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN NOT NULL DEFAULT false;

-- 1b — Make story_approvals revision-aware
ALTER TABLE story_approvals
  ADD COLUMN IF NOT EXISTS revision_id UUID REFERENCES call_report_revisions(id) ON DELETE SET NULL;

-- Drop the old single unique constraint (if it exists)
ALTER TABLE story_approvals
  DROP CONSTRAINT IF EXISTS story_approvals_call_report_id_user_id_key;

-- Partial unique indexes (NULL ≠ NULL in standard unique constraints, so we use partial indexes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_story_approvals_base
  ON story_approvals(call_report_id, user_id) WHERE revision_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_story_approvals_revision
  ON story_approvals(call_report_id, user_id, revision_id) WHERE revision_id IS NOT NULL;

-- 1c — Create episode_discussions table
CREATE TABLE IF NOT EXISTS episode_discussions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  episode_id        UUID NOT NULL REFERENCES episodes(id)  ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  message           TEXT NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 2000),
  revision_id       UUID REFERENCES episode_revisions(id)  ON DELETE SET NULL,
  is_system_message BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_episode_discussions_episode_id ON episode_discussions(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_discussions_user_id    ON episode_discussions(user_id);

-- RLS
ALTER TABLE episode_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read episode discussions"
  ON episode_discussions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own episode discussions"
  ON episode_discussions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_system_message = true);

CREATE POLICY "Users can delete own episode discussions or admin/management"
  ON episode_discussions FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND role IN ('admin', 'management')
    )
  );
