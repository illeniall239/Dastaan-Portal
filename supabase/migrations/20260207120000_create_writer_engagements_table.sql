-- Create the writer_engagements table
CREATE TABLE IF NOT EXISTS writer_engagements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  writer_id UUID REFERENCES writers(id),
  date_engaged DATE NOT NULL,
  time_slot TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_writer_engagements_writer_id ON writer_engagements(writer_id);
CREATE INDEX IF NOT EXISTS idx_writer_engagements_date ON writer_engagements(date_engaged);
CREATE INDEX IF NOT EXISTS idx_writer_engagements_writer_date ON writer_engagements(writer_id, date_engaged);

-- Enable RLS
ALTER TABLE writer_engagements ENABLE ROW LEVEL SECURITY;

-- Create policy to allow insert for authenticated users
CREATE POLICY "Allow insert for authenticated users" ON writer_engagements
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create policy to allow read for authenticated users
CREATE POLICY "Allow read for authenticated users" ON writer_engagements
  FOR SELECT TO authenticated
  USING (true);

-- Create policy to allow update for authenticated users
CREATE POLICY "Allow update for authenticated users" ON writer_engagements
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy to allow delete for authenticated users
CREATE POLICY "Allow delete for authenticated users" ON writer_engagements
  FOR DELETE TO authenticated
  USING (true);