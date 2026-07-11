-- Add audience focus field to evaluator forms
-- Options: male_centric, female_centric, both

ALTER TABLE evaluator_forms ADD COLUMN IF NOT EXISTS audience_focus TEXT;

ALTER TABLE evaluator_forms
  ADD CONSTRAINT evaluator_forms_audience_focus_check
  CHECK (audience_focus IS NULL OR audience_focus IN ('male_centric', 'female_centric', 'both'));

COMMENT ON COLUMN evaluator_forms.audience_focus IS 'male_centric | female_centric | both';
