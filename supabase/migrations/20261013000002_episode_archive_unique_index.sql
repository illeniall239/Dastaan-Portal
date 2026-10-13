-- Update all unique constraints/indexes to exclude archived episodes.
-- An archived episode should not block creating a new episode with the same number.

-- 1. Replace table-level version constraints with partial unique indexes
--    (table constraints can't have WHERE clauses, so we drop them and use indexes)
ALTER TABLE public.episodes DROP CONSTRAINT IF EXISTS unique_episode_version_per_call_report;
ALTER TABLE public.episodes DROP CONSTRAINT IF EXISTS unique_episode_version_per_story;

CREATE UNIQUE INDEX idx_unique_episode_version_per_call_report
  ON public.episodes (call_report_id, episode_number, version)
  WHERE call_report_id IS NOT NULL AND archived_at IS NULL;

CREATE UNIQUE INDEX idx_unique_episode_version_per_story
  ON public.episodes (story_id, episode_number, version)
  WHERE story_id IS NOT NULL AND archived_at IS NULL;

-- 2. Replace partial unique indexes for is_current
DROP INDEX IF EXISTS idx_one_current_per_call_report_episode;
DROP INDEX IF EXISTS idx_one_current_per_story_episode;

CREATE UNIQUE INDEX idx_one_current_per_call_report_episode
  ON public.episodes (call_report_id, episode_number)
  WHERE is_current = true AND call_report_id IS NOT NULL AND archived_at IS NULL;

CREATE UNIQUE INDEX idx_one_current_per_story_episode
  ON public.episodes (story_id, episode_number)
  WHERE is_current = true AND story_id IS NOT NULL AND archived_at IS NULL;
