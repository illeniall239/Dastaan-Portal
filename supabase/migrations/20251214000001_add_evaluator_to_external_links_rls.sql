-- Migration: Add Evaluator Role to External Evaluation Links RLS Policies
-- Date: 2025-12-14
-- Description: Updates RLS policies to allow evaluators to create and manage external evaluation links

-- =====================================================
-- Update RLS Policies for external_evaluation_links
-- =====================================================

-- Drop and recreate SELECT policy
DROP POLICY IF EXISTS "Management can view all external links" ON external_evaluation_links;
CREATE POLICY "Management and evaluators can view all external links"
  ON external_evaluation_links
  FOR SELECT
  USING (
    get_user_role() IN ('admin', 'management', 'executive', 'evaluator')
  );

-- Drop and recreate INSERT policy
DROP POLICY IF EXISTS "Management can create external links" ON external_evaluation_links;
CREATE POLICY "Management and evaluators can create external links"
  ON external_evaluation_links
  FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'management', 'executive', 'evaluator')
  );

-- Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "Management can update their own external links" ON external_evaluation_links;
CREATE POLICY "Management and evaluators can update their own external links"
  ON external_evaluation_links
  FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'management', 'executive', 'evaluator')
  );

-- Drop and recreate DELETE policy (from fix_rls_performance_warnings)
DROP POLICY IF EXISTS "external_evaluation_links_delete_policy" ON external_evaluation_links;
DROP POLICY IF EXISTS "Management can delete their own external links" ON external_evaluation_links;
CREATE POLICY "Management and evaluators can delete their own external links"
  ON external_evaluation_links
  FOR DELETE
  USING (
    get_user_role() IN ('admin', 'management', 'executive', 'evaluator')
    AND created_by = auth.uid()
  );

-- =====================================================
-- Update RLS Policies for external_evaluations
-- =====================================================

-- Drop and recreate SELECT policy
DROP POLICY IF EXISTS "Management can view all external evaluations" ON external_evaluations;
CREATE POLICY "Management and evaluators can view all external evaluations"
  ON external_evaluations
  FOR SELECT
  USING (
    get_user_role() IN ('admin', 'management', 'executive', 'evaluator')
  );

-- =====================================================
-- Verification
-- =====================================================

DO $$
DECLARE
  v_policies_count INTEGER;
BEGIN
  -- Count policies that include evaluator role
  SELECT COUNT(*)
  INTO v_policies_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('external_evaluation_links', 'external_evaluations')
  AND policyname LIKE '%evaluator%';

  IF v_policies_count >= 5 THEN
    RAISE NOTICE '✅ Migration successful: Evaluator role added to external evaluation RLS policies';
  ELSE
    RAISE WARNING '⚠️ Migration may have failed - expected at least 5 policies with evaluator role';
  END IF;
END $$;
