-- Create external evaluation links table
-- This table stores shareable tokens for external evaluators
CREATE TABLE external_evaluation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('one_liner', 'episode')),
  content_id UUID NOT NULL,

  -- Link metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_submissions INT DEFAULT NULL, -- NULL means unlimited
  current_submissions INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Optional restrictions
  allowed_emails TEXT[], -- If specified, only these emails can submit
  notes TEXT, -- Internal notes about why link was created

  CONSTRAINT valid_max_submissions CHECK (max_submissions IS NULL OR max_submissions > 0),
  CONSTRAINT valid_current_submissions CHECK (current_submissions >= 0)
);

-- Create external evaluations table
-- This table stores anonymous evaluation submissions
CREATE TABLE external_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES external_evaluation_links(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('one_liner', 'episode')),
  content_id UUID NOT NULL,

  -- Evaluator information (optional)
  evaluator_name TEXT,
  evaluator_email TEXT,
  evaluator_organization TEXT,

  -- Evaluation data stored as JSONB for flexibility
  -- Structure depends on content_type:
  -- For episodes: {scores: {...}, events: [...], pages: N, scenes: N, ...}
  -- For one_liners: {decision: "...", notes: "...", ...}
  evaluation_data JSONB NOT NULL,

  -- Metadata for audit trail
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  -- Prevent duplicate submissions from same email (if email provided)
  CONSTRAINT unique_email_per_link UNIQUE NULLS NOT DISTINCT (link_id, evaluator_email)
);

-- Indexes for performance
CREATE INDEX idx_external_links_token ON external_evaluation_links(token);
CREATE INDEX idx_external_links_content ON external_evaluation_links(content_type, content_id);
CREATE INDEX idx_external_links_created_by ON external_evaluation_links(created_by);
CREATE INDEX idx_external_links_active ON external_evaluation_links(is_active) WHERE is_active = true;
CREATE INDEX idx_external_evals_link ON external_evaluations(link_id);
CREATE INDEX idx_external_evals_content ON external_evaluations(content_type, content_id);
CREATE INDEX idx_external_evals_submitted ON external_evaluations(submitted_at);

-- Function to increment submission count
CREATE OR REPLACE FUNCTION increment_external_link_submissions()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE external_evaluation_links
  SET current_submissions = current_submissions + 1
  WHERE id = NEW.link_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment submission count
CREATE TRIGGER trigger_increment_submissions
AFTER INSERT ON external_evaluations
FOR EACH ROW
EXECUTE FUNCTION increment_external_link_submissions();

-- Function to check if link is still valid
CREATE OR REPLACE FUNCTION is_external_link_valid(link_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  link_record RECORD;
BEGIN
  SELECT
    is_active,
    expires_at,
    max_submissions,
    current_submissions
  INTO link_record
  FROM external_evaluation_links
  WHERE token = link_token;

  -- Link doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if active
  IF NOT link_record.is_active THEN
    RETURN false;
  END IF;

  -- Check if expired
  IF link_record.expires_at < NOW() THEN
    RETURN false;
  END IF;

  -- Check if max submissions reached
  IF link_record.max_submissions IS NOT NULL
     AND link_record.current_submissions >= link_record.max_submissions THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security Policies

-- External evaluation links: Only management and admins can manage
ALTER TABLE external_evaluation_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can view all external links"
  ON external_evaluation_links
  FOR SELECT
  USING (
    get_user_role() IN ('admin', 'management', 'executive')
  );

CREATE POLICY "Management can create external links"
  ON external_evaluation_links
  FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'management', 'executive')
  );

CREATE POLICY "Management can update their own external links"
  ON external_evaluation_links
  FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'management', 'executive')
  );

CREATE POLICY "Management can delete their own external links"
  ON external_evaluation_links
  FOR DELETE
  USING (
    get_user_role() IN ('admin', 'management', 'executive')
    AND created_by = auth.uid()
  );

-- External evaluations: Management can view all, no RLS for public submission
ALTER TABLE external_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Management can view all external evaluations"
  ON external_evaluations
  FOR SELECT
  USING (
    get_user_role() IN ('admin', 'management', 'executive')
  );

-- Note: INSERT for external_evaluations will be handled via service role
-- in the API to allow anonymous submissions

-- Comments for documentation
COMMENT ON TABLE external_evaluation_links IS 'Shareable links for external evaluators to submit anonymous evaluations';
COMMENT ON TABLE external_evaluations IS 'Anonymous evaluation submissions from external evaluators';
COMMENT ON COLUMN external_evaluation_links.token IS 'Unique shareable token (64 chars, cryptographically secure)';
COMMENT ON COLUMN external_evaluation_links.max_submissions IS 'Maximum allowed submissions (NULL = unlimited)';
COMMENT ON COLUMN external_evaluations.evaluation_data IS 'JSONB containing evaluation scores and data based on content_type';
