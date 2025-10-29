-- Add per_ep_price_range field and rename producer_name to target_writer
-- This migration updates the evaluator_forms table to better reflect the field purposes

-- Add per_ep_price_range field
ALTER TABLE evaluator_forms
  ADD COLUMN per_ep_price_range TEXT;

-- Rename producer_name to target_writer
ALTER TABLE evaluator_forms
  RENAME COLUMN producer_name TO target_writer;

COMMENT ON COLUMN evaluator_forms.per_ep_price_range IS 'Estimated price range per episode in Rs (e.g., "50000-100000", "100000-200000")';
COMMENT ON COLUMN evaluator_forms.target_writer IS 'Target writer for the project';
