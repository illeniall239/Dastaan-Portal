-- Add first_2_eps_required column to evaluator_forms table

-- Add the new boolean column to the evaluator_forms table
ALTER TABLE evaluator_forms ADD COLUMN first_2_eps_required BOOLEAN DEFAULT FALSE;

-- Add comment to document the new column
COMMENT ON COLUMN evaluator_forms.first_2_eps_required IS 'Indicates whether the first 2 episodes are required for this evaluation';