-- One-off: copy evaluators' existing Commercial Positioning / Gender POV answers onto projects
-- that are still empty, now that the project is the single source and the evaluation form
-- no longer asks these.
-- Run on production AFTER 2026-10-31_fill_commercial_positioning_and_gender_pov.sql,
-- so the sheet's values win where both exist.
-- Uses the most common answer across submitted evaluations; never overwrites a project value.
-- Checked 2026-10-31: fills commercial positioning on 10 projects; no evaluator answered
-- Gender POV, and no project's evaluators disagree.

update public.call_reports c
set commercial_positioning = coalesce(c.commercial_positioning, ev.commercial_positioning),
    audience_focus         = coalesce(c.audience_focus, ev.audience_focus),
    updated_at             = now()
from (
  select call_report_id,
    mode() within group (order by theme_category) filter (where theme_category is not null) as commercial_positioning,
    mode() within group (order by audience_focus) filter (where audience_focus is not null) as audience_focus
  from public.evaluator_forms
  where submitted_at is not null
  group by call_report_id
) ev
where ev.call_report_id = c.id
  and c.meeting_type = 'call_report'
  and c.archived_at is null
  and ((c.commercial_positioning is null and ev.commercial_positioning is not null)
    or (c.audience_focus is null and ev.audience_focus is not null))
returning c.call_report_id, c.working_title, c.commercial_positioning, c.audience_focus;
