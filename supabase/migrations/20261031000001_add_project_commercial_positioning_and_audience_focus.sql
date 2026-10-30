-- Project-level Commercial Positioning and Gender POV.
-- Same values as evaluator_forms.theme_category / evaluator_forms.audience_focus.
-- The project is the single source for these tags; the evaluation form stops asking them.
-- Nullable: existing projects stay valid; the logging forms require them for new one-liners.
-- Existing call_reports RLS policies cover these columns; no policy changes needed.
-- Run on staging first, then production.

ALTER TABLE public.call_reports
  ADD COLUMN IF NOT EXISTS commercial_positioning TEXT,
  ADD COLUMN IF NOT EXISTS audience_focus TEXT;

ALTER TABLE public.call_reports
  DROP CONSTRAINT IF EXISTS call_reports_commercial_positioning_check,
  ADD CONSTRAINT call_reports_commercial_positioning_check
  CHECK (commercial_positioning IS NULL OR commercial_positioning IN ('commercial', 'non_commercial', 'commercial_edge', 'signature_commercial'));

ALTER TABLE public.call_reports
  DROP CONSTRAINT IF EXISTS call_reports_audience_focus_check,
  ADD CONSTRAINT call_reports_audience_focus_check
  CHECK (audience_focus IS NULL OR audience_focus IN ('male_centric', 'female_centric', 'both'));

COMMENT ON COLUMN public.call_reports.commercial_positioning IS 'commercial | non_commercial | commercial_edge | signature_commercial (set at logging; single source)';
COMMENT ON COLUMN public.call_reports.audience_focus IS 'male_centric | female_centric | both (Gender POV, set at logging; single source)';
