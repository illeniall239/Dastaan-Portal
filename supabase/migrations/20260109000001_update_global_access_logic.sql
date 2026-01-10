-- ============================================================================
-- UPDATE has_global_access() FUNCTION
-- ============================================================================
-- Migration: 20260109000001_update_global_access_logic.sql
-- Purpose: Determine if user can see all teams' content
--
-- Global Access Rules:
-- 1. Admin, Management, Programmer → ALWAYS have global access
-- 2. All other roles → global access ONLY if cross_team_visibility is enabled
--
-- This fixes the programmer role bug (was missing in RLS but had access in app code)
-- and implements the cross-team visibility toggle logic
-- ============================================================================

CREATE OR REPLACE FUNCTION has_global_access()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  cross_team_enabled BOOLEAN;
BEGIN
  -- Get current user's role
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid();

  -- If no user found, deny access
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has permanent global access (admin, management, programmer)
  -- Note: Programmer role added here to fix RLS inconsistency
  IF user_role IN ('admin', 'management', 'programmer') THEN
    RETURN TRUE;
  END IF;

  -- For all other roles (content_head, content_manager, evaluator, content_creator, etc.),
  -- check the cross-team visibility toggle
  cross_team_enabled := is_cross_team_visibility_enabled();

  RETURN cross_team_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION has_global_access() IS 'Returns TRUE if user can see all teams. Admin/Management/Programmer always have global access. Other roles have global access only when cross_team_visibility is enabled.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
