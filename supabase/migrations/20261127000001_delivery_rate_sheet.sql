-- Delivery Rate tab mirrors the content heads' sheet:
--   * up to 6 waadas per project (Parisa's sheet has Waada 5 and 6)
--   * the sheet's Contract Date / Deadline as text ("In Signing", "End of Aug"), shown in the
--     Delivery Rate tab only — writer_commitments' dates (used by Content Aging) are untouched.
-- delivery_rate_manual was created by hand on production; create it where it's missing (staging).

CREATE TABLE IF NOT EXISTS delivery_rate_manual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_commitment_id UUID NOT NULL UNIQUE REFERENCES writer_commitments(id) ON DELETE CASCADE,
  in_hand_eps INTEGER,
  standard_cpw NUMERIC,
  standard_total_committed NUMERIC,
  w1_eps_received INTEGER, w1_no_of_weeks NUMERIC,
  w2_eps_received INTEGER, w2_no_of_weeks NUMERIC,
  w3_eps_received INTEGER, w3_no_of_weeks NUMERIC,
  w4_eps_received INTEGER, w4_no_of_weeks NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE delivery_rate_manual
  ADD COLUMN IF NOT EXISTS w5_eps_received INTEGER,
  ADD COLUMN IF NOT EXISTS w5_no_of_weeks NUMERIC,
  ADD COLUMN IF NOT EXISTS w6_eps_received INTEGER,
  ADD COLUMN IF NOT EXISTS w6_no_of_weeks NUMERIC,
  ADD COLUMN IF NOT EXISTS contract_date_text TEXT,
  ADD COLUMN IF NOT EXISTS deadline_text TEXT;

-- The sheet has commitments like 0.65 or 1.88 per week; DECIMAL(3,1) would round them.
-- NUMERIC(5,2) matches production (no-op there) and widens the migration-created DECIMAL(3,1) elsewhere.
ALTER TABLE writer_waadas ALTER COLUMN commitment_per_week TYPE NUMERIC(5,2);

ALTER TABLE writer_waadas DROP CONSTRAINT IF EXISTS writer_waadas_waada_number_check;
ALTER TABLE writer_waadas ADD CONSTRAINT writer_waadas_waada_number_check CHECK (waada_number BETWEEN 1 AND 6);

NOTIFY pgrst, 'reload schema';
