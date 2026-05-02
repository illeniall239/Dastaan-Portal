-- Allow decimal scores (e.g. 7.6, 5.5) across all evaluation forms
-- Changes score columns from INT to NUMERIC(4,1) in episodic_evaluations,
-- evaluator_forms, and episodes tables.
-- The existing BETWEEN 1 AND 10 range is preserved — it works with NUMERIC.

-- ============================================================
-- TABLE: episodic_evaluations — 9 user-entered score columns
-- ============================================================

-- Drop existing CHECK constraints before altering column types
ALTER TABLE episodic_evaluations
  DROP CONSTRAINT IF EXISTS episodic_evaluations_conflict_of_content_score_check,
  DROP CONSTRAINT IF EXISTS episodic_evaluations_characterization_score_check,
  DROP CONSTRAINT IF EXISTS episodic_evaluations_story_progression_score_check,
  DROP CONSTRAINT IF EXISTS episodic_evaluations_main_event_score_check,
  DROP CONSTRAINT IF EXISTS episodic_evaluations_small_event_score_check,
  DROP CONSTRAINT IF EXISTS episodic_evaluations_dragness_score_check,
  DROP CONSTRAINT IF EXISTS episodic_evaluations_freezes_score_check,
  DROP CONSTRAINT IF EXISTS episodic_evaluations_whats_next_element_score_check,
  DROP CONSTRAINT IF EXISTS episodic_evaluations_overall_assessment_score_check;

-- Change column types to NUMERIC(4,1) — supports values like 7.6, 10.0
ALTER TABLE episodic_evaluations
  ALTER COLUMN conflict_of_content_score TYPE NUMERIC(4,1),
  ALTER COLUMN characterization_score TYPE NUMERIC(4,1),
  ALTER COLUMN story_progression_score TYPE NUMERIC(4,1),
  ALTER COLUMN main_event_score TYPE NUMERIC(4,1),
  ALTER COLUMN small_event_score TYPE NUMERIC(4,1),
  ALTER COLUMN dragness_score TYPE NUMERIC(4,1),
  ALTER COLUMN freezes_score TYPE NUMERIC(4,1),
  ALTER COLUMN whats_next_element_score TYPE NUMERIC(4,1),
  ALTER COLUMN overall_assessment_score TYPE NUMERIC(4,1);

-- Re-add CHECK constraints
ALTER TABLE episodic_evaluations
  ADD CONSTRAINT episodic_evaluations_conflict_of_content_score_check CHECK (conflict_of_content_score BETWEEN 1 AND 10),
  ADD CONSTRAINT episodic_evaluations_characterization_score_check CHECK (characterization_score BETWEEN 1 AND 10),
  ADD CONSTRAINT episodic_evaluations_story_progression_score_check CHECK (story_progression_score BETWEEN 1 AND 10),
  ADD CONSTRAINT episodic_evaluations_main_event_score_check CHECK (main_event_score BETWEEN 1 AND 10),
  ADD CONSTRAINT episodic_evaluations_small_event_score_check CHECK (small_event_score BETWEEN 1 AND 10),
  ADD CONSTRAINT episodic_evaluations_dragness_score_check CHECK (dragness_score BETWEEN 1 AND 10),
  ADD CONSTRAINT episodic_evaluations_freezes_score_check CHECK (freezes_score BETWEEN 1 AND 10),
  ADD CONSTRAINT episodic_evaluations_whats_next_element_score_check CHECK (whats_next_element_score BETWEEN 1 AND 10),
  ADD CONSTRAINT episodic_evaluations_overall_assessment_score_check CHECK (overall_assessment_score BETWEEN 1 AND 10);

-- ============================================================
-- TABLE: evaluator_forms — 5 new-criteria + 5 old-criteria
-- ============================================================

ALTER TABLE evaluator_forms
  DROP CONSTRAINT IF EXISTS evaluator_forms_conflict_of_content_score_check,
  DROP CONSTRAINT IF EXISTS evaluator_forms_characterization_score_check,
  DROP CONSTRAINT IF EXISTS evaluator_forms_story_progression_score_check,
  DROP CONSTRAINT IF EXISTS evaluator_forms_whats_next_element_score_check,
  DROP CONSTRAINT IF EXISTS evaluator_forms_overall_oneliner_grade_score_check,
  DROP CONSTRAINT IF EXISTS evaluator_forms_premise_conflict_score_check,
  DROP CONSTRAINT IF EXISTS evaluator_forms_storyline_plot_score_check,
  DROP CONSTRAINT IF EXISTS evaluator_forms_episodic_progression_score_check,
  DROP CONSTRAINT IF EXISTS evaluator_forms_characters_score_check,
  DROP CONSTRAINT IF EXISTS evaluator_forms_overall_assessment_score_check;

ALTER TABLE evaluator_forms
  ALTER COLUMN conflict_of_content_score TYPE NUMERIC(4,1),
  ALTER COLUMN characterization_score TYPE NUMERIC(4,1),
  ALTER COLUMN story_progression_score TYPE NUMERIC(4,1),
  ALTER COLUMN whats_next_element_score TYPE NUMERIC(4,1),
  ALTER COLUMN overall_oneliner_grade_score TYPE NUMERIC(4,1),
  ALTER COLUMN premise_conflict_score TYPE NUMERIC(4,1),
  ALTER COLUMN storyline_plot_score TYPE NUMERIC(4,1),
  ALTER COLUMN episodic_progression_score TYPE NUMERIC(4,1),
  ALTER COLUMN characters_score TYPE NUMERIC(4,1),
  ALTER COLUMN overall_assessment_score TYPE NUMERIC(4,1);

ALTER TABLE evaluator_forms
  ADD CONSTRAINT evaluator_forms_conflict_of_content_score_check CHECK (conflict_of_content_score BETWEEN 1 AND 10),
  ADD CONSTRAINT evaluator_forms_characterization_score_check CHECK (characterization_score BETWEEN 1 AND 10),
  ADD CONSTRAINT evaluator_forms_story_progression_score_check CHECK (story_progression_score BETWEEN 1 AND 10),
  ADD CONSTRAINT evaluator_forms_whats_next_element_score_check CHECK (whats_next_element_score BETWEEN 1 AND 10),
  ADD CONSTRAINT evaluator_forms_overall_oneliner_grade_score_check CHECK (overall_oneliner_grade_score BETWEEN 1 AND 10),
  ADD CONSTRAINT evaluator_forms_premise_conflict_score_check CHECK (premise_conflict_score BETWEEN 1 AND 10),
  ADD CONSTRAINT evaluator_forms_storyline_plot_score_check CHECK (storyline_plot_score BETWEEN 1 AND 10),
  ADD CONSTRAINT evaluator_forms_episodic_progression_score_check CHECK (episodic_progression_score BETWEEN 1 AND 10),
  ADD CONSTRAINT evaluator_forms_characters_score_check CHECK (characters_score BETWEEN 1 AND 10),
  ADD CONSTRAINT evaluator_forms_overall_assessment_score_check CHECK (overall_assessment_score BETWEEN 1 AND 10);

-- ============================================================
-- TABLE: episodes — initial_assessment column
-- ============================================================

ALTER TABLE episodes
  ALTER COLUMN initial_assessment TYPE NUMERIC(4,1);
