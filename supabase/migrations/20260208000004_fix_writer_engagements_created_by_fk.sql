-- Fix: Ensure the FK constraint on created_by exists.
-- The previous migration (20260208000003) used ADD COLUMN IF NOT EXISTS,
-- which is a no-op when the column already exists, so the FK was never created.

ALTER TABLE writer_engagements
  DROP CONSTRAINT IF EXISTS writer_engagements_created_by_fkey;

ALTER TABLE writer_engagements
  ADD CONSTRAINT writer_engagements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
