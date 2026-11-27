-- One-liner approval votes get a third value, 'needs_revision'.
-- A management "needs improvement" evaluation used to be stored as a 'rejected' vote, which marked
-- the story rejected and told the whole team "Story rejected". Now: approved only when both
-- mandatory approvers approve (plus the third approver), rejected only on an explicit reject,
-- and any needs_revision vote keeps the project "in process".

ALTER TABLE public.story_approvals DROP CONSTRAINT IF EXISTS story_approvals_decision_check;
ALTER TABLE public.story_approvals
  ADD CONSTRAINT story_approvals_decision_check CHECK (decision IN ('approved', 'rejected', 'needs_revision'));

-- Existing votes stored as 'rejected' whose voter's own evaluation of that round said
-- needs_improvement (production on 2026-11-27: only Pukaar, Salman Ahmed, 2026-11-23).
WITH wrong AS (
  SELECT sa.id, sa.call_report_id
  FROM public.story_approvals sa
  WHERE sa.decision = 'rejected'
    AND (SELECT ef.decision FROM public.evaluator_forms ef
          WHERE ef.call_report_id = sa.call_report_id AND ef.evaluator_id = sa.user_id
            AND ef.revision_id IS NOT DISTINCT FROM sa.revision_id
          ORDER BY ef.submitted_at DESC NULLS LAST LIMIT 1) = 'needs_improvement'
), fixed AS (
  UPDATE public.story_approvals sa SET decision = 'needs_revision', updated_at = now()
  FROM wrong WHERE sa.id = wrong.id
  RETURNING sa.call_report_id
),
-- Undo what the false rejection did, unless an explicit reject vote still stands on that project
clean AS (
  SELECT DISTINCT f.call_report_id FROM fixed f
  WHERE NOT EXISTS (SELECT 1 FROM public.story_approvals r
                    WHERE r.call_report_id = f.call_report_id AND r.decision = 'rejected'
                      AND r.id NOT IN (SELECT id FROM wrong))
), story_fix AS (
  UPDATE public.stories s SET status = 'submitted'
  FROM public.call_reports cr
  WHERE cr.id IN (SELECT call_report_id FROM clean) AND s.id = cr.story_id AND s.status = 'rejected'
  RETURNING s.id
)
DELETE FROM public.evaluation_logs el
WHERE el.call_report_id IN (SELECT call_report_id FROM clean) AND el.final_decision = 'rejected';
