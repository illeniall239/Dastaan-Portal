-- Grant gcm role the same RLS access as evaluator on evaluation-related tables

-- evaluator_forms: read + submit own evaluations
CREATE POLICY "gcm can read evaluator_forms" ON evaluator_forms
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gcm');

CREATE POLICY "gcm can insert evaluator_forms" ON evaluator_forms
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'gcm' AND evaluator_id = auth.uid());

CREATE POLICY "gcm can update own evaluator_forms" ON evaluator_forms
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'gcm' AND evaluator_id = auth.uid());

-- evaluator_form_drafts: full access to own drafts
CREATE POLICY "gcm can manage own evaluator_form_drafts" ON evaluator_form_drafts
  FOR ALL TO authenticated
  USING (get_user_role() = 'gcm' AND evaluator_id = auth.uid())
  WITH CHECK (get_user_role() = 'gcm' AND evaluator_id = auth.uid());

-- detailed_one_liners: read all, write own
CREATE POLICY "gcm can read detailed_one_liners" ON detailed_one_liners
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gcm');

CREATE POLICY "gcm can insert detailed_one_liners" ON detailed_one_liners
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'gcm' AND created_by = auth.uid());

CREATE POLICY "gcm can update own detailed_one_liners" ON detailed_one_liners
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'gcm' AND created_by = auth.uid());

-- narrative_breakdown_items
CREATE POLICY "gcm can read narrative_breakdown_items" ON narrative_breakdown_items
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gcm');

CREATE POLICY "gcm can manage narrative_breakdown_items" ON narrative_breakdown_items
  FOR ALL TO authenticated
  USING (get_user_role() = 'gcm')
  WITH CHECK (get_user_role() = 'gcm');

-- event_planning_items
CREATE POLICY "gcm can read event_planning_items" ON event_planning_items
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gcm');

CREATE POLICY "gcm can manage event_planning_items" ON event_planning_items
  FOR ALL TO authenticated
  USING (get_user_role() = 'gcm')
  WITH CHECK (get_user_role() = 'gcm');

-- potential_weaknesses_risks_items
CREATE POLICY "gcm can read weakness_risk_items" ON potential_weaknesses_risks_items
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gcm');

CREATE POLICY "gcm can manage weakness_risk_items" ON potential_weaknesses_risks_items
  FOR ALL TO authenticated
  USING (get_user_role() = 'gcm')
  WITH CHECK (get_user_role() = 'gcm');

-- character_relationships
CREATE POLICY "gcm can read character_relationships" ON character_relationships
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gcm');

CREATE POLICY "gcm can manage character_relationships" ON character_relationships
  FOR ALL TO authenticated
  USING (get_user_role() = 'gcm')
  WITH CHECK (get_user_role() = 'gcm');

-- episodic_evaluations: read access
CREATE POLICY "gcm can read episodic_evaluations" ON episodic_evaluations
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gcm');

-- cross_team_shares: read/write for own team
CREATE POLICY "gcm can read cross_team_shares" ON cross_team_shares
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gcm');

CREATE POLICY "gcm can insert cross_team_shares" ON cross_team_shares
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'gcm');

-- story_approvals: read access
CREATE POLICY "gcm can read story_approvals" ON story_approvals
  FOR SELECT TO authenticated
  USING (get_user_role() = 'gcm');
