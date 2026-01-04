-- =====================================================
-- Week 3: RLS Policy Improvements
-- =====================================================
-- This migration tightens security by:
-- 1. Adding programmer role to relevant policies
-- 2. Improving granularity of access controls
-- 3. Adding missing policies for newer tables
-- =====================================================

-- 1) Update attachments policy to include programmer role and content_creator
DROP POLICY IF EXISTS "Owners and privileged roles can view attachments" ON public.attachments;
CREATE POLICY "Owners and privileged roles can view attachments"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    get_user_role() IN ('content_creator', 'content_manager', 'content_head', 'evaluator', 'management', 'executive', 'programmer', 'admin')
  );

-- 2) Update call reports policy to include programmer and management roles
DROP POLICY IF EXISTS "Content and evaluators can view call reports" ON public.call_reports;
CREATE POLICY "Content, evaluators, management, and programmers can view call reports"
  ON public.call_reports FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN (
      'content_creator',
      'content_manager',
      'content_head',
      'evaluator',
      'management',
      'executive',
      'programmer',
      'admin'
    )
  );

-- 3) Update episodic evaluations policy to include programmer role
DROP POLICY IF EXISTS "Owners and admins can update episodic evaluations" ON public.episodic_evaluations;
CREATE POLICY "Owners, management, and admins can update episodic evaluations"
  ON public.episodic_evaluations FOR UPDATE
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() IN ('content_manager', 'content_head', 'management', 'programmer', 'admin')
  );

-- 4) Add policy for programmer access to evaluator_forms
DROP POLICY IF EXISTS "Evaluators and managers can view forms" ON public.evaluator_forms;
CREATE POLICY "Evaluators, management, and programmers can view forms"
  ON public.evaluator_forms FOR SELECT
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() IN ('content_manager', 'content_head', 'management', 'programmer', 'admin')
  );

-- 5) Add policy for programmer to update evaluator_forms
DROP POLICY IF EXISTS "Evaluators can update their own forms" ON public.evaluator_forms;
CREATE POLICY "Evaluators and privileged roles can update forms"
  ON public.evaluator_forms FOR UPDATE
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() IN ('management', 'programmer', 'admin')
  );

-- 6) Update audit logs policy to include programmer role
DROP POLICY IF EXISTS "Management and admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Management, programmers, and admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'programmer', 'admin')
  );

-- 7) Tighten stories access - content creators should only see their own
DROP POLICY IF EXISTS "Users can view stories" ON public.stories;
CREATE POLICY "Users can view relevant stories"
  ON public.stories FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    get_user_role() IN (
      'content_manager',
      'content_head',
      'evaluator',
      'management',
      'executive',
      'programmer',
      'admin'
    )
  );

-- 8) Add policy for episodes to include programmer role
DROP POLICY IF EXISTS "Authenticated users can view episodes" ON public.episodes;
CREATE POLICY "Relevant users can view episodes"
  ON public.episodes FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN (
      'content_creator',
      'content_manager',
      'content_head',
      'evaluator',
      'management',
      'programmer',
      'admin'
    )
  );

-- 9) Restrict notifications to owner and admins only
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    get_user_role() IN ('admin', 'programmer')
  );

-- 10) Add policy for external_evaluation_links - management and programmer only
DROP POLICY IF EXISTS "Management can view external links" ON public.external_evaluation_links;
CREATE POLICY "Management and programmers can view external links"
  ON public.external_evaluation_links FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('management', 'programmer', 'admin')
  );

CREATE POLICY "Management and programmers can create external links"
  ON public.external_evaluation_links FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('management', 'programmer', 'admin')
  );

CREATE POLICY "Management and programmers can update external links"
  ON public.external_evaluation_links FOR UPDATE
  TO authenticated
  USING (
    get_user_role() IN ('management', 'programmer', 'admin')
  );

-- 11) Add policy for teams - restrict to team members and admins
DROP POLICY IF EXISTS "Users can view teams" ON public.teams;
CREATE POLICY "Team members and privileged roles can view teams"
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    team_head_id = auth.uid() OR
    get_user_role() IN ('content_creator', 'content_manager', 'content_head', 'management', 'programmer', 'admin')
  );

-- 12) Add policy for writers - content department and programmers can manage
DROP POLICY IF EXISTS "Users can view writers" ON public.writers;
CREATE POLICY "Content department and programmers can view writers"
  ON public.writers FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN (
      'content_creator',
      'content_manager',
      'content_head',
      'evaluator',
      'management',
      'programmer',
      'admin'
    )
  );

-- Notes:
-- - Programmer role now has global access similar to admin for evaluation purposes
-- - Content creators can only see their own stories, not others'
-- - All evaluator-type roles (evaluator, management, programmer) have access to evaluations
-- - Notifications are strictly personal (user_id match) except for admins/programmers
-- - Audit logs restricted to management oversight roles

COMMENT ON TABLE public.attachments IS 'RLS updated: Programmer role added for global access';
COMMENT ON TABLE public.evaluator_forms IS 'RLS updated: Programmer can view and update all forms';
COMMENT ON TABLE public.audit_logs IS 'RLS updated: Programmer can view for system monitoring';
COMMENT ON TABLE public.notifications IS 'RLS tightened: Users can only see their own notifications';
COMMENT ON TABLE public.stories IS 'RLS tightened: Content creators see only their own stories';
