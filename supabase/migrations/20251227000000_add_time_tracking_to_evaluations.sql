-- =====================================================
-- Add Time Tracking to Evaluator Activities
-- =====================================================
-- Adds time_spent_minutes field to track actual time evaluators spend on forms
-- Supports "mins per day" metric in management dashboard
-- =====================================================

-- =====================================================
-- Add time tracking to evaluator_forms
-- =====================================================
ALTER TABLE public.evaluator_forms
  ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.evaluator_forms.time_spent_minutes IS
  'Total accumulated minutes spent working on this evaluation (tracked in frontend)';
COMMENT ON COLUMN public.evaluator_forms.started_at IS
  'Timestamp when evaluator first opened this evaluation form';

-- =====================================================
-- Add time tracking to episodic_evaluations
-- =====================================================
ALTER TABLE public.episodic_evaluations
  ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.episodic_evaluations.time_spent_minutes IS
  'Total accumulated minutes spent working on this evaluation (tracked in frontend)';
COMMENT ON COLUMN public.episodic_evaluations.started_at IS
  'Timestamp when evaluator first opened this evaluation form';

-- =====================================================
-- Add time tracking to call_reports (evaluator-created)
-- =====================================================
ALTER TABLE public.call_reports
  ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS form_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.call_reports.time_spent_minutes IS
  'Total accumulated minutes spent creating this call report (tracked in frontend)';
COMMENT ON COLUMN public.call_reports.form_started_at IS
  'Timestamp when evaluator first opened the call report creation form';

-- =====================================================
-- Add time tracking to draft tables
-- =====================================================
ALTER TABLE public.evaluator_form_drafts
  ADD COLUMN IF NOT EXISTS accumulated_time_minutes INTEGER DEFAULT 0;

COMMENT ON COLUMN public.evaluator_form_drafts.accumulated_time_minutes IS
  'Running total of minutes spent so far (persisted across sessions)';

ALTER TABLE public.episodic_evaluation_drafts
  ADD COLUMN IF NOT EXISTS accumulated_time_minutes INTEGER DEFAULT 0;

COMMENT ON COLUMN public.episodic_evaluation_drafts.accumulated_time_minutes IS
  'Running total of minutes spent so far (persisted across sessions)';

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_time_tracking
  ON public.evaluator_forms(evaluator_id, started_at)
  WHERE time_spent_minutes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_episodic_evals_time_tracking
  ON public.episodic_evaluations(evaluator_id, started_at)
  WHERE time_spent_minutes IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_reports_time_tracking
  ON public.call_reports(created_by, form_started_at)
  WHERE time_spent_minutes IS NOT NULL;

-- =====================================================
-- Verification
-- =====================================================
DO $$
DECLARE
  ef_time_col_count INTEGER;
  ep_time_col_count INTEGER;
  cr_time_col_count INTEGER;
  draft_col_count INTEGER;
BEGIN
  -- Check evaluator_forms columns
  SELECT COUNT(*) INTO ef_time_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'evaluator_forms'
    AND column_name IN ('time_spent_minutes', 'started_at');

  -- Check episodic_evaluations columns
  SELECT COUNT(*) INTO ep_time_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'episodic_evaluations'
    AND column_name IN ('time_spent_minutes', 'started_at');

  -- Check call_reports columns
  SELECT COUNT(*) INTO cr_time_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'call_reports'
    AND column_name IN ('time_spent_minutes', 'form_started_at');

  -- Check draft tables
  SELECT COUNT(*) INTO draft_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      (table_name = 'evaluator_form_drafts' AND column_name = 'accumulated_time_minutes') OR
      (table_name = 'episodic_evaluation_drafts' AND column_name = 'accumulated_time_minutes')
    );

  RAISE NOTICE '✅ SUCCESS: Time tracking fields added';
  RAISE NOTICE '   - evaluator_forms: % time columns', ef_time_col_count;
  RAISE NOTICE '   - episodic_evaluations: % time columns', ep_time_col_count;
  RAISE NOTICE '   - call_reports: % time columns', cr_time_col_count;
  RAISE NOTICE '   - draft tables: % time columns', draft_col_count;

  IF ef_time_col_count != 2 OR ep_time_col_count != 2 OR cr_time_col_count != 2 OR draft_col_count != 2 THEN
    RAISE WARNING '⚠️  WARNING: Some columns may not have been created correctly';
  END IF;
END;
$$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
