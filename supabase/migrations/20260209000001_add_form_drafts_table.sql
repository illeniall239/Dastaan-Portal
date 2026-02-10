-- Universal form drafts table for autosave across all portal forms
-- Stores form state as JSONB so any form can use it

CREATE TABLE IF NOT EXISTS form_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '_new',
  draft_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_draft_per_user_form UNIQUE(user_id, form_type, entity_id)
);

-- Enable RLS
ALTER TABLE form_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own drafts
CREATE POLICY "Users can view own drafts" ON form_drafts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own drafts" ON form_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts" ON form_drafts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts" ON form_drafts
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups by user + form type
CREATE INDEX idx_form_drafts_user_form ON form_drafts(user_id, form_type);

-- Auto-update updated_at on changes
CREATE OR REPLACE TRIGGER update_form_drafts_updated_at
  BEFORE UPDATE ON form_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
