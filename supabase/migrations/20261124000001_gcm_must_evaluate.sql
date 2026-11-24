-- GCM must evaluate what it logs too (one-liners, episodes, revisions), like content heads.
-- Zanjabeel Asim heads a team with the gcm role, so the rule didn't cover her uploads.
-- Same function as 20261118000001, with 'gcm' added. Keep in sync with MUST_EVALUATE_ROLES
-- in lib/episodes/permissions.ts.
CREATE OR REPLACE FUNCTION public.must_evaluate_on_log(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user AND role IN ('evaluator', 'programmer', 'management', 'executive', 'gcm')
  );
$$;

-- Check: should return true for a gcm user
SELECT u.name, u.role, public.must_evaluate_on_log(u.id) AS must_evaluate
FROM users u WHERE u.role = 'gcm';
