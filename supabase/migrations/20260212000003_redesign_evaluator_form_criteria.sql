-- Redesign evaluator_forms: replace old criteria with new ones
-- New criteria: Conflict of Content, Characterization, Story Progression,
-- What Next Element, Overall Oneliner Grade
-- Each criterion gets a _comment column for inline feedback
-- Plus a new Descriptive Evaluation section

-- ============================================================
-- 1. Add new score columns (keep old ones for historical data)
-- ============================================================
ALTER TABLE public.evaluator_forms
  ADD COLUMN IF NOT EXISTS conflict_of_content_score INT,
  ADD COLUMN IF NOT EXISTS characterization_score INT,
  ADD COLUMN IF NOT EXISTS story_progression_score INT,
  ADD COLUMN IF NOT EXISTS whats_next_element_score INT,
  ADD COLUMN IF NOT EXISTS overall_oneliner_grade_score INT;

-- ============================================================
-- 2. Add per-criterion comment columns
-- ============================================================
ALTER TABLE public.evaluator_forms
  ADD COLUMN IF NOT EXISTS conflict_of_content_comment TEXT,
  ADD COLUMN IF NOT EXISTS characterization_comment TEXT,
  ADD COLUMN IF NOT EXISTS story_progression_comment TEXT,
  ADD COLUMN IF NOT EXISTS whats_next_element_comment TEXT,
  ADD COLUMN IF NOT EXISTS overall_oneliner_grade_comment TEXT;

-- ============================================================
-- 3. Add Descriptive Evaluation columns
-- ============================================================
ALTER TABLE public.evaluator_forms
  ADD COLUMN IF NOT EXISTS themes_of_drama JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS corresponding_dramas JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_category TEXT,
  ADD COLUMN IF NOT EXISTS no_of_tracks INT,
  ADD COLUMN IF NOT EXISTS closing_remarks TEXT;

-- ============================================================
-- 4. Update the average score trigger to use new 5 criteria
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_evaluation_average()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate average from the 5 NEW criteria if they are present
  -- Fall back to old criteria if new ones are all null (backward compat)
  IF NEW.conflict_of_content_score IS NOT NULL
     AND NEW.characterization_score IS NOT NULL
     AND NEW.story_progression_score IS NOT NULL
     AND NEW.whats_next_element_score IS NOT NULL
     AND NEW.overall_oneliner_grade_score IS NOT NULL THEN
    NEW.average_score := ROUND(
      (NEW.conflict_of_content_score +
       NEW.characterization_score +
       NEW.story_progression_score +
       NEW.whats_next_element_score +
       NEW.overall_oneliner_grade_score)::NUMERIC / 5, 2
    );
  ELSIF NEW.premise_conflict_score IS NOT NULL
        AND NEW.storyline_plot_score IS NOT NULL
        AND NEW.episodic_progression_score IS NOT NULL
        AND NEW.characters_score IS NOT NULL
        AND NEW.overall_assessment_score IS NOT NULL THEN
    NEW.average_score := ROUND(
      (NEW.premise_conflict_score +
       NEW.storyline_plot_score +
       NEW.episodic_progression_score +
       NEW.characters_score +
       NEW.overall_assessment_score)::NUMERIC / 5, 2
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is in place (idempotent)
DROP TRIGGER IF EXISTS trg_calculate_evaluation_average ON evaluator_forms;
CREATE TRIGGER trg_calculate_evaluation_average
  BEFORE INSERT OR UPDATE ON evaluator_forms
  FOR EACH ROW
  EXECUTE FUNCTION calculate_evaluation_average();

-- ============================================================
-- 5. Add CHECK constraint for theme_category
-- ============================================================
ALTER TABLE public.evaluator_forms
  DROP CONSTRAINT IF EXISTS evaluator_forms_theme_category_check;
ALTER TABLE public.evaluator_forms
  ADD CONSTRAINT evaluator_forms_theme_category_check
  CHECK (theme_category IS NULL OR theme_category IN ('commercial', 'non_commercial', 'commercial_edge'));

-- ============================================================
-- 6. Comments on new columns
-- ============================================================
COMMENT ON COLUMN public.evaluator_forms.conflict_of_content_score IS 'New criterion: Conflict of Content (1-10)';
COMMENT ON COLUMN public.evaluator_forms.characterization_score IS 'New criterion: Characterization (1-10)';
COMMENT ON COLUMN public.evaluator_forms.story_progression_score IS 'New criterion: Story Progression (1-10)';
COMMENT ON COLUMN public.evaluator_forms.whats_next_element_score IS 'New criterion: What Next Element (1-10)';
COMMENT ON COLUMN public.evaluator_forms.overall_oneliner_grade_score IS 'New criterion: Overall Oneliner Grade (1-10)';
COMMENT ON COLUMN public.evaluator_forms.themes_of_drama IS 'Array of theme strings for this drama';
COMMENT ON COLUMN public.evaluator_forms.corresponding_dramas IS 'Array of previously aired drama names';
COMMENT ON COLUMN public.evaluator_forms.theme_category IS 'commercial | non_commercial | commercial_edge';
COMMENT ON COLUMN public.evaluator_forms.no_of_tracks IS 'Number of tracks mentioned in the oneliner';
COMMENT ON COLUMN public.evaluator_forms.closing_remarks IS 'Evaluator closing remarks for descriptive evaluation';
