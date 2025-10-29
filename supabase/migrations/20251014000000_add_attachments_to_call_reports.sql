-- Add attachments functionality to call reports
-- This follows the existing pattern with the main attachments table

-- The attachments table already exists, but we need to ensure that call reports can have attachments
-- We'll add a reference from call reports to the attachments table

-- Add a column to track attachment IDs (optional approach)
-- However, since the attachments table already has entity_type and entity_id, 
-- we can just use those to link to call reports, which is better normalized

-- We can create a view or function to easily get attachments for a specific call report
-- The main logic will be handled in the application layer

-- For now, we just need to ensure the attachments table is properly configured for call reports
-- It already has the necessary columns (entity_type and entity_id)

-- Update call_reports table comment to indicate it supports attachments
COMMENT ON TABLE call_reports IS 'Records of call reports and meetings with writers/producers. Supports attachments via the attachments table.';

-- Create the attachments storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('attachments', 'attachments', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the attachments bucket
CREATE POLICY "Allow authenticated users to upload to attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Allow authenticated users to read attachments" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'attachments');

CREATE POLICY "Allow service role to manage attachments" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'attachments');

-- Allow users to update and delete their own attachments
CREATE POLICY "Allow users to modify their own attachments" ON storage.objects
FOR UPDATE TO authenticated
USING (auth.uid() = owner OR (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Allow users to delete their own attachments" ON storage.objects
FOR DELETE TO authenticated
USING (auth.uid() = owner OR (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin');