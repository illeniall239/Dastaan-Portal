-- Create table for evaluator form (one-liner) drafts
CREATE TABLE IF NOT EXISTS evaluator_form_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_draft_per_evaluator_per_call_report UNIQUE(call_report_id, evaluator_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_evaluator_form_drafts_call_report_id ON evaluator_form_drafts(call_report_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_form_drafts_evaluator_id ON evaluator_form_drafts(evaluator_id);

-- Create trigger to automatically update the 'updated_at' column
-- The function update_updated_at_column already exists from episodic drafts migration

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS update_evaluator_form_drafts_updated_at ON evaluator_form_drafts;

CREATE TRIGGER update_evaluator_form_drafts_updated_at
    BEFORE UPDATE ON evaluator_form_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set up row level security
ALTER TABLE evaluator_form_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (drop first if they exist)
-- Users can only access their own drafts
DROP POLICY IF EXISTS "Users can view own drafts" ON evaluator_form_drafts;
CREATE POLICY "Users can view own drafts" ON evaluator_form_drafts
    FOR SELECT USING (auth.uid() = evaluator_id);

DROP POLICY IF EXISTS "Users can insert own drafts" ON evaluator_form_drafts;
CREATE POLICY "Users can insert own drafts" ON evaluator_form_drafts
    FOR INSERT WITH CHECK (auth.uid() = evaluator_id);

DROP POLICY IF EXISTS "Users can update own drafts" ON evaluator_form_drafts;
CREATE POLICY "Users can update own drafts" ON evaluator_form_drafts
    FOR UPDATE USING (auth.uid() = evaluator_id);

DROP POLICY IF EXISTS "Users can delete own drafts" ON evaluator_form_drafts;
CREATE POLICY "Users can delete own drafts" ON evaluator_form_drafts
    FOR DELETE USING (auth.uid() = evaluator_id);
