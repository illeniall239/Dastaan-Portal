-- One-off: fill project tags and details from meta-data-tagging-2.xlsx.
-- The sheet is the source of truth for Commercial Positioning, Gender POV and Director:
--   where the sheet has a value it replaces the portal's (Daurh, Mrs. Khan ka Shadi Ghar, Daurh's director).
-- Total episodes are only filled where the portal is empty; existing counts are never changed.
-- Mapping: Commercial + Signature -> signature_commercial; Commercial -> commercial;
--   Commercial Edge -> commercial_edge; Experimental -> non_commercial;
--   FEMALE -> female_centric, MALE -> male_centric, BALANCED -> both.
-- Matched by project code; every match checked against title and writer on 2026-10-31.
-- Left out until confirmed: Bandhan (writer differs), Deal (two portal entries),
--   Saans (two portal entries), Bas Yun Hi (no tags in the sheet).
-- Run on production.

update public.call_reports c
set commercial_positioning = coalesce(v.commercial_positioning, c.commercial_positioning),
    audience_focus         = coalesce(v.audience_focus, c.audience_focus),
    director               = coalesce(v.director, c.director),
    total_episodes         = coalesce(c.total_episodes, v.total_episodes),
    updated_at             = now()
from (values
  ('CR-2026-2138', 'commercial', 'female_centric', 'Ali Jaffri', 50::int),  -- Bayhiss: Commercial / Regular / FEMALE
  ('CR-2026-0451', 'commercial', 'both', 'Owais Suleman', 50::int),  -- Daur: Commercial / Regular / BALANCED
  ('CR-2026-1168', 'commercial', 'female_centric', null, 50::int),  -- Badla - Mah e Noor - Qudsia: Commercial / Regular / FEMALE
  ('CR-2026-8108', 'commercial', 'both', 'Zeeshan Zaidi', 50::int),  -- Zero: Commercial / Regular / BALANCED
  ('CR-2026-0103', 'signature_commercial', 'female_centric', null, 100::int),  -- Mrs Khan Ka Shadi Ghar: Commercial / Signature / FEMALE
  ('CR-2026-8224', 'commercial', 'female_centric', null, 45::int),  -- Wajood: Commercial / Regular / FEMALE
  ('CR-2026-7460', 'commercial', 'female_centric', null, 50::int),  -- Naacheez: Commercial / Regular / FEMALE
  ('CR-2026-2390', 'non_commercial', 'male_centric', null, 50::int),  -- Apna Time Ayega: Experimental / Regular / MALE
  ('CR-2026-4245', 'commercial', 'both', null, 50::int),  -- Ilzam (Long Serial): Commercial / Regular / BALANCED
  ('CR-2026-6794', 'commercial', 'male_centric', null, 50::int),  -- Dilair: Commercial / Regular / MALE
  ('CR-2026-4576', 'commercial', 'female_centric', null, 30::int),  -- Tere Liye (formerly ATM): Commercial / Regular / FEMALE
  ('CR-2026-4254', 'commercial', 'female_centric', null, 50::int),  -- Naam: Commercial / Regular / FEMALE
  ('CR-2026-8143', 'commercial', 'both', null, 30::int),  -- Maa Baap: Commercial / Regular / BALANCED
  ('CR-2026-5274', 'commercial', 'female_centric', null, 50::int),  -- Baazi: Commercial / Regular / FEMALE
  ('CR-2026-9093', 'commercial', 'both', null, 50::int),  -- Naseeb: Commercial / Regular / BALANCED
  ('CR-2026-0657', 'commercial', 'female_centric', null, 50::int)  -- Haqq: Commercial /  / FEMALE
) as v(code, commercial_positioning, audience_focus, director, total_episodes)
where c.call_report_id = v.code
  and c.meeting_type = 'call_report'
  and c.archived_at is null
returning c.call_report_id, c.working_title, c.commercial_positioning, c.audience_focus, c.director, c.total_episodes;
