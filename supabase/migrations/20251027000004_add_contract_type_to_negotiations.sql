-- =====================================================
-- Add Contract Type to Negotiations
-- =====================================================
-- Adds contract_type field to specify Net or Gross
-- =====================================================

BEGIN;

-- Add contract type column to negotiations table
ALTER TABLE negotiations
ADD COLUMN IF NOT EXISTS contract_type TEXT CHECK (
  contract_type IN ('net', 'gross')
);

-- Add comment explaining contract type
COMMENT ON COLUMN negotiations.contract_type IS
'Contract calculation basis: net (expenses deducted) or gross (full amount)';

COMMIT;

