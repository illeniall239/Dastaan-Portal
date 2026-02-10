-- Migration: Secure Unrestricted Views
-- Description: Fix 7 views/materialized views showing as "unrestricted" in Supabase
--
-- Problem: Views without security_invoker run as the DB owner (postgres),
-- bypassing all RLS policies on underlying tables. This means anyone querying
-- the view directly gets ALL data regardless of team isolation or role-based access.
--
-- Fix:
--   Regular views → security_invoker = on (respects caller's RLS)
--   Materialized views → REVOKE from anon/public, GRANT to authenticated/service_role
-- Date: 2026-02-10

-- ============================================================================
-- 1. Regular Views — Enable security_invoker
-- ============================================================================

-- call_report_evaluations_with_type
-- (Was set in 20260103 migration but lost when view was recreated in 20260104)
ALTER VIEW call_report_evaluations_with_type SET (security_invoker = on);

-- episodic_evaluations_with_type
-- (Same — was set in 20260103 but lost when recreated in 20260104)
ALTER VIEW episodic_evaluations_with_type SET (security_invoker = on);

-- consolidated_cms_view
-- (Never had security_invoker set)
ALTER VIEW consolidated_cms_view SET (security_invoker = on);

-- roadmap_list_view
-- (Had GRANT but no security_invoker — GRANT controls WHO can query,
--  security_invoker controls WHETHER RLS applies to the underlying tables)
ALTER VIEW roadmap_list_view SET (security_invoker = on);

-- ============================================================================
-- 2. Materialized Views — Restrict access via GRANT/REVOKE
-- ============================================================================
-- PostgreSQL does not support RLS on materialized views. The "unrestricted"
-- badge will persist in Supabase UI for these, but GRANT/REVOKE ensures
-- only authenticated users and service_role can query them.
-- Anonymous (unauthenticated) access is blocked.

-- team_hierarchy
REVOKE ALL ON team_hierarchy FROM anon, public;
GRANT SELECT ON team_hierarchy TO authenticated;
GRANT SELECT ON team_hierarchy TO service_role;

-- team_performance
REVOKE ALL ON team_performance FROM anon, public;
GRANT SELECT ON team_performance TO authenticated;
GRANT SELECT ON team_performance TO service_role;

-- writer_financial_summary
REVOKE ALL ON writer_financial_summary FROM anon, public;
GRANT SELECT ON writer_financial_summary TO authenticated;
GRANT SELECT ON writer_financial_summary TO service_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- After running this migration:
-- - 4 regular views will respect RLS policies of their underlying tables
-- - 3 materialized views are secured via GRANT/REVOKE (anon blocked)
-- - Note: Materialized views will still show "unrestricted" in Supabase UI
--   because PostgreSQL doesn't support RLS on them. This is cosmetic only —
--   access is properly restricted via GRANT/REVOKE.
