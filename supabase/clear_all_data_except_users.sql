-- =====================================================
-- CLEAR ALL DATABASE DATA (EXCEPT USERS & ROLES)
-- =====================================================
-- WARNING: This script will DELETE ALL logged data including:
-- - Episodes, evaluations, call reports
-- - Stories, negotiations, contracts, payments
-- - Notifications, attachments, audit logs
--
-- PRESERVED: Users and Roles tables remain intact
--
-- HOW TO RUN:
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Create New Query
-- 4. Paste this entire script
-- 5. Click "Run"
--
-- RECOMMENDED: Take a database backup before running!
-- =====================================================

BEGIN;

-- Disable triggers temporarily for faster execution
SET session_replication_role = 'replica';

-- =====================================================
-- Delete Episodic Data (Child tables first)
-- =====================================================
TRUNCATE TABLE public.episodic_evaluation_drafts CASCADE;
TRUNCATE TABLE public.episodic_evaluations CASCADE;
TRUNCATE TABLE public.episodes CASCADE;

-- =====================================================
-- Delete Evaluation Data
-- =====================================================
TRUNCATE TABLE public.evaluator_form_drafts CASCADE;
TRUNCATE TABLE public.evaluator_forms CASCADE;
TRUNCATE TABLE public.evaluator_assignments CASCADE;
TRUNCATE TABLE public.evaluation_logs CASCADE;
TRUNCATE TABLE public.evaluations_snapshot CASCADE;

-- =====================================================
-- Delete Script Development Data
-- =====================================================
TRUNCATE TABLE public.script_feedback CASCADE;
TRUNCATE TABLE public.script_phases CASCADE;

-- =====================================================
-- Delete Payment & Contract Data
-- =====================================================
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.payment_schedules CASCADE;
TRUNCATE TABLE public.contracts CASCADE;

-- =====================================================
-- Delete Legal & Negotiation Data
-- =====================================================
TRUNCATE TABLE public.legal_reviews CASCADE;
TRUNCATE TABLE public.negotiations CASCADE;
TRUNCATE TABLE public.one_liners CASCADE;

-- =====================================================
-- Delete Call Reports & Stories (Parent tables)
-- =====================================================
TRUNCATE TABLE public.call_reports CASCADE;
TRUNCATE TABLE public.stories CASCADE;

-- =====================================================
-- Delete Archive & Supporting Data
-- =====================================================
TRUNCATE TABLE public.rejected_archive CASCADE;
TRUNCATE TABLE public.archive CASCADE;
TRUNCATE TABLE public.attachments CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;

-- =====================================================
-- Delete Workflow Data
-- =====================================================
TRUNCATE TABLE public.workflow_stages CASCADE;
TRUNCATE TABLE public.workflows CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this after to verify cleanup (should all show 0 except users/roles):
--
-- SELECT
--   'users' as table_name, COUNT(*) as row_count FROM public.users
-- UNION ALL
-- SELECT 'roles', COUNT(*) FROM public.roles
-- UNION ALL
-- SELECT 'episodes', COUNT(*) FROM public.episodes
-- UNION ALL
-- SELECT 'episodic_evaluations', COUNT(*) FROM public.episodic_evaluations
-- UNION ALL
-- SELECT 'call_reports', COUNT(*) FROM public.call_reports
-- UNION ALL
-- SELECT 'evaluator_forms', COUNT(*) FROM public.evaluator_forms
-- UNION ALL
-- SELECT 'stories', COUNT(*) FROM public.stories;
-- =====================================================
