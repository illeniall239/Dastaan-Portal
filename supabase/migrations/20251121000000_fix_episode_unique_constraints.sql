-- Fix unique constraints on episodes table to allow NULLs
-- The previous "NULLS NOT DISTINCT" setting caused conflicts between episodes
-- from different projects because they all shared NULL values for the other ID.

BEGIN;

-- Drop the incorrect constraints
ALTER TABLE public.episodes DROP CONSTRAINT IF EXISTS unique_episode_per_call_report;
ALTER TABLE public.episodes DROP CONSTRAINT IF EXISTS unique_episode_per_story;

-- Add corrected constraints (Standard UNIQUE treats NULLs as distinct)
ALTER TABLE public.episodes
ADD CONSTRAINT unique_episode_per_call_report
UNIQUE (call_report_id, episode_number);

ALTER TABLE public.episodes
ADD CONSTRAINT unique_episode_per_story
UNIQUE (story_id, episode_number);

COMMENT ON CONSTRAINT unique_episode_per_call_report ON public.episodes IS
'Ensures episode numbers are unique per call report';

COMMENT ON CONSTRAINT unique_episode_per_story ON public.episodes IS
'Ensures episode numbers are unique per story';

COMMIT;

