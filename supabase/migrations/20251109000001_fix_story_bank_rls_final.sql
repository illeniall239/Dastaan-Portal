-- Fix Story Bank RLS Policy Errors - Final Corrected Version
-- This migration properly fixes all duplicate and missing RLS policies

-- ============================================================================
-- 1. Fix stories table - Remove duplicate management-only policy
-- ============================================================================
DROP POLICY IF EXISTS "Management can view all stories" ON stories;

-- The "Authenticated users can view stories" policy should already exist from previous migration
-- with all necessary roles. If not, recreate it.
DROP POLICY IF EXISTS "Authenticated users can view stories" ON stories;

CREATE POLICY "Authenticated users can view stories"
  ON stories FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'executive', 'management', 'admin')
  );

-- ============================================================================
-- 2. Fix episodes table - Use CORRECT policy name
-- ============================================================================
-- The actual policy name is "Content users and evaluators can view episodes" not "Authenticated users..."
DROP POLICY IF EXISTS "Content users and evaluators can view episodes" ON episodes;
DROP POLICY IF EXISTS "Authenticated users can view episodes" ON episodes;

CREATE POLICY "Authenticated users can view episodes"
  ON episodes FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'executive', 'management', 'admin')
  );

-- ============================================================================
-- 3. Fix call_reports table - Include management and executive roles
-- ============================================================================
-- Current policy only allows: content_creator, content_manager, evaluator, admin
-- MISSING: management, executive (needed for Story Bank episodes query!)
DROP POLICY IF EXISTS "Content and evaluators can view call reports" ON call_reports;
DROP POLICY IF EXISTS "Management can view all call reports" ON call_reports;
DROP POLICY IF EXISTS "Authenticated users can view call reports" ON call_reports;

CREATE POLICY "Authorized users can view call reports"
  ON call_reports FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'executive', 'management', 'admin')
  );

-- ============================================================================
-- 4. Verify one_liners table has correct policy
-- ============================================================================
-- Should already be fixed from previous migration, but ensure no duplicates exist
DROP POLICY IF EXISTS "Executives and managers can view one liners" ON one_liners;
DROP POLICY IF EXISTS "Management can view all one liners" ON one_liners;
DROP POLICY IF EXISTS "Authorized users can view one liners" ON one_liners;

CREATE POLICY "Authorized users can view one liners"
  ON one_liners FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('executive', 'content_manager', 'management', 'admin')
  );

-- ============================================================================
-- 5. Verify episodic_evaluations includes management role
-- ============================================================================
-- Should already include management from previous fixes, but verify
DROP POLICY IF EXISTS "Evaluators can view own evaluations" ON episodic_evaluations;

CREATE POLICY "Evaluators can view own evaluations"
  ON episodic_evaluations FOR SELECT
  TO authenticated
  USING (
    evaluator_id = (SELECT id FROM users WHERE id = auth.uid())
    OR get_user_role() IN ('content_manager', 'management', 'admin')
  );
