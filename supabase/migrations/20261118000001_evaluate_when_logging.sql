-- Evaluate-when-logging, enforced by the database.
--
-- Rule: when someone in a must-evaluate role (evaluator, programmer, management, executive — the same
-- list as MUST_EVALUATE_ROLES in lib/episodes/permissions.ts) logs a one-liner, an episode, an episode
-- revision or a one-liner revision, their own evaluation of it must be saved in the SAME transaction.
-- Otherwise the whole save is rejected at commit — whichever page, API route, script or direct request
-- sent it. Items logged before this migration are not checked.
--
-- 1. must_evaluate_on_log(user)            — the role list, in one place on the database side
-- 2. require_logger_evaluation()           — commit-time check on the four item tables
-- 3. protect_logger_evaluation()           — the required evaluation can't later be deleted/re-pointed
--                                            while its item exists (edit it instead)
-- 4. insert_json_row / random_code         — helpers for the functions below (server-only)
-- 5. log_*_with_evaluation(...)            — save an item and its evaluation as one unit (server-only)
--
-- Run on STAGING first, then production. Safe to re-run.

-- ── 1. Who must evaluate what they log ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.must_evaluate_on_log(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user AND role IN ('evaluator', 'programmer', 'management', 'executive')
  );
$$;

-- ── 2. Commit-time check: the item's logger evaluated it in the same transaction ───────────────────
CREATE OR REPLACE FUNCTION public.require_logger_evaluation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_logger uuid;
  v_ok boolean;
  v_what text;
BEGIN
  IF TG_TABLE_NAME = 'episodes' THEN
    v_logger := NEW.logged_by;
    IF NOT must_evaluate_on_log(v_logger) THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM episodes WHERE id = NEW.id) THEN RETURN NULL; END IF;  -- removed again before commit
    v_what := format('Episode %s', NEW.episode_number);
    v_ok := EXISTS (SELECT 1 FROM episodic_evaluations
                    WHERE episode_id = NEW.id AND revision_id IS NULL AND evaluator_id = v_logger);

  ELSIF TG_TABLE_NAME = 'episode_revisions' THEN
    v_logger := NEW.uploaded_by;
    IF NOT must_evaluate_on_log(v_logger) THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM episode_revisions WHERE id = NEW.id) THEN RETURN NULL; END IF;
    v_what := format('Revision %s', NEW.revision_number);
    v_ok := EXISTS (SELECT 1 FROM episodic_evaluations
                    WHERE revision_id = NEW.id AND evaluator_id = v_logger);

  ELSIF TG_TABLE_NAME = 'call_reports' THEN
    IF NEW.meeting_type IS DISTINCT FROM 'call_report' THEN RETURN NULL; END IF;
    v_logger := NEW.created_by;
    IF NOT must_evaluate_on_log(v_logger) THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM call_reports WHERE id = NEW.id) THEN RETURN NULL; END IF;
    v_what := 'The one-liner';
    v_ok := EXISTS (SELECT 1 FROM evaluator_forms
                    WHERE call_report_id = NEW.id AND revision_id IS NULL AND evaluator_id = v_logger
                      AND submitted_at IS NOT NULL);

  ELSIF TG_TABLE_NAME = 'call_report_revisions' THEN
    v_logger := NEW.uploaded_by;
    IF NOT must_evaluate_on_log(v_logger) THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM call_report_revisions WHERE id = NEW.id) THEN RETURN NULL; END IF;
    v_what := format('Revision %s', NEW.revision_number);
    v_ok := EXISTS (SELECT 1 FROM evaluator_forms
                    WHERE revision_id = NEW.id AND evaluator_id = v_logger AND submitted_at IS NOT NULL);
  ELSE
    RETURN NULL;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = format('EVALUATION_REQUIRED: %s must be saved together with your evaluation of it.', v_what),
      HINT = 'evaluation_required';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS require_logger_evaluation ON public.episodes;
CREATE CONSTRAINT TRIGGER require_logger_evaluation
  AFTER INSERT ON public.episodes DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.require_logger_evaluation();

DROP TRIGGER IF EXISTS require_logger_evaluation ON public.episode_revisions;
CREATE CONSTRAINT TRIGGER require_logger_evaluation
  AFTER INSERT ON public.episode_revisions DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.require_logger_evaluation();

DROP TRIGGER IF EXISTS require_logger_evaluation ON public.call_reports;
CREATE CONSTRAINT TRIGGER require_logger_evaluation
  AFTER INSERT ON public.call_reports DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.require_logger_evaluation();

DROP TRIGGER IF EXISTS require_logger_evaluation ON public.call_report_revisions;
CREATE CONSTRAINT TRIGGER require_logger_evaluation
  AFTER INSERT ON public.call_report_revisions DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.require_logger_evaluation();

