-- Writer Waadas (commitment periods) table
-- When a writer doesn't meet their original commitment, a new Waada is created
-- with potentially different commitment rates. Up to 4 waadas per writer-project.
CREATE TABLE IF NOT EXISTS writer_waadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  writer_commitment_id UUID NOT NULL REFERENCES writer_commitments(id) ON DELETE CASCADE,
  waada_number INTEGER NOT NULL CHECK (waada_number BETWEEN 1 AND 4),
  start_date DATE NOT NULL,
  end_date DATE,
  commitment_per_week DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(writer_commitment_id, waada_number)
);

CREATE INDEX idx_writer_waadas_commitment ON writer_waadas(writer_commitment_id);

-- Enable RLS
ALTER TABLE writer_waadas ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "writer_waadas_read" ON writer_waadas
  FOR SELECT TO authenticated USING (true);

-- All authenticated users can manage (same as writer_commitments)
CREATE POLICY "writer_waadas_write" ON writer_waadas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
