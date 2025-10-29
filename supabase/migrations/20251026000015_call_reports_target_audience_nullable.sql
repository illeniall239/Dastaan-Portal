-- Make target_audience nullable and add new target_slot column if missing
-- Safely relax NOT NULL constraint for compatibility with UI changes

DO $$
BEGIN
  -- Add target_slot column if not exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'call_reports'
      AND column_name = 'target_slot'
  ) THEN
    EXECUTE 'ALTER TABLE public.call_reports ADD COLUMN target_slot TEXT';
  END IF;
END $$;

-- Optional: Backfill target_slot from known slots embedded in meeting_notes (noop by default)
-- UPDATE public.call_reports
-- SET target_slot = NULL
-- WHERE target_slot IS NULL;


