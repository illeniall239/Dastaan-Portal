-- =====================================================
-- Fix Management Portal RLS Policies
-- =====================================================
-- This migration adds 'management' role to RLS policies
-- for episodic_evaluations and episodes tables to restore
-- full functionality to the management portal.
--
-- Issue: Management role was unable to view episodic evaluations
-- and had incomplete access to episodes table, breaking multiple
-- dashboard sections.
-- =====================================================

-- =====================================================
-- Fix episodic_evaluations SELECT policy
-- =====================================================
-- Drop existing policy
DROP POLICY IF EXISTS "Evaluators can view own evaluations" ON public.episodic_evaluations;

-- Recreate with management role included
CREATE POLICY "Evaluators can view own evaluations"
  ON public.episodic_evaluations FOR SELECT
  TO authenticated
  USING (
    evaluator_id = auth.uid() OR
    get_user_role() IN ('content_manager', 'management', 'admin')
  );

-- =====================================================
-- Fix episodes SELECT policy
-- =====================================================
-- Drop existing policy
DROP POLICY IF EXISTS "Content users and evaluators can view episodes" ON public.episodes;

-- Recreate with management role explicitly included
CREATE POLICY "Content users and evaluators can view episodes"
  ON public.episodes FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('content_creator', 'content_manager', 'evaluator', 'executive', 'management', 'admin')
  );

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON POLICY "Evaluators can view own evaluations" ON public.episodic_evaluations IS
'Evaluators can view their own evaluations. Content managers, management, and admins can view all evaluations.';

COMMENT ON POLICY "Content users and evaluators can view episodes" ON public.episodes IS
'Content creators, managers, evaluators, executives, management, and admins can view all episodes.';
