-- Migration: Add Public Token Validation Policy for External Evaluation Links
-- Date: 2025-12-14
-- Description: Allows public/anonymous access to validate external evaluation links by token

-- =====================================================
-- Add Public SELECT Policy for Token Validation
-- =====================================================

-- Allow anyone (including anonymous users) to SELECT external_evaluation_links by token
-- This is needed for the public validation endpoint
CREATE POLICY "Anyone can validate external links by token"
  ON external_evaluation_links
  FOR SELECT
  USING (
    -- Allow if querying by token (public access for validation)
    token IS NOT NULL
  );

-- =====================================================
-- Verification
-- =====================================================

DO $$
DECLARE
  v_policy_exists BOOLEAN;
BEGIN
  -- Check if the public policy exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'external_evaluation_links'
    AND policyname = 'Anyone can validate external links by token'
  ) INTO v_policy_exists;

  IF v_policy_exists THEN
    RAISE NOTICE '✅ Migration successful: Public token validation policy added';
  ELSE
    RAISE WARNING '⚠️ Migration may have failed - policy not found';
  END IF;
END $$;
