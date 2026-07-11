-- Add 'signature_commercial' to theme_category options

ALTER TABLE evaluator_forms DROP CONSTRAINT IF EXISTS evaluator_forms_theme_category_check;
ALTER TABLE evaluator_forms
  ADD CONSTRAINT evaluator_forms_theme_category_check
  CHECK (theme_category IS NULL OR theme_category IN ('commercial', 'non_commercial', 'commercial_edge', 'signature_commercial'));

COMMENT ON COLUMN evaluator_forms.theme_category IS 'commercial | non_commercial | commercial_edge | signature_commercial';