-- ── 3. The required evaluation stays: no deleting it or moving it off its item ─────────────────────
-- Applies only while the item still exists, so deleting an item (cascade) or a revision (which sets the
-- evaluation's revision_id to NULL) still works. Editing scores, comments and decisions is unaffected.
CREATE OR REPLACE FUNCTION public.protect_logger_evaluation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'episodic_evaluations'
       AND NEW.episode_id IS NOT DISTINCT FROM OLD.episode_id
       AND NEW.revision_id IS NOT DISTINCT FROM OLD.revision_id
       AND NEW.evaluator_id IS NOT DISTINCT FROM OLD.evaluator_id THEN
      RETURN NEW;
    END IF;
    IF TG_TABLE_NAME = 'evaluator_forms'
       AND NEW.call_report_id IS NOT DISTINCT FROM OLD.call_report_id
       AND NEW.revision_id IS NOT DISTINCT FROM OLD.revision_id
       AND NEW.evaluator_id IS NOT DISTINCT FROM OLD.evaluator_id
       AND (NEW.submitted_at IS NOT NULL OR OLD.submitted_at IS NULL) THEN
      RETURN NEW;
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
  ELSIF TG_TABLE_NAME = 'evaluator_forms' AND OLD.submitted_at IS NOT NULL THEN
    IF OLD.revision_id IS NULL THEN
      v_required := EXISTS (SELECT 1 FROM call_reports WHERE id = OLD.call_report_id AND created_by = OLD.evaluator_id
                              AND meeting_type = 'call_report');
    ELSE
      v_required := EXISTS (SELECT 1 FROM call_report_revisions WHERE id = OLD.revision_id AND uploaded_by = OLD.evaluator_id);
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

DROP TRIGGER IF EXISTS protect_logger_evaluation ON public.episodic_evaluations;
CREATE TRIGGER protect_logger_evaluation
  BEFORE DELETE OR UPDATE ON public.episodic_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.protect_logger_evaluation();

DROP TRIGGER IF EXISTS protect_logger_evaluation ON public.evaluator_forms;
CREATE TRIGGER protect_logger_evaluation
  BEFORE DELETE OR UPDATE ON public.evaluator_forms
  FOR EACH ROW EXECUTE FUNCTION public.protect_logger_evaluation();

-- ── 4. Helpers (server-only) ────────────────────────────────────────────────────────────────────────
-- Insert one row from JSON, setting only the columns present (so column defaults and triggers still
-- apply to the rest). Returns the inserted row. Restricted to the tables the logging functions write.
CREATE OR REPLACE FUNCTION public.insert_json_row(p_table text, p_row jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_cols text;
  v_out jsonb;
BEGIN
  IF p_table NOT IN ('stories', 'call_reports', 'call_report_revisions', 'episodes', 'episode_revisions',
                     'episodic_evaluations', 'evaluator_forms') THEN
    RAISE EXCEPTION 'insert_json_row: table % is not allowed', p_table;
  END IF;
  SELECT string_agg(quote_ident(k), ', ') INTO v_cols FROM jsonb_object_keys(p_row) AS k;
  IF v_cols IS NULL THEN
    RAISE EXCEPTION 'insert_json_row: no columns given for %', p_table;
  END IF;
  EXECUTE format(
    'INSERT INTO public.%1$I AS t (%2$s) SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I, $1) RETURNING to_jsonb(t.*)',
    p_table, v_cols)
  USING p_row INTO v_out;
  RETURN v_out;
END;
$$;

-- A free PREFIX-YYYY-NNNN code (ST-, CR-, EVAL-) for a unique column, in Pakistan time's year.
CREATE OR REPLACE FUNCTION public.random_code(p_prefix text, p_table text, p_column text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_taken boolean;
BEGIN
  IF p_table NOT IN ('stories', 'call_reports', 'evaluator_forms') THEN
    RAISE EXCEPTION 'random_code: table % is not allowed', p_table;
  END IF;
  FOR i IN 1..50 LOOP
    v_code := format('%s-%s-%s', p_prefix, to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYYY'),
                     lpad((floor(random() * 10000))::int::text, 4, '0'));
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE %I = $1)', p_table, p_column) USING v_code INTO v_taken;
    IF NOT v_taken THEN RETURN v_code; END IF;
  END LOOP;
  RAISE EXCEPTION 'random_code: no free % code after 50 tries', p_prefix;
END;
$$;

-- ── 5. Save an item together with its logger's evaluation, as one unit ─────────────────────────────

-- Episodes: p_episodes = [{episode row}], p_evaluations = [{evaluation row + "episode_number"}]
CREATE OR REPLACE FUNCTION public.log_episodes_with_evaluations(p_episodes jsonb, p_evaluations jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  ep jsonb;
  ev jsonb;
  v_eps jsonb := '[]'::jsonb;
  v_evs jsonb := '[]'::jsonb;
  v_episode_id uuid;
BEGIN
  IF jsonb_typeof(p_episodes) <> 'array' OR jsonb_array_length(p_episodes) = 0 THEN
    RAISE EXCEPTION 'log_episodes_with_evaluations: no episodes given';
  END IF;
  FOR ep IN SELECT value FROM jsonb_array_elements(p_episodes) LOOP
    v_eps := v_eps || jsonb_build_array(insert_json_row('episodes', ep));
  END LOOP;
  FOR ev IN SELECT value FROM jsonb_array_elements(coalesce(p_evaluations, '[]'::jsonb)) LOOP
    SELECT (e->>'id')::uuid INTO v_episode_id
    FROM jsonb_array_elements(v_eps) AS e
    WHERE (e->>'episode_number')::int = (ev->>'episode_number')::int;
    IF v_episode_id IS NULL THEN
      RAISE EXCEPTION 'EVALUATION_REQUIRED: an evaluation is for an episode that isn''t in this batch.';
    END IF;
    v_evs := v_evs || jsonb_build_array(
      insert_json_row('episodic_evaluations', (ev - 'episode_number') || jsonb_build_object('episode_id', v_episode_id)));
  END LOOP;
  RETURN jsonb_build_object('episodes', v_eps, 'evaluations', v_evs);
END;
$$;

-- Episode revision: revision_number is assigned here (locked, so two uploads can't take the same one)
CREATE OR REPLACE FUNCTION public.log_episode_revision_with_evaluation(p_revision jsonb, p_evaluation jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_episode_id uuid := (p_revision->>'episode_id')::uuid;
  v_next int;
  v_rev jsonb;
  v_eval jsonb;
BEGIN
  PERFORM 1 FROM episodes WHERE id = v_episode_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'log_episode_revision_with_evaluation: episode % not found', v_episode_id; END IF;
  SELECT coalesce(max(revision_number), 0) + 1 INTO v_next FROM episode_revisions WHERE episode_id = v_episode_id;
  v_rev := insert_json_row('episode_revisions', p_revision || jsonb_build_object('revision_number', v_next));
  IF jsonb_typeof(p_evaluation) = 'object' THEN
    v_eval := insert_json_row('episodic_evaluations',
      p_evaluation || jsonb_build_object('episode_id', v_episode_id, 'revision_id', v_rev->>'id'));
  END IF;
  RETURN jsonb_build_object('revision', v_rev, 'evaluation', v_eval);
END;
$$;

-- One-liner revision
CREATE OR REPLACE FUNCTION public.log_call_report_revision_with_evaluation(p_revision jsonb, p_evaluation jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_call_report_id uuid := (p_revision->>'call_report_id')::uuid;
  v_next int;
  v_rev jsonb;
  v_eval jsonb;
BEGIN
  PERFORM 1 FROM call_reports WHERE id = v_call_report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'log_call_report_revision_with_evaluation: one-liner % not found', v_call_report_id; END IF;
  SELECT coalesce(max(revision_number), 0) + 1 INTO v_next FROM call_report_revisions WHERE call_report_id = v_call_report_id;
  v_rev := insert_json_row('call_report_revisions', p_revision || jsonb_build_object('revision_number', v_next));
  IF jsonb_typeof(p_evaluation) = 'object' THEN
    v_eval := insert_json_row('evaluator_forms',
      p_evaluation || jsonb_build_object('call_report_id', v_call_report_id, 'revision_id', v_rev->>'id',
                                         'form_id', random_code('EVAL', 'evaluator_forms', 'form_id')));
  END IF;
  RETURN jsonb_build_object('revision', v_rev, 'evaluation', v_eval);
END;
$$;

-- One-liner (story + call report) with its logger's evaluation. Codes ST-/CR-/EVAL- are assigned here.
CREATE OR REPLACE FUNCTION public.log_call_report_with_evaluation(p_story jsonb, p_call_report jsonb, p_evaluation jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_story jsonb;
  v_cr jsonb;
  v_eval jsonb;
BEGIN
  v_story := insert_json_row('stories',
    p_story || jsonb_build_object('story_id', random_code('ST', 'stories', 'story_id')));
  v_cr := insert_json_row('call_reports',
    p_call_report || jsonb_build_object('story_id', v_story->>'id',
                                        'call_report_id', random_code('CR', 'call_reports', 'call_report_id')));
  IF jsonb_typeof(p_evaluation) = 'object' THEN
    v_eval := insert_json_row('evaluator_forms',
      p_evaluation || jsonb_build_object('call_report_id', v_cr->>'id',
                                         'form_id', random_code('EVAL', 'evaluator_forms', 'form_id')));
  END IF;
  RETURN jsonb_build_object('story', v_story, 'call_report', v_cr, 'evaluation', v_eval);
END;
$$;

-- Server-only: the API routes call these with the service role after their own checks.
-- Nobody signed in from a browser can call them (or the helpers) directly.
REVOKE ALL ON FUNCTION public.insert_json_row(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.random_code(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_episodes_with_evaluations(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_episode_revision_with_evaluation(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_call_report_revision_with_evaluation(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_call_report_with_evaluation(jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_json_row(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.random_code(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_episodes_with_evaluations(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_episode_revision_with_evaluation(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_call_report_revision_with_evaluation(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_call_report_with_evaluation(jsonb, jsonb, jsonb) TO service_role;

-- Check: the four commit-time checks and two protections are in place
SELECT c.relname AS table_name, t.tgname AS trigger_name, t.tgdeferrable AS checked_at_commit
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
WHERE t.tgname IN ('require_logger_evaluation', 'protect_logger_evaluation')
ORDER BY 1, 2;
