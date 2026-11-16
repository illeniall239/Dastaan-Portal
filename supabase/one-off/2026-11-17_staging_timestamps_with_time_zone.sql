-- STAGING ONLY. Makes staging's timestamp columns match production (timestamp WITH time zone).
--
-- Why: on staging these 5 columns are "timestamp without time zone", so the API returns them without an
-- offset ("2026-10-30T05:50:27") and both the server and the browser read them as local time. Production
-- returns "+00:00", where the server (UTC) and Pakistan browsers format them differently - the React #418
-- error users hit. Staging must behave like production to reproduce and test that.
--
-- Values were written as UTC (toISOString), so they convert AT TIME ZONE 'UTC' - no moment in time changes.
-- Views that read these columns (e.g. consolidated_cms_view) block a type change, so their own definitions
-- and options are saved first, the views dropped, the columns converted, and the views recreated unchanged.
--
-- Staging also computes call_reports.end_time as a GENERATED column from meeting_date (which blocks the
-- change too). Production instead stores it as a plain column filled by trigger trg_update_call_report_end_time.
-- The generated column is replaced with production's column + trigger (definitions copied 2026-11-17).

DO $$
DECLARE
  v RECORD;
  saved jsonb := '[]'::jsonb;
  item jsonb;
BEGIN
  -- 1. Save every view that reads one of the columns being converted
  FOR v IN
    SELECT DISTINCT c.oid, c.relname, pg_get_viewdef(c.oid, true) AS def, c.reloptions
    FROM pg_depend d
    JOIN pg_rewrite r ON r.oid = d.objid
    JOIN pg_class c ON c.oid = r.ev_class AND c.relkind = 'v'
    JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    WHERE (d.refobjid = 'public.call_reports'::regclass AND a.attname IN ('created_at', 'meeting_date', 'updated_at', 'end_time'))
       OR (d.refobjid = 'public.audit_logs'::regclass  AND a.attname = 'timestamp')
       OR (d.refobjid = 'public.attachments'::regclass AND a.attname = 'uploaded_at')
    ORDER BY c.oid
  LOOP
    saved := saved || jsonb_build_object('name', v.relname, 'def', v.def, 'options', coalesce(array_to_string(v.reloptions, ', '), ''));
    RAISE NOTICE 'saving view %', v.relname;
  END LOOP;

  -- 2. Drop them (newest first)
  FOR item IN SELECT t.value FROM jsonb_array_elements(saved) WITH ORDINALITY AS t(value, n) ORDER BY t.n DESC LOOP
    EXECUTE format('DROP VIEW public.%I', item->>'name');
  END LOOP;

  -- 3. Replace staging's generated end_time (it blocks the type change), then convert the columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'call_reports'
             AND column_name = 'end_time' AND is_generated = 'ALWAYS') THEN
    ALTER TABLE public.call_reports DROP COLUMN end_time;
    RAISE NOTICE 'dropped generated end_time';
  END IF;

  ALTER TABLE public.call_reports
    ALTER COLUMN created_at   TYPE timestamptz USING created_at   AT TIME ZONE 'UTC',
    ALTER COLUMN meeting_date TYPE timestamptz USING meeting_date AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at   TYPE timestamptz USING updated_at   AT TIME ZONE 'UTC';
  ALTER TABLE public.audit_logs  ALTER COLUMN "timestamp" TYPE timestamptz USING "timestamp" AT TIME ZONE 'UTC';
  ALTER TABLE public.attachments ALTER COLUMN uploaded_at TYPE timestamptz USING uploaded_at AT TIME ZONE 'UTC';

  -- end_time as on production: a plain column kept up to date by a trigger
  ALTER TABLE public.call_reports ADD COLUMN IF NOT EXISTS end_time timestamptz;
  ALTER TABLE public.call_reports DISABLE TRIGGER USER;   -- fill without bumping updated_at
  UPDATE public.call_reports SET end_time = meeting_date + (COALESCE(duration_minutes, 60) * INTERVAL '1 minute');
  ALTER TABLE public.call_reports ENABLE TRIGGER USER;

  CREATE OR REPLACE FUNCTION public.update_call_report_end_time()
   RETURNS trigger
   LANGUAGE plpgsql
  AS $fn$
  BEGIN
    NEW.end_time := NEW.meeting_date + (COALESCE(NEW.duration_minutes, 60) * INTERVAL '1 minute');
    RETURN NEW;
  END;
  $fn$;
  DROP TRIGGER IF EXISTS trg_update_call_report_end_time ON public.call_reports;
  CREATE TRIGGER trg_update_call_report_end_time BEFORE INSERT OR UPDATE OF meeting_date, duration_minutes
    ON public.call_reports FOR EACH ROW EXECUTE FUNCTION public.update_call_report_end_time();

  -- 4. Recreate the views exactly as they were (oldest first), with their grants
  FOR item IN SELECT t.value FROM jsonb_array_elements(saved) WITH ORDINALITY AS t(value, n) ORDER BY t.n LOOP
    EXECUTE format('CREATE VIEW public.%I %s AS %s',
      item->>'name',
      CASE WHEN item->>'options' <> '' THEN 'WITH (' || (item->>'options') || ')' ELSE '' END,
      item->>'def');
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', item->>'name');
    RAISE NOTICE 'recreated view %', item->>'name';
  END LOOP;
END $$;

-- Check: every row should say "timestamp with time zone"
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (('call_reports','created_at'), ('call_reports','meeting_date'), ('call_reports','updated_at'), ('call_reports','end_time'),
                                    ('audit_logs','timestamp'), ('attachments','uploaded_at'))
ORDER BY 1, 2;
