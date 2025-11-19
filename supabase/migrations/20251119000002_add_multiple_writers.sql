-- Create junction table for multiple writers per call report
-- Each writer can have individual contact information
CREATE TABLE call_report_writers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,
  writer_id UUID NOT NULL REFERENCES writers(id) ON DELETE RESTRICT,
  writer_email TEXT,
  writer_phone TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(call_report_id, writer_id)
);

-- Create indexes for performance
CREATE INDEX idx_call_report_writers_call_report_id ON call_report_writers(call_report_id);
CREATE INDEX idx_call_report_writers_writer_id ON call_report_writers(writer_id);

-- Add comments for documentation
COMMENT ON TABLE call_report_writers IS 'Junction table for multiple writers per call report with individual contact information';
COMMENT ON COLUMN call_report_writers.writer_email IS 'Optional email specific to this writer for this project';
COMMENT ON COLUMN call_report_writers.writer_phone IS 'Optional phone specific to this writer for this project';
COMMENT ON COLUMN call_report_writers.display_order IS 'Order in which writers should be displayed (0-based)';

-- Enable Row Level Security
ALTER TABLE call_report_writers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view all call report writers
CREATE POLICY "Users can view call report writers"
  ON call_report_writers
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to insert call report writers
CREATE POLICY "Users can insert call report writers"
  ON call_report_writers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update call report writers
CREATE POLICY "Users can update call report writers"
  ON call_report_writers
  FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policy: Allow authenticated users to delete call report writers
CREATE POLICY "Users can delete call report writers"
  ON call_report_writers
  FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_report_writers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_call_report_writers_updated_at
  BEFORE UPDATE ON call_report_writers
  FOR EACH ROW
  EXECUTE FUNCTION update_call_report_writers_updated_at();
