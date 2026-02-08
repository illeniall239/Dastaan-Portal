-- Migration: Add Episode Versioning Support
-- Description: Allows multiple versions of the same episode, tracks approval status per episode
-- Date: 2026-02-08

BEGIN;

-- Step 1: Add versioning columns
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID DEFAULT NULL REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS supersedes_id UUID DEFAULT NULL REFERENCES public.episodes(id);

-- Step 2: Check constraints
ALTER TABLE public.episodes
  ADD CONSTRAINT valid_approval_status CHECK (
    approval_status IS NULL OR
    approval_status IN ('approved', 'rejected', 'needs_revision')
  );

ALTER TABLE public.episodes
  ADD CONSTRAINT positive_version CHECK (version > 0);

-- Step 3: Drop old unique constraints that block multiple versions
ALTER TABLE public.episodes
  DROP CONSTRAINT IF EXISTS unique_episode_per_call_report;

ALTER TABLE public.episodes
  DROP CONSTRAINT IF EXISTS unique_episode_per_story;

-- Step 4: Add new unique constraints that include version
ALTER TABLE public.episodes
  ADD CONSTRAINT unique_episode_version_per_call_report
  UNIQUE (call_report_id, episode_number, version);

ALTER TABLE public.episodes
  ADD CONSTRAINT unique_episode_version_per_story
  UNIQUE (story_id, episode_number, version);

-- Step 5: Partial unique indexes — only ONE is_current=true per (source, episode_number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_per_call_report_episode
  ON public.episodes (call_report_id, episode_number)
  WHERE is_current = true AND call_report_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_per_story_episode
  ON public.episodes (story_id, episode_number)
  WHERE is_current = true AND story_id IS NOT NULL;

-- Step 6: Performance indexes
CREATE INDEX IF NOT EXISTS idx_episodes_is_current ON public.episodes (is_current)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_episodes_approval_status ON public.episodes (approval_status)
  WHERE approval_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_episodes_supersedes ON public.episodes (supersedes_id)
  WHERE supersedes_id IS NOT NULL;

-- Step 7: Comments
COMMENT ON COLUMN public.episodes.version IS 'Version number: 1 = original, 2+ = revisions';
COMMENT ON COLUMN public.episodes.is_current IS 'Whether this is the active/latest version. Only one per (source, episode_number) can be current';
COMMENT ON COLUMN public.episodes.approval_status IS 'Approval status: NULL (pending), approved, rejected, needs_revision';
COMMENT ON COLUMN public.episodes.approved_by IS 'User who set the approval status';
COMMENT ON COLUMN public.episodes.approved_at IS 'Timestamp when approval status was set';
COMMENT ON COLUMN public.episodes.supersedes_id IS 'Points to the previous version this one replaces';

COMMIT;
