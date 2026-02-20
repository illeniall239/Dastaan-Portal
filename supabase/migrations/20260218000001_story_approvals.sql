-- Story Approvals: Multi-approver gate for story progression
-- Requires 3/5 approvals: 2 mandatory management (Humera + Salman) + 1 from (evaluator team head / programmer)

CREATE TABLE IF NOT EXISTS story_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  notes TEXT,
  approver_type TEXT NOT NULL CHECK (approver_type IN ('management', 'evaluator', 'programmer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(call_report_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_story_approvals_call_report ON story_approvals(call_report_id);
CREATE INDEX IF NOT EXISTS idx_story_approvals_user ON story_approvals(user_id);

-- Enable RLS
ALTER TABLE story_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- All authenticated users can read approvals
CREATE POLICY "story_approvals_select" ON story_approvals
  FOR SELECT TO authenticated
  USING (true);

-- Users can insert their own approval
CREATE POLICY "story_approvals_insert" ON story_approvals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own approval
CREATE POLICY "story_approvals_update" ON story_approvals
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own approval
CREATE POLICY "story_approvals_delete" ON story_approvals
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
