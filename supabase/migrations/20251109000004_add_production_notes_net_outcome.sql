-- Add Production Optimization Notes and Net Outcome to detailed_one_liners table

ALTER TABLE detailed_one_liners
  ADD COLUMN IF NOT EXISTS production_optimization_notes TEXT,
  ADD COLUMN IF NOT EXISTS net_outcome TEXT;

-- Add comments
COMMENT ON COLUMN detailed_one_liners.production_optimization_notes IS 'Production optimization notes for the detailed one-liner';
COMMENT ON COLUMN detailed_one_liners.net_outcome IS 'Net outcome description for the detailed one-liner';
