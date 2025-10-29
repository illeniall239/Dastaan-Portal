-- Update RLS policies to allow evaluators to see all call reports and all evaluations
-- Evaluators should be able to view but not modify call reports
-- Evaluators should only be able to submit evaluations for assigned call reports

-- Update call_reports SELECT policy to explicitly include evaluators
DROP POLICY IF EXISTS "Authenticated users can view call reports" ON call_reports;
CREATE POLICY "All authenticated users can view call reports"
  ON call_reports FOR SELECT
  TO authenticated
  USING (true);

-- Update evaluator_forms SELECT policy to allow evaluators to see all forms for their assigned call reports
DROP POLICY IF EXISTS "Evaluators can view their own forms" ON evaluator_forms;
CREATE POLICY "Evaluators can view assigned evaluation forms"
  ON evaluator_forms FOR SELECT
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() IN ('content_manager', 'executive', 'admin') OR
    -- Allow evaluators to see all evaluations for call reports they're assigned to
    (get_user_role() = 'evaluator' AND 
     id IN (
       SELECT ef.id 
       FROM evaluator_forms ef
       JOIN evaluator_assignments ea ON ef.call_report_id = ea.call_report_id
       WHERE ea.evaluator_id = auth.uid()
     ))
  );

-- Update call_reports INSERT policy to explicitly exclude evaluators
DROP POLICY IF EXISTS "Content managers can create call reports" ON call_reports;
CREATE POLICY "Managers can create call reports"
  ON call_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('content_manager', 'admin')
  );

-- Update call_reports UPDATE policy to explicitly exclude evaluators
DROP POLICY IF EXISTS "Creators and managers can update call reports" ON call_reports;
CREATE POLICY "Managers can update call reports"
  ON call_reports FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'admin')
  );

-- Create evaluator_assignments SELECT policy to allow evaluators to view their assignments
CREATE POLICY "Evaluators can view their assignments"
  ON evaluator_assignments FOR SELECT
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() IN ('content_manager', 'admin')
  );