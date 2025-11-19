-- Create writers table
CREATE TABLE IF NOT EXISTS writers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE writers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read active writers
CREATE POLICY "Anyone can view active writers"
  ON writers
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Policy: Anyone authenticated can insert writers
CREATE POLICY "Anyone can insert writers"
  ON writers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Anyone authenticated can update writers
CREATE POLICY "Anyone can update writers"
  ON writers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Only admins can delete writers (soft delete via status update)
CREATE POLICY "Only admins can delete writers"
  ON writers
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Import 79 writers from Excel file
INSERT INTO writers (name) VALUES
  ('Khalil-ur-Rehman Qamar'),
  ('Qaisera Hayat'),
  ('Misbah Nousheen'),
  ('Sameena Aijaz'),
  ('Huma Hina Nafees'),
  ('Sadia Akhtar'),
  ('Mustafa Afridi'),
  ('Sarwat Nazir'),
  ('Naila Ansari'),
  ('Adeel Razzaq'),
  ('Ali Moeen'),
  ('Maha Malik'),
  ('Nuzhat Saman'),
  ('Humera Safdar'),
  ('Shabnam Sani'),
  ('Shakeel Arsalan'),
  ('Iqbal Bano'),
  ('Sidra Seher Imran'),
  ('Asma Nabeel'),
  ('Meral Okay'),
  ('Mehrunnisa Mustaqeem Khan'),
  ('Irfan Ahmed Shams'),
  ('Jahanzeb Qamar'),
  ('Misbah Ali Syed'),
  ('Syed Ameer Ali Shah Hussaini'),
  ('Maimoona Aziz'),
  ('Umera Ahmed'),
  ('Hashim Nadeem'),
  ('Shafia Khan'),
  ('Samira Fazal'),
  ('Zanjabeel Asim Shah'),
  ('Seema Sheikh'),
  ('Saira Raza'),
  ('Soofia Khurram'),
  ('Ghazala Naqvi'),
  ('Rehana Aftab'),
  ('Rukhsana Nigar'),
  ('Dilawar Khan'),
  ('Athar Ansari'),
  ('Rizwan Ahmed'),
  ('Raheel Ahmed'),
  ('Haniya Javed'),
  ('Hassaan Imam'),
  ('Saima Akram Chaudhry'),
  ('Samra Bukhari'),
  ('Nooran Makhdoom'),
  ('Asma Sayani'),
  ('Radain Shah'),
  ('Imran Nazir'),
  ('Nadia Ahmed'),
  ('Aliya Makhdoom'),
  ('Nadia Akhtar'),
  ('Seema Munaf'),
  ('Erum Wasi'),
  ('Doorway Entertainment'),
  ('Madiha Shahid'),
  ('Abdul Khaliq Khan'),
  ('Sana Fahad'),
  ('Rida Bilal'),
  ('Mansoor Ahmed Khan'),
  ('Tahir Nazeer'),
  ('Mehak Nawab'),
  ('Agha Hasan Imtisal'),
  ('Mehmood Elahi'),
  ('Shahid Nizami'),
  ('Ali Sikander'),
  ('Zafar Mairaj'),
  ('Farhat Ishtiaq'),
  ('Jahangir Hussain'),
  ('Saqlain Abbas'),
  ('Saqib Ali Rana'),
  ('Sanam Mehdi Jarchevi'),
  ('Rabia Razzaque'),
  ('Rubina Kabir Khan'),
  ('Zeeshan Junaid'),
  ('Rehan Zaheer Siddiqui'),
  ('Sameena Nazir'),
  ('Zahid Ashfaq Zaki'),
  ('Javeria Saud')
ON CONFLICT (name) DO NOTHING;

-- Create index for faster name lookups
CREATE INDEX idx_writers_name ON writers(name);
CREATE INDEX idx_writers_status ON writers(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_writers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_writers_updated_at
  BEFORE UPDATE ON writers
  FOR EACH ROW
  EXECUTE FUNCTION update_writers_updated_at();
