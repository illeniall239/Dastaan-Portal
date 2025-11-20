-- Allow evaluators to edit all episodes
-- Previously only logged_by user, content_manager, or admin could edit
-- Now evaluators can also edit any episode

BEGIN;

-- Drop the old update policy
DROP POLICY IF EXISTS "Users can update episodes" ON public.episodes;

-- Create new policy that includes evaluator role
CREATE POLICY "Users can update episodes"
  ON public.episodes FOR UPDATE
  TO authenticated
  USING (
    logged_by = auth.uid() OR
    get_user_role() IN ('evaluator', 'content_manager', 'admin')
  );

COMMENT ON POLICY "Users can update episodes" ON public.episodes IS
'Allows episode owner, evaluators, content managers, and admins to update episodes';

COMMIT;
