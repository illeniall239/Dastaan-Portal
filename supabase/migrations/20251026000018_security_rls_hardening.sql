-- =====================================================
-- Security Hardening - RLS Policy Updates
-- =====================================================

-- 1) Episodic evaluations: allow owner/admin to update (previously disabled)
DROP POLICY IF EXISTS "No updates to episodic evaluations" ON public.episodic_evaluations;
CREATE POLICY "Owners and admins can update episodic evaluations"
  ON public.episodic_evaluations FOR UPDATE
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() IN ('content_manager', 'admin')
  );

-- 2) Attachments: restrict SELECT to owner and privileged roles
DROP POLICY IF EXISTS "Users can view attachments" ON public.attachments;
CREATE POLICY "Owners and privileged roles can view attachments"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    get_user_role() IN ('content_manager', 'evaluator', 'admin')
  );

-- 3) Audit logs: restrict viewing to management/admin (no broad access)
DROP POLICY IF EXISTS "All authenticated users can view audit logs" ON public.audit_logs;
CREATE POLICY "Management and admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'admin')
  );

-- 4) Archive: restrict viewing to content managers/admins
DROP POLICY IF EXISTS "Users can view archive" ON public.archive;
CREATE POLICY "Managers can view archive"
  ON public.archive FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_manager', 'admin')
  );

-- 5) Call reports: narrow read access to relevant roles
DROP POLICY IF EXISTS "Authenticated users can view call reports" ON public.call_reports;
CREATE POLICY "Content and evaluators can view call reports"
  ON public.call_reports FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'admin')
  );

-- Notes:
-- - Storage (bucket) policies for file objects should enforce signed URL or role-based access.
--   These are configured under storage schema; ensure downloads use signed URLs with short TTLs.

