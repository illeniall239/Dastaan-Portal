-- Migration: Add unique constraints to prevent duplicate episode numbers per project
-- Created: 2025-11-13
-- Purpose: Ensure each episode number is unique within a call_report or story

-- STEP 1: Clean up existing duplicates for call_reports
-- Keep the most recent episode (highest created_at) and delete older duplicates
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY call_report_id, episode_number
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM public.episodes
  WHERE call_report_id IS NOT NULL
)
DELETE FROM public.episodes
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- STEP 2: Clean up existing duplicates for stories
-- Keep the most recent episode (highest created_at) and delete older duplicates
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY story_id, episode_number
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM public.episodes
  WHERE story_id IS NOT NULL
)
DELETE FROM public.episodes
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- STEP 3: Add unique constraint for episodes linked to call_reports
-- This prevents multiple episodes with the same episode_number for the same call_report_id
ALTER TABLE public.episodes
ADD CONSTRAINT unique_episode_per_call_report
UNIQUE NULLS NOT DISTINCT (call_report_id, episode_number);

-- STEP 4: Add unique constraint for episodes linked to stories
-- This prevents multiple episodes with the same episode_number for the same story_id
ALTER TABLE public.episodes
ADD CONSTRAINT unique_episode_per_story
UNIQUE NULLS NOT DISTINCT (story_id, episode_number);

-- Note: NULLS NOT DISTINCT treats NULL values as equal, which is important because
-- the episode_has_source constraint ensures exactly one of call_report_id or story_id is NULL.
-- This prevents multiple episodes with NULL values from bypassing the constraint.

COMMENT ON CONSTRAINT unique_episode_per_call_report ON public.episodes IS
'Ensures episode numbers are unique per call report';

COMMENT ON CONSTRAINT unique_episode_per_story ON public.episodes IS
'Ensures episode numbers are unique per story';
