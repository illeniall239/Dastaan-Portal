-- ============================================================================
-- FIX FUNCTION SEARCH PATH WARNINGS
-- ============================================================================
-- Purpose: Set search_path = public on all functions to prevent potential
--          SQL injection via search path manipulation (security best practice)
-- ============================================================================

-- Use DO blocks to safely alter functions that may or may not exist

DO $$
BEGIN
  -- Core RLS helper functions
  ALTER FUNCTION public.get_user_role() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_user_team_id() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.has_global_access() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.is_admin() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.is_content_manager() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_current_user() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Team-related functions
DO $$
BEGIN
  ALTER FUNCTION public.create_team_for_user() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.auto_populate_team_id() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.populate_team_id() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.refresh_all_team_views() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.refresh_team_hierarchy() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.refresh_team_performance() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.check_team_circular_reference(UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.prevent_team_circular_reference() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_team_members_recursive(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_teams_updated_at() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- User/Auth functions
DO $$
BEGIN
  ALTER FUNCTION public.handle_new_user() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.handle_user_login() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.validate_org_email_domain() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.cascade_user_name_update() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Evaluation functions
DO $$
BEGIN
  ALTER FUNCTION public.calculate_evaluation_average() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.calculate_evaluation_decision() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.calculate_grade(NUMERIC) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.calculate_completion_percentage(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_evaluation_progress(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_pending_evaluations_count() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.process_evaluation_completion() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.check_evaluation_deadlines() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.auto_assign_evaluators() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Episodic evaluation functions
DO $$
BEGIN
  ALTER FUNCTION public.auto_calculate_episodic_scores() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.calculate_pages_score(INTEGER) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.calculate_scenes_score(INTEGER) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_episodic_eval_updated_at() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Call report functions
DO $$
BEGIN
  ALTER FUNCTION public.archive_rejected_call_report() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_overall_rating_from_evaluators() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_call_report_writers_updated_at() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- External evaluation functions
DO $$
BEGIN
  ALTER FUNCTION public.increment_external_link_submissions(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.is_external_link_valid(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Updated_at trigger functions
DO $$
BEGIN
  ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_writers_updated_at() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_episodes_updated_at() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_detailed_one_liners_updated_at() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_character_relationships_updated_at() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================================
-- REVOKE PUBLIC ACCESS TO MATERIALIZED VIEWS (optional security hardening)
-- ============================================================================

-- Revoke anon access to materialized views
REVOKE SELECT ON public.team_hierarchy FROM anon;
REVOKE SELECT ON public.team_performance FROM anon;

-- Keep authenticated access (users need to see their team data)
-- GRANT SELECT ON public.team_hierarchy TO authenticated;
-- GRANT SELECT ON public.team_performance TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

