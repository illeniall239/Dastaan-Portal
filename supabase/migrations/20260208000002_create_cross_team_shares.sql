-- Cross-Team Sharing for Evaluation
-- Allows content heads to share call reports with other teams for evaluation
-- Tracks evaluation progress and timing

-- 1. Create cross_team_shares table
CREATE TABLE cross_team_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What is being shared
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,

  -- Who shared and with whom
  from_team_id UUID NOT NULL REFERENCES teams(id),
  to_team_id UUID NOT NULL REFERENCES teams(id),
  shared_by UUID NOT NULL REFERENCES users(id),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- Time tracking
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_evaluation_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Configuration
  notes TEXT,
  evaluation_deadline TIMESTAMPTZ,
  required_evaluations INT NOT NULL DEFAULT 3,
  completed_evaluations INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate shares of same call report to same team
  UNIQUE(call_report_id, to_team_id),
  -- Cannot share to own team
  CHECK (from_team_id != to_team_id)
);

-- Indexes
CREATE INDEX idx_cross_team_shares_from ON cross_team_shares(from_team_id);
CREATE INDEX idx_cross_team_shares_to ON cross_team_shares(to_team_id);
CREATE INDEX idx_cross_team_shares_call_report ON cross_team_shares(call_report_id);
CREATE INDEX idx_cross_team_shares_status ON cross_team_shares(status);

-- 2. Add cross_team_share_id to evaluator_forms
ALTER TABLE evaluator_forms
  ADD COLUMN cross_team_share_id UUID REFERENCES cross_team_shares(id) ON DELETE SET NULL;

CREATE INDEX idx_evaluator_forms_cross_team ON evaluator_forms(cross_team_share_id)
  WHERE cross_team_share_id IS NOT NULL;

-- 3. Trigger to auto-update share progress when evaluations are submitted
CREATE OR REPLACE FUNCTION update_cross_team_share_progress()
RETURNS TRIGGER AS $$
DECLARE
  eval_count INT;
  required INT;
  current_first_eval TIMESTAMPTZ;
BEGIN
  IF NEW.cross_team_share_id IS NOT NULL THEN
    -- Get current counts
    SELECT COUNT(*) INTO eval_count
    FROM evaluator_forms
    WHERE cross_team_share_id = NEW.cross_team_share_id;

    SELECT cts.required_evaluations, cts.first_evaluation_at
    INTO required, current_first_eval
    FROM cross_team_shares cts
    WHERE cts.id = NEW.cross_team_share_id;

    -- Update the share record
    UPDATE cross_team_shares SET
      completed_evaluations = eval_count,
      first_evaluation_at = COALESCE(current_first_eval, NOW()),
      status = CASE
        WHEN eval_count >= required THEN 'completed'
        ELSE 'in_progress'
      END,
      completed_at = CASE
        WHEN eval_count >= required THEN NOW()
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = NEW.cross_team_share_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_cross_team_share
  AFTER INSERT ON evaluator_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_cross_team_share_progress();

-- 4. RLS Policies
ALTER TABLE cross_team_shares ENABLE ROW LEVEL SECURITY;

-- Team heads & admins can create shares for their team
CREATE POLICY "Team heads can share their team content"
  ON cross_team_shares FOR INSERT
  WITH CHECK (
    shared_by = auth.uid() AND (
      EXISTS (SELECT 1 FROM teams WHERE id = from_team_id AND team_head_id = auth.uid())
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'management'))
    )
  );

-- Both teams can view their shares
CREATE POLICY "Teams can view their shares"
  ON cross_team_shares FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (
      team_id = from_team_id OR team_id = to_team_id
      OR role IN ('admin', 'management')
    ))
  );

-- Sharer can update (cancel) their shares
CREATE POLICY "Sharer can update their shares"
  ON cross_team_shares FOR UPDATE
  USING (
    shared_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete
CREATE POLICY "Admin can delete shares"
  ON cross_team_shares FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
