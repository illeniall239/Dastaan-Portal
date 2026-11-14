-- STAGING ONLY. Makes staging's evaluator_forms triggers match production's.
--
-- Why: staging runs process_evaluation_completion() from two triggers that production doesn't have.
-- It sets evaluation_status from a CASE that yields text, so every submitted one-liner evaluation
-- fails with: column "evaluation_status" is of type evaluation_status but expression is of type text.
-- Production instead runs process_content_head_decision() on decision updates — staging was missing it.
-- (Trigger definitions copied from production on 2026-11-14.)

DROP TRIGGER IF EXISTS evaluation_completion_trigger ON public.evaluator_forms;
DROP TRIGGER IF EXISTS trigger_evaluation_completion ON public.evaluator_forms;

CREATE OR REPLACE TRIGGER trigger_process_content_head_decision
  AFTER UPDATE OF decision ON public.evaluator_forms
  FOR EACH ROW EXECUTE FUNCTION process_content_head_decision();

-- Check: should list exactly production's six —
-- auto_calculate_evaluation_average, evaluator_forms_auto_team_id, trg_calculate_evaluation_average,
-- trg_update_cross_team_share, trigger_process_content_head_decision, trigger_update_call_report_evaluation_counts
SELECT tgname, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'public.evaluator_forms'::regclass AND NOT tgisinternal
ORDER BY tgname;
