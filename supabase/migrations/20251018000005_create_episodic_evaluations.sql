-- =====================================================
-- Create Episodic Evaluations Table
-- =====================================================
-- This migration creates a table for episodic evaluations
-- Evaluators can score individual episodes on multiple criteria

-- =====================================================
-- Create episodic_evaluations table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.episodic_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Episode Details
  no_of_pages INT NOT NULL CHECK (no_of_pages > 0),
  no_of_scenes INT NOT NULL CHECK (no_of_scenes > 0),
  pages_score INT NOT NULL, -- Auto-calculated: +5 if >=45, -5 if <45
  scenes_score INT NOT NULL, -- Auto-calculated: +5 if >=22, -5 if <22
  events JSONB DEFAULT '[]'::jsonb, -- Array of event descriptions

  -- Evaluation Scores (1-10 scale)
  conflict_of_content_score INT NOT NULL CHECK (conflict_of_content_score BETWEEN 1 AND 10),
  characterization_score INT NOT NULL CHECK (characterization_score BETWEEN 1 AND 10),
  story_progression_score INT NOT NULL CHECK (story_progression_score BETWEEN 1 AND 10),
  freezes_score INT NOT NULL CHECK (freezes_score BETWEEN 1 AND 10),
  whats_next_element_score INT NOT NULL CHECK (whats_next_element_score BETWEEN 1 AND 10),

  -- Calculated Fields
  overall_average DECIMAL(3,2) NOT NULL, -- Average of 5 scores
  overall_grade TEXT NOT NULL CHECK (overall_grade IN ('C', 'B', 'B+', 'A', 'A+')),

  -- Metadata
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one evaluation per evaluator per episode
  CONSTRAINT unique_evaluator_episode UNIQUE (episode_id, evaluator_id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX idx_episodic_eval_episode ON public.episodic_evaluations(episode_id);
CREATE INDEX idx_episodic_eval_evaluator ON public.episodic_evaluations(evaluator_id);
CREATE INDEX idx_episodic_eval_submitted ON public.episodic_evaluations(submitted_at DESC);

-- =====================================================
-- Functions for Auto-Calculation
-- =====================================================

-- Function to calculate pages score
CREATE OR REPLACE FUNCTION calculate_pages_score(pages INT)
RETURNS INT AS $$
BEGIN
  IF pages >= 45 THEN
    RETURN 5;
  ELSE
    RETURN -5;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate scenes score
CREATE OR REPLACE FUNCTION calculate_scenes_score(scenes INT)
RETURNS INT AS $$
BEGIN
  IF scenes >= 22 THEN
    RETURN 5;
  ELSE
    RETURN -5;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate grade from score
CREATE OR REPLACE FUNCTION calculate_grade(score DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF score >= 9 THEN
    RETURN 'A+';
  ELSIF score >= 7 THEN
    RETURN 'A';
  ELSIF score >= 6 THEN
    RETURN 'B+';
  ELSIF score >= 5 THEN
    RETURN 'B';
  ELSE
    RETURN 'C';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Trigger to Auto-Calculate Scores Before Insert
-- =====================================================
CREATE OR REPLACE FUNCTION auto_calculate_episodic_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate pages and scenes scores
  NEW.pages_score := calculate_pages_score(NEW.no_of_pages);
  NEW.scenes_score := calculate_scenes_score(NEW.no_of_scenes);

  -- Calculate overall average
  NEW.overall_average := (
    NEW.conflict_of_content_score +
    NEW.characterization_score +
    NEW.story_progression_score +
    NEW.freezes_score +
    NEW.whats_next_element_score
  )::DECIMAL / 5.0;

  -- Calculate overall grade
  NEW.overall_grade := calculate_grade(NEW.overall_average);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_episodic_scores
  BEFORE INSERT OR UPDATE ON public.episodic_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_episodic_scores();

-- =====================================================
-- Update Timestamp Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_episodic_eval_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER episodic_eval_updated_at
  BEFORE UPDATE ON public.episodic_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_episodic_eval_updated_at();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================
ALTER TABLE public.episodic_evaluations ENABLE ROW LEVEL SECURITY;

-- Evaluators can view only their own evaluations
CREATE POLICY "Evaluators can view own evaluations"
  ON public.episodic_evaluations FOR SELECT
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() IN ('content_manager', 'admin')
  );

-- Evaluators can create evaluations
CREATE POLICY "Evaluators can create evaluations"
  ON public.episodic_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    evaluator_id = auth.uid() AND
    get_user_role() IN ('evaluator', 'admin')
  );

-- No updates allowed after submission (evaluations are immutable)
-- If needed, evaluators can delete and recreate
CREATE POLICY "No updates to episodic evaluations"
  ON public.episodic_evaluations FOR UPDATE
  TO authenticated
  USING (false);

-- Evaluators can delete their own evaluations (before final submission if needed)
CREATE POLICY "Evaluators can delete own evaluations"
  ON public.episodic_evaluations FOR DELETE
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() = 'admin'
  );

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON TABLE public.episodic_evaluations IS
'Stores episodic evaluations where evaluators score individual episodes on multiple criteria. One evaluation per evaluator per episode.';

COMMENT ON COLUMN public.episodic_evaluations.no_of_pages IS
'Number of pages in the episode script';

COMMENT ON COLUMN public.episodic_evaluations.no_of_scenes IS
'Number of scenes in the episode';

COMMENT ON COLUMN public.episodic_evaluations.pages_score IS
'Auto-calculated: +5 if pages >= 45, -5 if pages < 45';

COMMENT ON COLUMN public.episodic_evaluations.scenes_score IS
'Auto-calculated: +5 if scenes >= 22, -5 if scenes < 22';

COMMENT ON COLUMN public.episodic_evaluations.events IS
'JSON array of event descriptions for the episode';

COMMENT ON COLUMN public.episodic_evaluations.overall_average IS
'Average of all 5 evaluation scores (conflict, characterization, progression, freezes, whats_next)';

COMMENT ON COLUMN public.episodic_evaluations.overall_grade IS
'Grade based on overall_average: 1-4=C, 5=B, 6=B+, 7-8=A, 9-10=A+';
