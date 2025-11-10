-- Create detailed one-liners feature
-- This allows evaluators to create comprehensive one-liner analysis with narrative breakdown

-- Create detailed_one_liners table
CREATE TABLE IF NOT EXISTS detailed_one_liners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,
  preamble TEXT NOT NULL,
  plot TEXT NOT NULL,
  emotional_arena TEXT NOT NULL,
  creed_conflict TEXT NOT NULL,
  new_element TEXT NOT NULL,
  emotional_core_resolution TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_detailed_one_liner_per_call_report UNIQUE(call_report_id)
);

-- Create narrative_breakdown_items table
CREATE TABLE IF NOT EXISTS narrative_breakdown_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailed_one_liner_id UUID NOT NULL REFERENCES detailed_one_liners(id) ON DELETE CASCADE,
  story_stream TEXT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  narrative_purpose TEXT NOT NULL,
  sort_order INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_detailed_one_liners_call_report ON detailed_one_liners(call_report_id);
CREATE INDEX idx_detailed_one_liners_created_by ON detailed_one_liners(created_by);
CREATE INDEX idx_narrative_breakdown_detailed_one_liner ON narrative_breakdown_items(detailed_one_liner_id);

-- Add comments
COMMENT ON TABLE detailed_one_liners IS 'Detailed one-liner analysis for call reports with comprehensive narrative breakdown';
COMMENT ON TABLE narrative_breakdown_items IS 'Individual narrative breakdown items for detailed one-liners';

COMMENT ON COLUMN detailed_one_liners.preamble IS 'Why This Drama May Work - preamble section';
COMMENT ON COLUMN detailed_one_liners.plot IS 'PLOT section';
COMMENT ON COLUMN detailed_one_liners.emotional_arena IS 'The Emotional Arena section';
COMMENT ON COLUMN detailed_one_liners.creed_conflict IS 'Creed and Conflict section';
COMMENT ON COLUMN detailed_one_liners.new_element IS 'New Element section';
COMMENT ON COLUMN detailed_one_liners.emotional_core_resolution IS 'Emotional Core and Resolution section';

COMMENT ON COLUMN narrative_breakdown_items.story_stream IS 'Story stream description';
COMMENT ON COLUMN narrative_breakdown_items.percentage IS 'Percentage allocation (0-100)';
COMMENT ON COLUMN narrative_breakdown_items.narrative_purpose IS 'Narrative purpose description';
COMMENT ON COLUMN narrative_breakdown_items.sort_order IS 'Display order of the breakdown item';

-- Enable RLS
ALTER TABLE detailed_one_liners ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_breakdown_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for detailed_one_liners

-- Evaluators, content managers, and admins can view all detailed one-liners
CREATE POLICY "Authorized users can view detailed one-liners"
  ON detailed_one_liners FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('evaluator', 'content_manager', 'management', 'admin')
  );

-- Evaluators and content managers can create detailed one-liners
CREATE POLICY "Evaluators and content managers can create detailed one-liners"
  ON detailed_one_liners FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('evaluator', 'content_manager', 'admin')
    AND created_by = auth.uid()
  );

-- Users can update their own detailed one-liners
CREATE POLICY "Users can update own detailed one-liners"
  ON detailed_one_liners FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR get_user_role() = 'admin'
  );

-- Users can delete their own detailed one-liners, admins can delete any
CREATE POLICY "Users can delete own detailed one-liners"
  ON detailed_one_liners FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR get_user_role() = 'admin'
  );

-- RLS Policies for narrative_breakdown_items

-- Users who can view the parent detailed one-liner can view narrative items
CREATE POLICY "Authorized users can view narrative breakdown items"
  ON narrative_breakdown_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners
      WHERE detailed_one_liners.id = narrative_breakdown_items.detailed_one_liner_id
      AND get_user_role() IN ('evaluator', 'content_manager', 'management', 'admin')
    )
  );

-- Users who can create detailed one-liners can create narrative items
CREATE POLICY "Evaluators and content managers can create narrative items"
  ON narrative_breakdown_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM detailed_one_liners
      WHERE detailed_one_liners.id = narrative_breakdown_items.detailed_one_liner_id
      AND detailed_one_liners.created_by = auth.uid()
    )
    OR get_user_role() = 'admin'
  );

-- Users can update narrative items for their own detailed one-liners
CREATE POLICY "Users can update own narrative items"
  ON narrative_breakdown_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners
      WHERE detailed_one_liners.id = narrative_breakdown_items.detailed_one_liner_id
      AND (detailed_one_liners.created_by = auth.uid() OR get_user_role() = 'admin')
    )
  );

-- Users can delete narrative items for their own detailed one-liners
CREATE POLICY "Users can delete own narrative items"
  ON narrative_breakdown_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners
      WHERE detailed_one_liners.id = narrative_breakdown_items.detailed_one_liner_id
      AND (detailed_one_liners.created_by = auth.uid() OR get_user_role() = 'admin')
    )
  );

-- Create updated_at trigger for detailed_one_liners
CREATE OR REPLACE FUNCTION update_detailed_one_liners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_detailed_one_liners_updated_at
  BEFORE UPDATE ON detailed_one_liners
  FOR EACH ROW
  EXECUTE FUNCTION update_detailed_one_liners_updated_at();
