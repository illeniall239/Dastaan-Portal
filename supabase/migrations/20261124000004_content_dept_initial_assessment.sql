-- ============================================================================
-- Content department uploads must carry an initial assessment
--
-- A one-liner (call_reports.overall_rating) or episode (episodes.initial_assessment) logged by the
-- content department (content_creator / content_manager) can't be saved without one, and it can't
-- later be cleared. Enforced here so no path (form, API, script) can skip it; the forms ask for it
-- up front.
--
-- Checked on production 24 Nov 2026: every existing content-creator one-liner and episode already
-- has one, so nothing existing is affected.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.require_content_dept_initial_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'call_reports' THEN
    IF NEW.meeting_type = 'call_report' AND NEW.overall_rating IS NULL
       AND EXISTS (SELECT 1 FROM users WHERE id = NEW.created_by AND role IN ('content_creator', 'content_manager')) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'INITIAL_ASSESSMENT_REQUIRED: Give the one-liner an initial assessment (1-10) before logging it.',
        HINT = 'initial_assessment_required';
    END IF;
  ELSE
    IF NEW.initial_assessment IS NULL
       AND EXISTS (SELECT 1 FROM users WHERE id = NEW.logged_by AND role IN ('content_creator', 'content_manager')) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = format('INITIAL_ASSESSMENT_REQUIRED: Give Episode %s an initial assessment (1-10) before logging it.', NEW.episode_number),
        HINT = 'initial_assessment_required';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_content_dept_initial_assessment ON public.call_reports;
CREATE TRIGGER require_content_dept_initial_assessment
  BEFORE INSERT OR UPDATE OF overall_rating ON public.call_reports
  FOR EACH ROW EXECUTE FUNCTION public.require_content_dept_initial_assessment();

DROP TRIGGER IF EXISTS require_content_dept_initial_assessment ON public.episodes;
CREATE TRIGGER require_content_dept_initial_assessment
  BEFORE INSERT OR UPDATE OF initial_assessment ON public.episodes
  FOR EACH ROW EXECUTE FUNCTION public.require_content_dept_initial_assessment();

-- Check: content-dept uploads without an initial assessment (should be 0 and 0)
SELECT
  (SELECT count(*) FROM call_reports c JOIN users u ON u.id = c.created_by
    WHERE u.role IN ('content_creator', 'content_manager') AND c.meeting_type = 'call_report' AND c.overall_rating IS NULL) AS one_liners_without,
  (SELECT count(*) FROM episodes e JOIN users u ON u.id = e.logged_by
    WHERE u.role IN ('content_creator', 'content_manager') AND e.initial_assessment IS NULL) AS episodes_without;
