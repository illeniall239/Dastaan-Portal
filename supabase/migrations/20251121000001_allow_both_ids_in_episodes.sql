-- Allow episodes to have both call_report_id AND story_id
-- Previous constraint only allowed one or the other (mutual exclusion)
-- New constraint requires at least one ID but allows both

BEGIN;

-- Drop the old constraint that enforced mutual exclusivity
ALTER TABLE public.episodes
DROP CONSTRAINT IF EXISTS episode_has_source;

-- Add new constraint that requires AT LEAST ONE ID (but allows both)
ALTER TABLE public.episodes
ADD CONSTRAINT episode_has_source CHECK (
  call_report_id IS NOT NULL OR story_id IS NOT NULL
);

COMMENT ON CONSTRAINT episode_has_source ON public.episodes IS
'Ensures episode has at least one source reference (call_report_id or story_id, or both)';

COMMIT;
