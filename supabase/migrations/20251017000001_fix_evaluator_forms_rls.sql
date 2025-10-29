-- Fix evaluator_forms RLS policy to allow content_creator role
-- Content creators act as evaluators in the system

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Evaluators can create forms" ON evaluator_forms;

-- Create new policy that allows both evaluator and content_creator roles
CREATE POLICY "Evaluators can create forms"
  ON evaluator_forms FOR INSERT
  TO authenticated
  WITH CHECK (
    evaluator_id = auth.uid() AND
    get_user_role() IN ('evaluator', 'content_creator', 'content_manager', 'executive', 'admin')
  );

COMMENT ON POLICY "Evaluators can create forms" ON evaluator_forms IS
'Allows evaluators and content creators to submit evaluation forms for call reports they are assigned to';
