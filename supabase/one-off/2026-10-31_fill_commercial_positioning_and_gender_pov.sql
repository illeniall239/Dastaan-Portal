-- One-off: fill project Commercial Positioning and Gender POV from meta-data-tagging.xlsx.
-- Requires migration 20261031000001_add_project_commercial_positioning_and_audience_focus.sql.
-- Only fills empty values; never overwrites a value already set on the project.
-- Mapping: Commercial + Signature -> signature_commercial; Commercial -> commercial;
--   Commercial Edge (with or without Signature) -> commercial_edge; Experimental -> non_commercial;
--   FEMALE -> female_centric, MALE -> male_centric, BALANCED -> both.
-- Matched by project code (call_report_id); every match was checked against title and writer.
-- Left out until confirmed (sheet writer differs from portal):
-- ('CR-2026-5257', 'commercial', 'male_centric')  -- Murdaar: Commercial / Regular / MALE
-- Run on production after the migration, BEFORE 2026-10-31_copy_evaluator_tags_to_projects.sql.
-- On staging it updates 0 rows (these projects aren't there).

update public.call_reports c
set commercial_positioning = coalesce(c.commercial_positioning, v.commercial_positioning),
    audience_focus         = coalesce(c.audience_focus, v.audience_focus),
    updated_at             = now()
from (values
  ('CR-2026-0200', 'commercial_edge', 'female_centric'),  -- Khamosh (Umeed): Commercial Edge / Regular / FEMALE
  ('CR-2026-9064', 'commercial_edge', 'female_centric'),  -- Pinky: Commercial Edge / Signature / FEMALE
  ('CR-2025-1027', 'non_commercial', 'male_centric'),  -- Lori (Jang-e-Ishq): Experimental / Regular / MALE
  ('CR-2026-4067', 'signature_commercial', 'male_centric'),  -- Lahu (Khaie 2 / Heer): Commercial / Signature / MALE
  ('CR-2026-8350', 'signature_commercial', 'both'),  -- Fanaa: Commercial / Signature / BALANCED
  ('CR-2026-2031', 'commercial', 'both'),  -- Sir Ka Sauda: Commercial / Regular / BALANCED
  ('CR-2026-8992', 'non_commercial', 'both'),  -- Case 10 - Murder Mysrtery: Experimental / Regular / BALANCED
  ('CR-2026-5719', 'signature_commercial', 'both'),  -- Meri Mohabbat Meri Marzi: Commercial / Signature / BALANCED
  ('CR-2026-8840', 'signature_commercial', 'both'),  -- Mann Ki Lagan (Parda e Dil): Commercial / Signature / BALANCED
  ('CR-2026-6578', 'commercial_edge', 'female_centric'),  -- Noor - Ae Zindagi: Commercial Edge / Signature / FEMALE
  ('CR-2026-3210', 'commercial_edge', 'both'),  -- Talash: Commercial Edge / Regular / BALANCED
  ('CR-2026-3340', 'commercial_edge', 'female_centric'),  -- Sitaron Se Agay: Commercial Edge / Regular / FEMALE
  ('CR-2026-0058', 'commercial', 'both'),  -- Banware: Commercial / Regular / BALANCED
  ('CR-2026-1520', 'commercial_edge', 'male_centric'),  -- Darinda (Raaz): Commercial Edge / Regular / MALE
  ('CR-2026-1251', 'signature_commercial', 'female_centric'),  -- Mohabbat Maar Di Tumne: Commercial / Signature / FEMALE
  ('CR-2026-5729', 'commercial_edge', 'female_centric'),  -- Kaghaz Kay Phool: Commercial Edge / Signature / FEMALE
  ('CR-2026-5341', 'commercial_edge', 'female_centric'),  -- Janam: Commercial Edge / Regular / FEMALE
  ('CR-2026-6878', 'commercial', 'female_centric'),  -- Zeest: Commercial / Regular / FEMALE
  ('CR-2026-5431', 'commercial', 'female_centric'),  -- Yunhi Pehlu Mein: Commercial / Regular / FEMALE
  ('CR-2026-2261', 'commercial_edge', 'both'),  -- Mohabbat Tumse Darta Hu: Commercial Edge / Regular / BALANCED
  ('CR-2026-2156', 'signature_commercial', 'male_centric'),  -- Ishq-E-Khayam: Commercial / Signature / MALE
  ('CR-2026-4997', 'commercial', 'female_centric'),  -- Shikar: Commercial / Regular / FEMALE
  ('CR-2026-8341', 'commercial', 'female_centric'),  -- Zaad-e-Ishq: Commercial / Regular / FEMALE
  ('CR-2026-2881', 'commercial', 'both')  -- Khandani: Commercial / Regular / BALANCED
) as v(code, commercial_positioning, audience_focus)
where c.call_report_id = v.code
  and c.meeting_type = 'call_report'
  and c.archived_at is null
  and (c.commercial_positioning is null or c.audience_focus is null)
returning c.call_report_id, c.working_title, c.commercial_positioning, c.audience_focus;
