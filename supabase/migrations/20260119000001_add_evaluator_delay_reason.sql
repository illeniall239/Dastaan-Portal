-- Migration: Add delay tracking fields to evaluator_forms table
-- Purpose: Track when evaluations are submitted late (> 3 days after call report creation)
-- and require a reason for the delay

-- Add delay tracking fields to evaluator_forms table
ALTER TABLE evaluator_forms
ADD COLUMN is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN delay_reason TEXT;

-- Add comments explaining the columns
COMMENT ON COLUMN evaluator_forms.is_late IS
'True if evaluation was submitted more than 3 days after call report creation';

COMMENT ON COLUMN evaluator_forms.delay_reason IS
'Required explanation when is_late is true - evaluator must provide reason for delay';

-- Create index for efficient queries on late evaluations
CREATE INDEX idx_evaluator_forms_is_late ON evaluator_forms(is_late) WHERE is_late = TRUE;
