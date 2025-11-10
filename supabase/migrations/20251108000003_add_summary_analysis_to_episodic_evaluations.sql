-- Add summary/analysis section to episodic evaluations
-- This allows evaluators to provide written analysis before scoring

-- Add summary_analysis column to episodic_evaluations table
ALTER TABLE episodic_evaluations
  ADD COLUMN IF NOT EXISTS summary_analysis TEXT;

-- Add comment explaining the purpose of this field
COMMENT ON COLUMN episodic_evaluations.summary_analysis IS 'Free-form text field for evaluator to provide summary and analysis of the episode before providing numerical scores';
