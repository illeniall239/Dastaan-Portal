-- =====================================================
-- Create Episodes Table
-- =====================================================
-- This migration creates a table for logging episodes
-- Episodes can be attached to call reports or stories at various workflow stages

-- =====================================================
-- Create episodes table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source reference (either call_report_id OR story_id)
  call_report_id UUID REFERENCES public.call_reports(id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,

  -- Episode details
  episode_number INT NOT NULL,
  title TEXT,

  -- File attachment
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT, -- MIME type: pdf, txt, ppt, docx, jpg, png

  -- Additional information
  additional_info TEXT,

  -- Metadata
  logged_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure at least one source is provided
  CONSTRAINT episode_has_source CHECK (
    (call_report_id IS NOT NULL AND story_id IS NULL) OR
    (call_report_id IS NULL AND story_id IS NOT NULL)
  ),

  -- Ensure episode number is positive
  CONSTRAINT positive_episode_number CHECK (episode_number > 0)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX idx_episodes_call_report ON public.episodes(call_report_id);
CREATE INDEX idx_episodes_story ON public.episodes(story_id);
CREATE INDEX idx_episodes_logged_by ON public.episodes(logged_by);
CREATE INDEX idx_episodes_created_at ON public.episodes(created_at DESC);

-- Composite index for finding episodes by source and number
CREATE INDEX idx_episodes_call_report_number ON public.episodes(call_report_id, episode_number);
CREATE INDEX idx_episodes_story_number ON public.episodes(story_id, episode_number);

-- =====================================================
-- Update Timestamp Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_episodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER episodes_updated_at
  BEFORE UPDATE ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_episodes_updated_at();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Content creators, managers, and evaluators can view episodes
CREATE POLICY "Content users and evaluators can view episodes"
  ON public.episodes FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'executive', 'admin')
  );

-- Content creators, managers, and evaluators can create episodes
CREATE POLICY "Content users and evaluators can create episodes"
  ON public.episodes FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'admin') AND
    logged_by = auth.uid()
  );

-- Users can update their own episodes, managers can update all
CREATE POLICY "Users can update episodes"
  ON public.episodes FOR UPDATE
  TO authenticated
  USING (
    logged_by = auth.uid() OR
    get_user_role() IN ('content_manager', 'admin')
  );

-- Users can delete their own episodes, managers can delete all
CREATE POLICY "Users can delete episodes"
  ON public.episodes FOR DELETE
  TO authenticated
  USING (
    logged_by = auth.uid() OR
    get_user_role() IN ('content_manager', 'admin')
  );

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON TABLE public.episodes IS
'Stores episode logs with attachments and additional information. Episodes can be linked to call reports or stories at various workflow stages.';

COMMENT ON COLUMN public.episodes.call_report_id IS
'Reference to call report if episode is logged at that stage';

COMMENT ON COLUMN public.episodes.story_id IS
'Reference to story if episode is logged at scripting or other stages';

COMMENT ON COLUMN public.episodes.episode_number IS
'Episode sequence number (must be positive)';

COMMENT ON COLUMN public.episodes.title IS
'Optional episode title';

COMMENT ON COLUMN public.episodes.attachment_url IS
'URL to uploaded file in Supabase storage';

COMMENT ON COLUMN public.episodes.attachment_type IS
'MIME type of attachment: pdf, txt, ppt, pptx, docx, jpg, png';

COMMENT ON COLUMN public.episodes.additional_info IS
'Free text area for additional notes and information about the episode';

-- =====================================================
-- Create Storage Bucket (SQL command for reference)
-- =====================================================
-- Note: This may need to be run separately in Supabase Dashboard Storage section
-- Or via Supabase JavaScript client

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('episodes', 'episodes', false);

-- Storage policies will be created separately via Dashboard
