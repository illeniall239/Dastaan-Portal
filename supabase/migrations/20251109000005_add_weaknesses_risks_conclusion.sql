-- Add Potential Weaknesses/Risks items table and Conclusion/Recommendation to detailed_one_liners

-- Create potential_weaknesses_risks_items table
CREATE TABLE IF NOT EXISTS potential_weaknesses_risks_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailed_one_liner_id UUID NOT NULL REFERENCES detailed_one_liners(id) ON DELETE CASCADE,
  issue TEXT NOT NULL,
  explanation_risk_detail TEXT NOT NULL,
  impact TEXT NOT NULL,
  sort_order INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_weaknesses_risks_detailed_one_liner ON potential_weaknesses_risks_items(detailed_one_liner_id);

-- Add comments
COMMENT ON TABLE potential_weaknesses_risks_items IS 'Potential weaknesses and risks items for detailed one-liners';
COMMENT ON COLUMN potential_weaknesses_risks_items.issue IS 'The issue or weakness';
COMMENT ON COLUMN potential_weaknesses_risks_items.explanation_risk_detail IS 'Explanation or risk detail';
COMMENT ON COLUMN potential_weaknesses_risks_items.impact IS 'Impact of the issue';
COMMENT ON COLUMN potential_weaknesses_risks_items.sort_order IS 'Order of items for display';

-- Enable Row Level Security
ALTER TABLE potential_weaknesses_risks_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for potential_weaknesses_risks_items
-- Evaluators can view items for detailed one-liners they have access to
CREATE POLICY weaknesses_risks_evaluator_select ON potential_weaknesses_risks_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = potential_weaknesses_risks_items.detailed_one_liner_id
      AND (
        get_user_role() = 'evaluator'
        OR get_user_role() = 'content_manager'
        OR get_user_role() = 'management'
        OR is_admin()
      )
    )
  );

-- Evaluators and content managers can insert items
CREATE POLICY weaknesses_risks_insert ON potential_weaknesses_risks_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'evaluator'
    OR get_user_role() = 'content_manager'
    OR is_admin()
  );

-- Evaluators and content managers can update their own items
CREATE POLICY weaknesses_risks_update ON potential_weaknesses_risks_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = potential_weaknesses_risks_items.detailed_one_liner_id
      AND (
        dol.created_by = auth.uid()
        OR get_user_role() = 'content_manager'
        OR is_admin()
      )
    )
  );

-- Evaluators and content managers can delete their own items
CREATE POLICY weaknesses_risks_delete ON potential_weaknesses_risks_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = potential_weaknesses_risks_items.detailed_one_liner_id
      AND (
        dol.created_by = auth.uid()
        OR get_user_role() = 'content_manager'
        OR is_admin()
      )
    )
  );

-- Add conclusion_recommendation column to detailed_one_liners
ALTER TABLE detailed_one_liners
  ADD COLUMN IF NOT EXISTS conclusion_recommendation TEXT;

-- Add comment
COMMENT ON COLUMN detailed_one_liners.conclusion_recommendation IS 'Conclusion and recommendation for the detailed one-liner';
