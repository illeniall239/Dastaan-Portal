-- ============================================================================
-- Evaluations: only the Overall Grade is required (from now on)
--
-- For evaluations created from now on (one-liners and episodes):
--   * the Overall Grade is required — one-liner "Overall One-liner Grade"
--     (overall_oneliner_grade_score), episode "Overall Assessment" (overall_assessment_score);
--   * every other score is optional;
--   * the score used everywhere (average_score / overall_average) is the average of all criteria when
--     every one is filled, otherwise the Overall Grade on its own;
--   * there are no feedback-only evaluations any more.
--
-- Evaluations created before this migration keep exactly their old calculation, even if edited,
-- and old feedback-only evaluations stay as they are.
-- ============================================================================

-- When the new rule starts (the moment this migration runs)
DO $do$
BEGIN
  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.overall_grade_rule_since() RETURNS timestamptz
       LANGUAGE sql IMMUTABLE SET search_path = public AS %L',
    format('SELECT %L::timestamptz', now())
  );
END
$do$;

-- Episode scores other than the Overall Assessment become optional (one-liner ones already are)
ALTER TABLE public.episodic_evaluations
  ALTER COLUMN conflict_of_content_score DROP NOT NULL,
  ALTER COLUMN characterization_score DROP NOT NULL,
  ALTER COLUMN story_progression_score DROP NOT NULL,
  ALTER COLUMN freezes_score DROP NOT NULL,
  ALTER COLUMN whats_next_element_score DROP NOT NULL,
  ALTER COLUMN no_of_pages DROP NOT NULL,
  ALTER COLUMN no_of_scenes DROP NOT NULL;

-- ── Episodes ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_calculate_episodic_scores()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new boolean := COALESCE(NEW.created_at, now()) >= overall_grade_rule_since();
BEGIN
  IF v_new THEN
    NEW.is_feedback_only := false;  -- no feedback-only evaluations any more
    IF NEW.submitted_at IS NOT NULL AND NEW.overall_assessment_score IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'OVERALL_GRADE_REQUIRED: Give the episode an Overall Assessment (1-10).',
        HINT = 'overall_grade_required';
    END IF;
  END IF;

  -- Older feedback-only evaluations carry no scores
  IF NEW.is_feedback_only THEN
    NEW.overall_average := NULL;
    NEW.overall_grade := NULL;
    NEW.pages_score := NULL;
    NEW.scenes_score := NULL;
    RETURN NEW;
  END IF;

  NEW.pages_score := calculate_pages_score(NEW.no_of_pages);
  NEW.scenes_score := calculate_scenes_score(NEW.no_of_scenes);

  IF v_new AND (
       NEW.conflict_of_content_score IS NULL OR NEW.characterization_score IS NULL
    OR NEW.story_progression_score IS NULL OR NEW.main_event_score IS NULL
    OR NEW.small_event_score IS NULL OR NEW.dragness_score IS NULL
    OR NEW.freezes_score IS NULL OR NEW.whats_next_element_score IS NULL
    OR NEW.overall_assessment_score IS NULL) THEN
    -- Not every criterion filled: the Overall Assessment is the score
    NEW.overall_average := NEW.overall_assessment_score;
  ELSE
    -- All 9 criteria (and every older evaluation, as before). Dragness is reversed.
    NEW.overall_average := (
      COALESCE(NEW.conflict_of_content_score, 0) +
      COALESCE(NEW.characterization_score, 0) +
      COALESCE(NEW.story_progression_score, 0) +
      COALESCE(NEW.main_event_score, 0) +
      COALESCE(NEW.small_event_score, 0) +
      (11 - COALESCE(NEW.dragness_score, 6)) +
      COALESCE(NEW.freezes_score, 0) +
      COALESCE(NEW.whats_next_element_score, 0) +
      COALESCE(NEW.overall_assessment_score, 0)
    )::DECIMAL / 9.0;
  END IF;

  NEW.overall_grade := calculate_grade(NEW.overall_average);
  RETURN NEW;
END;
$$;

-- ── One-liners ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_evaluation_average()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new boolean := COALESCE(NEW.created_at, now()) >= overall_grade_rule_since();
BEGIN
  IF v_new AND NEW.submitted_at IS NOT NULL AND NEW.overall_oneliner_grade_score IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'OVERALL_GRADE_REQUIRED: Give the one-liner an Overall One-liner Grade (1-10).',
      HINT = 'overall_grade_required';
  END IF;

  IF NEW.conflict_of_content_score IS NOT NULL
     AND NEW.characterization_score IS NOT NULL
     AND NEW.story_progression_score IS NOT NULL
     AND NEW.whats_next_element_score IS NOT NULL
     AND NEW.overall_oneliner_grade_score IS NOT NULL THEN
    -- All 5 criteria
    NEW.average_score := ROUND(
      (NEW.conflict_of_content_score +
       NEW.characterization_score +
       NEW.story_progression_score +
       NEW.whats_next_element_score +
       NEW.overall_oneliner_grade_score)::NUMERIC / 5, 2
    );
  ELSIF v_new AND NEW.overall_oneliner_grade_score IS NOT NULL THEN
    -- Not every criterion filled: the Overall One-liner Grade is the score
    NEW.average_score := NEW.overall_oneliner_grade_score;
  ELSIF NEW.premise_conflict_score IS NOT NULL
        AND NEW.storyline_plot_score IS NOT NULL
        AND NEW.episodic_progression_score IS NOT NULL
        AND NEW.characters_score IS NOT NULL
        AND NEW.overall_assessment_score IS NOT NULL THEN
    -- Old criteria (backward compat)
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
$$;

-- Check: when the new rule starts
SELECT public.overall_grade_rule_since() AS overall_grade_rule_since;
