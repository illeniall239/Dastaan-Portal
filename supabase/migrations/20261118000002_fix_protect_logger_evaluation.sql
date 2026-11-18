-- Fix for 20261118000001_evaluate_when_logging.sql, protect_logger_evaluation():
-- 1. Editing a one-liner evaluation failed with: record "new" has no field "episode_id".
--    plpgsql doesn't short-circuit AND, so the episodic_evaluations column check ran on evaluator_forms too.
--    Each table's check is now in its own IF.
-- 2. Deleting a one-liner, episode or revision was blocked by its own evaluations being removed with it.
--    The protection now applies only to a direct delete/change of the evaluation (trigger depth 1);
--    removals done by the database itself (ON DELETE CASCADE / SET NULL from deleting the item) pass.

CREATE OR REPLACE FUNCTION public.protect_logger_evaluation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required boolean := false;
BEGIN
  -- Cascades from deleting the item itself (or one of its revisions)
  IF pg_trigger_depth() > 1 THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- Edits that keep the evaluation on its item, by its evaluator, are always fine
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'episodic_evaluations' THEN
      IF NEW.episode_id IS NOT DISTINCT FROM OLD.episode_id
         AND NEW.revision_id IS NOT DISTINCT FROM OLD.revision_id
         AND NEW.evaluator_id IS NOT DISTINCT FROM OLD.evaluator_id THEN
        RETURN NEW;
      END IF;
    ELSIF TG_TABLE_NAME = 'evaluator_forms' THEN
      IF NEW.call_report_id IS NOT DISTINCT FROM OLD.call_report_id
         AND NEW.revision_id IS NOT DISTINCT FROM OLD.revision_id
         AND NEW.evaluator_id IS NOT DISTINCT FROM OLD.evaluator_id
         AND (NEW.submitted_at IS NOT NULL OR OLD.submitted_at IS NULL) THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  IF NOT must_evaluate_on_log(OLD.evaluator_id) THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_TABLE_NAME = 'episodic_evaluations' THEN
    IF OLD.revision_id IS NULL THEN
      v_required := EXISTS (SELECT 1 FROM episodes WHERE id = OLD.episode_id AND logged_by = OLD.evaluator_id);
    ELSE
      v_required := EXISTS (SELECT 1 FROM episode_revisions WHERE id = OLD.revision_id AND uploaded_by = OLD.evaluator_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'evaluator_forms' THEN
    IF OLD.submitted_at IS NOT NULL THEN
      IF OLD.revision_id IS NULL THEN
        v_required := EXISTS (SELECT 1 FROM call_reports WHERE id = OLD.call_report_id AND created_by = OLD.evaluator_id
                                AND meeting_type = 'call_report');
      ELSE
        v_required := EXISTS (SELECT 1 FROM call_report_revisions WHERE id = OLD.revision_id AND uploaded_by = OLD.evaluator_id);
      END IF;
    END IF;
  END IF;

  IF v_required THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'EVALUATION_REQUIRED: This is your evaluation of something you logged, so it can''t be removed. Edit it instead.',
      HINT = 'evaluation_required';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
