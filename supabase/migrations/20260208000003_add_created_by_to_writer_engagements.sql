-- Add created_by column to writer_engagements for tracking who created each engagement
-- References public.users so PostgREST can resolve the join
ALTER TABLE writer_engagements
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Create index for efficient lookups by creator
CREATE INDEX IF NOT EXISTS idx_writer_engagements_created_by ON writer_engagements(created_by);

-- Reload PostgREST schema cache so it picks up the new FK relationship
NOTIFY pgrst, 'reload schema';
