-- One-off: the three meta-data-tagging-2.xlsx dramas confirmed on 2026-10-31 after checking
-- content head and episodes in hand against the portal.
--   Bandhan -> CR-2026-3736 bandhan (writer named differently: "Abdul Khaliq Team" vs "content vibe team")
--   Deal    -> CR-2026-8849 Titli Jesa Pyar (25 eps in hand = 25 received), not CR-2026-7698
--   Saans   -> CR-2026-3868 Sans - Dua aur Dawa (100 total, 25 received), not CR-2026-3259 NEW Saans
-- Same rules as 2026-10-31_fill_from_meta_data_tagging_2.sql: the sheet is the source of truth for
-- Commercial Positioning and Gender POV. The sheet has no director for these, and the portal's episode
-- totals are kept (sheet says Bandhan 70, Deal 26; portal has 50 for both).
-- Run on production.

update public.call_reports c
set commercial_positioning = v.commercial_positioning,
    audience_focus         = v.audience_focus,
    updated_at             = now()
from (values
  ('CR-2026-3736', 'commercial', 'both'),                -- Bandhan: Commercial / Regular / BALANCED
  ('CR-2026-8849', 'commercial', 'both'),                -- Deal: Commercial / Regular / BALANCED
  ('CR-2026-3868', 'commercial_edge', 'female_centric')  -- Saans (Medical Drama): Commercial Edge / Signature / FEMALE
) as v(code, commercial_positioning, audience_focus)
where c.call_report_id = v.code
  and c.meeting_type = 'call_report'
  and c.archived_at is null
returning c.call_report_id, c.working_title, c.commercial_positioning, c.audience_focus;
