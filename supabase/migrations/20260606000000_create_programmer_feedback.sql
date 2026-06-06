-- Programmer Story Feedback
-- Stores written/file-based feedback from programmers on specific call reports (stories).
-- Attachments use the existing `attachments` table (entity_type = 'programmer_feedback').

CREATE TABLE programmer_feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programmer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,
  feedback_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  content        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_programmer_feedback_call_report ON programmer_feedback(call_report_id);
CREATE INDEX idx_programmer_feedback_programmer  ON programmer_feedback(programmer_id);
CREATE INDEX idx_programmer_feedback_date        ON programmer_feedback(feedback_date DESC);

ALTER TABLE programmer_feedback ENABLE ROW LEVEL SECURITY;

-- Programmers/management/admin: full CRUD on own rows, SELECT all
CREATE POLICY "programmer_feedback_select_global" ON programmer_feedback
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('programmer', 'management', 'admin'));

CREATE POLICY "programmer_feedback_insert" ON programmer_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('programmer', 'management', 'admin')
    AND programmer_id = auth.uid()
  );

CREATE POLICY "programmer_feedback_update" ON programmer_feedback
  FOR UPDATE TO authenticated
  USING (
    get_user_role() IN ('programmer', 'management', 'admin')
    AND programmer_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() IN ('programmer', 'management', 'admin')
    AND programmer_id = auth.uid()
  );

CREATE POLICY "programmer_feedback_delete" ON programmer_feedback
  FOR DELETE TO authenticated
  USING (
    get_user_role() IN ('programmer', 'management', 'admin')
    AND programmer_id = auth.uid()
  );

-- Evaluators: SELECT feedback for their own team's call reports only
CREATE POLICY "programmer_feedback_select_evaluator" ON programmer_feedback
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'evaluator'
    AND call_report_id IN (
      SELECT id FROM call_reports WHERE team_id = get_user_team_id()
    )
  );

-- GCM: same as evaluator
CREATE POLICY "programmer_feedback_select_gcm" ON programmer_feedback
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'gcm'
    AND call_report_id IN (
      SELECT id FROM call_reports WHERE team_id = get_user_team_id()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_programmer_feedback_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_programmer_feedback_updated_at
  BEFORE UPDATE ON programmer_feedback
  FOR EACH ROW EXECUTE FUNCTION update_programmer_feedback_updated_at();
