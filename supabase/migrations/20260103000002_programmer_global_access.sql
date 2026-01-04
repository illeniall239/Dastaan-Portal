-- =====================================================
-- Programming Team Global Access RLS Policies
-- =====================================================

-- Programmers can view ALL call reports (no team filter)
CREATE POLICY "Programmers can view all call reports globally"
  ON call_reports FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('programmer', 'admin', 'management')
  );

-- Programmers can create call reports (no team restriction)
CREATE POLICY "Programmers can create call reports"
  ON call_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'programmer'
  );

-- Programmers can update call reports they created
CREATE POLICY "Programmers can update call reports"
  ON call_reports FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'programmer'
  );

-- Programmers can view ALL evaluations globally
CREATE POLICY "Programmers can view all evaluations globally"
  ON evaluator_forms FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('programmer', 'admin', 'management')
  );

-- Programmers can create evaluations
CREATE POLICY "Programmers can create evaluations"
  ON evaluator_forms FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'programmer' AND evaluator_id = auth.uid()
  );

-- Programmers can update their own evaluations
CREATE POLICY "Programmers can update own evaluations"
  ON evaluator_forms FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'programmer' AND evaluator_id = auth.uid()
  );

-- Programmers can view ALL episodes globally
CREATE POLICY "Programmers can view all episodes globally"
  ON episodes FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('programmer', 'admin', 'management')
  );

-- Programmers can create/update episodes
CREATE POLICY "Programmers can manage episodes"
  ON episodes FOR ALL
  TO authenticated
  USING (get_user_role() = 'programmer')
  WITH CHECK (get_user_role() = 'programmer');

-- Programmers can view ALL episodic evaluations globally
CREATE POLICY "Programmers can view all episodic evaluations globally"
  ON episodic_evaluations FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('programmer', 'admin', 'management')
  );

-- Programmers can create episodic evaluations
CREATE POLICY "Programmers can create episodic evaluations"
  ON episodic_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'programmer' AND evaluator_id = auth.uid()
  );

-- Programmers can update their own episodic evaluations
CREATE POLICY "Programmers can update own episodic evaluations"
  ON episodic_evaluations FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'programmer' AND evaluator_id = auth.uid()
  );

-- Programmers can view ALL detailed one-liners globally
CREATE POLICY "Programmers can view all one-liners globally"
  ON detailed_one_liners FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('programmer', 'admin', 'management')
  );

-- Programmers can manage one-liners
CREATE POLICY "Programmers can manage one-liners"
  ON detailed_one_liners FOR ALL
  TO authenticated
  USING (get_user_role() = 'programmer')
  WITH CHECK (get_user_role() = 'programmer');

-- Programmers can view ALL contract terms globally
CREATE POLICY "Programmers can view all contracts globally"
  ON negotiations FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('programmer', 'admin', 'management')
  );

-- Programmers can manage contract terms
CREATE POLICY "Programmers can manage contracts"
  ON negotiations FOR ALL
  TO authenticated
  USING (get_user_role() = 'programmer')
  WITH CHECK (get_user_role() = 'programmer');

-- Programmers can view ALL stories globally
CREATE POLICY "Programmers can view all stories globally"
  ON stories FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('programmer', 'admin', 'management')
  );

-- Programmers can view ALL writers globally
CREATE POLICY "Programmers can view all writers globally"
  ON writers FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('programmer', 'admin', 'management', 'evaluator', 'content_manager', 'content_creator')
  );

-- Programmers can view ALL one-liners globally
CREATE POLICY "Programmers can view all standard one-liners globally"
  ON one_liners FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('programmer', 'admin', 'management')
  );

-- Programmers can manage standard one-liners
CREATE POLICY "Programmers can manage standard one-liners"
  ON one_liners FOR ALL
  TO authenticated
  USING (get_user_role() = 'programmer')
  WITH CHECK (get_user_role() = 'programmer');

COMMENT ON POLICY "Programmers can view all call reports globally" ON call_reports
  IS 'Programming team has global read access to all call reports across all teams';

COMMENT ON POLICY "Programmers can view all evaluations globally" ON evaluator_forms
  IS 'Programming team has global read access to all evaluations across all teams';

COMMENT ON POLICY "Programmers can view all episodes globally" ON episodes
  IS 'Programming team has global read access to all episodes across all teams';

COMMENT ON POLICY "Programmers can view all episodic evaluations globally" ON episodic_evaluations
  IS 'Programming team has global read access to all episodic evaluations across all teams';
