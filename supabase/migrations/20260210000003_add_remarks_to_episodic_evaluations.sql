-- Add remarks column to episodic_evaluations table
ALTER TABLE public.episodic_evaluations
ADD COLUMN IF NOT EXISTS remarks TEXT;

COMMENT ON COLUMN public.episodic_evaluations.remarks IS 'Optional remarks or final comments from the evaluator';
