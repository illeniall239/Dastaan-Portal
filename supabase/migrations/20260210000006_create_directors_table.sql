-- Create directors table (mirrors writers table structure)
CREATE TABLE IF NOT EXISTS directors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE directors ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read active directors
CREATE POLICY "Anyone can view active directors"
  ON directors
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Policy: Anyone authenticated can insert directors
CREATE POLICY "Anyone can insert directors"
  ON directors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Anyone authenticated can update directors
CREATE POLICY "Anyone can update directors"
  ON directors
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Only admins can delete directors
CREATE POLICY "Only admins can delete directors"
  ON directors
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Seed director names from Excel
INSERT INTO directors (name) VALUES
  ('Aabis Raza'),
  ('Aamir Yousuf'),
  ('Aayan Hussain'),
  ('Abdul Ahad'),
  ('Abdul Khaliq Khan'),
  ('Abdullah Badini'),
  ('Abid Raheem'),
  ('Adeel Qamar Khan'),
  ('Adeel Siddiqui'),
  ('Adnan Sarwar'),
  ('Adnan Wai Qureshi'),
  ('Aehsun Talish'),
  ('Ahmad Ali Qazi'),
  ('Ahmad Hassan'),
  ('Ahmed Bhatti'),
  ('Ahmer Sohail'),
  ('Ali Akbar'),
  ('Ali Faizan Anchan'),
  ('Ali Farhan Anchan'),
  ('Ali Hassan'),
  ('Ali Masud Saeed'),
  ('Amin Iqbal'),
  ('Amjad Hussain Khan'),
  ('Amna Nawaz Khan'),
  ('Angeline Malik'),
  ('Anjum Shahzad'),
  ('Aqeel Saeed Tashi'),
  ('Asad Jabal'),
  ('Asad Mumtaz'),
  ('Asim Ali'),
  ('Atif Iqbal'),
  ('Atif Rathore'),
  ('Azeem Sajjad'),
  ('Bachal Kalhoro'),
  ('Badar Mehmood'),
  ('Barkat Sidiki'),
  ('Bilawal Hussain Abbasi'),
  ('Chaudhry Ali Hassan'),
  ('Danish Nawaz'),
  ('Dilawar Malik'),
  ('Emraan Kaleem Mallick'),
  ('Essa Khan'),
  ('Fahad Nur'),
  ('Fahim Burney'),
  ('Faisal Mehmood Khan'),
  ('Faisal Omer Turk'),
  ('Faiz'),
  ('Faizan Sheikh'),
  ('Fajr Raza'),
  ('Farooq Rind'),
  ('Furqan Adam'),
  ('Furqan Khan'),
  ('Furqan T. Siddiqui'),
  ('Haissam Hussain'),
  ('Haseeb Ali'),
  ('Haseeb Hassan'),
  ('Hisham Syed'),
  ('Ilyas Kashmiri'),
  ('Imran Baig'),
  ('Iqbal Hussain'),
  ('Irfan Aslam'),
  ('Irshad Ali'),
  ('Jasim Abbas'),
  ('Kamran Akbar Khan'),
  ('Kashif Ahmed Butt'),
  ('Kashif Butt'),
  ('Kashif Jaffery'),
  ('Kashif Nisar'),
  ('Kashif Saleem'),
  ('Kashif Zaman'),
  ('Khalid Malik KD'),
  ('Khizer Idrees'),
  ('Khurram Walter'),
  ('M. Danish Behlim'),
  ('M.Danish Behlim'),
  ('Marina Khan'),
  ('Mazhar Moin'),
  ('Meer Sikandar'),
  ('Mehreen Jabbar'),
  ('Misbah Khalid'),
  ('Misbah Syed'),
  ('Mohammad Adeel Qamar'),
  ('Mohammad Musawir Khan'),
  ('Mohammad Saqib Khan'),
  ('Mohammed Ehteshamuddin'),
  ('Mohsin Ali'),
  ('Mohsin Mirza'),
  ('Mohsin Talat'),
  ('Muhammad Adeel Siddiqui'),
  ('Muhammad Ashar Asghar'),
  ('Muhammad Iftikhar Iffi'),
  ('Mussaddiq Malek'),
  ('Nadeem Baig'),
  ('Nadeem Siddiqui'),
  ('Nain Maniar'),
  ('Najaf Bilgrami'),
  ('Nasir Wali'),
  ('Naveed Ali Khan'),
  ('Naveed Jaffri'),
  ('Omar Khan'),
  ('Omer Ikram'),
  ('Owais Khan'),
  ('Parmesha Adiwal'),
  ('Qasim Ali Mureed'),
  ('Raja Shahid Ali'),
  ('Ramish Rizvi'),
  ('Rana Rizwan'),
  ('Rao Ayaz Shehzad'),
  ('Rubina Ashraf'),
  ('Saba Hamid'),
  ('Sabeeh Ahmad'),
  ('Saife Hassan'),
  ('Saima Waseem'),
  ('Sajid Kashmiri'),
  ('Saleem Ghanchi'),
  ('Salman Abbas'),
  ('Salman Sirhindi'),
  ('Sami Sani'),
  ('Saqib Zafar Khan'),
  ('Sarmad Sultan Khoosat'),
  ('Shafqat Moinuddin'),
  ('Shah Hussain'),
  ('Shahid Aziz'),
  ('Shahid Shafaat'),
  ('Shahid Younus'),
  ('Shahood Alvi'),
  ('Shahzad Kashmiri'),
  ('Shamoon Abbasi'),
  ('Shaqielle Khan'),
  ('Shaquielle Khan'),
  ('Shehrazade Sheikh'),
  ('Shehzad Kashmiri'),
  ('Shehzad Rafique'),
  ('Siraj-ul-Haq'),
  ('Sohail Javed'),
  ('Syed Ahmad Kamran'),
  ('Syed Ali Bukhari'),
  ('Syed Ali Raza Osama'),
  ('Syed Ali Raza Usama'),
  ('Syed Aashan Abbas'),
  ('Syed Atif Hussain'),
  ('Syed Faisal Bukhari'),
  ('Syed Irshad Ali (Arshi)'),
  ('Syed Jari Khushnood Naqvi'),
  ('Syed Meesam Naqvi'),
  ('Syed Muhammad Khurram'),
  ('Syed Noman'),
  ('Syed Ramish Rizvi'),
  ('Syed Wahab Jafri'),
  ('Syed Wahb Jafri'),
  ('Syed Wajahat Hussain'),
  ('Syed Wajid Raza'),
  ('Syed Zeeshan Ali Zaidi'),
  ('Tabish Bin Tariq'),
  ('Tahseen Khan'),
  ('Tehseen Khan'),
  ('Wajahat Rauf'),
  ('Wajid Raza'),
  ('Waqar Ahmed'),
  ('Yasir Hussain'),
  ('Yasir Nawaz'),
  ('Yasra Rizvi'),
  ('Zahid Mehmood'),
  ('Zaib Chaudhary'),
  ('Zeeshan Ahmed')
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX idx_directors_name ON directors(name);
CREATE INDEX idx_directors_status ON directors(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_directors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_directors_updated_at
  BEFORE UPDATE ON directors
  FOR EACH ROW
  EXECUTE FUNCTION update_directors_updated_at();
