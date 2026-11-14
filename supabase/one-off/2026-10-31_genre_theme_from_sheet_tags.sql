-- One-off: genre and theme from the story tags in meta-data-tagging.xlsx and meta-data-tagging-2.xlsx.
-- Approved 2026-10-31. The sheets are the source of truth: where the sheet's tags give a genre / theme,
-- it replaces the portal's. Where they give none, the portal's value is kept.
-- Genre (portal genre list): Primary Family Based -> Family Drama; Narrative Love Story -> Romance;
--   Issue based -> Social Drama; Religious / Partial Religious -> Religious; Sitcom -> Sitcom;
--   Content Feel Supernatural -> Supernatural, Comic -> Comedy.
-- Theme (comma list, logging form wording where it exists): Romance / Love at First Sight/Obsession;
--   Family Dynamics (Larger|Smaller Family - Main Conflict) for primary family stories; the marriage trope;
--   Revenge (Brutal|Strategic|Karma); Class Difference for "X vs Y" classes; Self Made Success for Poor to Rich;
--   the social issue (Social Issues (Legal|Religious), Women Empowerment, Harassment, ...);
--   Alpha Male; Female Negative Lead; Super Natural.
-- Same project matches as the earlier fill scripts (Murdaar still left out). Every theme is <= 200 characters
-- (the edit page's limit). Run on production.

update public.call_reports c
set genre      = coalesce(v.genre, c.genre),
    theme      = coalesce(v.theme, c.theme),
    updated_at = now()
from (values
  ('CR-2026-0200', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Smaller Family - Main Conflict), Love After Marriage, Class Difference, Women Empowerment'),  -- sheet 1: Khamosh (Umeed)
  ('CR-2026-9064', array['Social Drama']::text[], 'Second Marriage, Class Difference, Self Made Success, Social Issues (Legal)'),  -- sheet 1: Pinky
  ('CR-2025-1027', array['Romance']::text[], 'Romance, Marriage Struggle, Class Difference, Self Made Success'),  -- sheet 1: Lori (Jang-e-Ishq)
  ('CR-2026-4067', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle, Revenge (Brutal)'),  -- sheet 1: Lahu (Khaie 2 / Heer)
  ('CR-2026-8350', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Smaller Family - Main Conflict), Marriage Struggle, Class Difference, Alpha Male'),  -- sheet 1: Fanaa
  ('CR-2026-2031', array['Romance']::text[], 'Love at First Sight/Obsession, Love Marriage, Class Difference'),  -- sheet 1: Sir Ka Sauda
  ('CR-2026-8992', array['Social Drama']::text[], 'Class Difference, Self Made Success, Social Issues (Legal), Alpha Male'),  -- sheet 1: Case 10 - Murder Mysrtery
  ('CR-2026-5719', array['Romance']::text[], 'Romance, Love Marriage, Women Empowerment, Alpha Male'),  -- sheet 1: Meri Mohabbat Meri Marzi
  ('CR-2026-8840', array['Romance']::text[], 'Romance, Accidental Marriage, Class Difference, Alpha Male'),  -- sheet 1: Mann Ki Lagan (Parda e Dil)
  ('CR-2026-6578', array['Family Drama', 'Social Drama']::text[], 'Family Dynamics (Larger Family - Main Conflict)'),  -- sheet 1: Noor - Ae Zindagi
  ('CR-2026-3210', array['Romance']::text[], 'Romance, Class Difference'),  -- sheet 1: Talash
  ('CR-2026-3340', array['Social Drama']::text[], 'Marriage Struggle, Women Empowerment'),  -- sheet 1: Sitaron Se Agay
  ('CR-2026-0058', array['Romance']::text[], 'Romance, Forced Marriage, Revenge (Strategic), Class Difference, Self Made Success, Alpha Male'),  -- sheet 1: Banware
  ('CR-2026-1520', array['Family Drama', 'Social Drama']::text[], 'Family Dynamics (Larger Family - Main Conflict), Marriage Struggle, Revenge (Strategic), Harassment'),  -- sheet 1: Darinda (Raaz)
  ('CR-2026-1251', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Smaller Family - Main Conflict), Second Marriage, Class Difference, Female Negative Lead'),  -- sheet 1: Mohabbat Maar Di Tumne
  ('CR-2026-5729', array['Social Drama']::text[], 'Romance, Love Marriage, Class Difference, Social Issues (Legal)'),  -- sheet 1: Kaghaz Kay Phool
  ('CR-2026-5341', array['Romance']::text[], 'Romance, Issues After Marriage, Class Difference, Self Made Success'),  -- sheet 1: Janam
  ('CR-2026-6878', array['Family Drama', 'Social Drama']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Simple Marriage, Revenge (Karma), Harassment'),  -- sheet 1: Zeest
  ('CR-2026-5431', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Love Marriage, Class Difference, Self Made Success'),  -- sheet 1: Yunhi Pehlu Mein
  ('CR-2026-2261', array['Romance']::text[], 'Love at First Sight/Obsession, Forced Marriage, Black Magic'),  -- sheet 1: Mohabbat Tumse Darta Hu
  ('CR-2026-2156', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Smaller Family - Main Conflict), Social Issues (Religious), Alpha Male'),  -- sheet 1: Ishq-E-Khayam
  ('CR-2026-4997', array['Family Drama', 'Social Drama']::text[], 'Family Dynamics (Smaller Family - Main Conflict), Trap Marriage, Class Difference, Self Made Success, Alpha Male, Female Negative Lead'),  -- sheet 1: Shikar
  ('CR-2026-8341', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Trap Marriage, Class Difference, Self Made Success'),  -- sheet 1: Zaad-e-Ishq
  ('CR-2026-2881', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Issues After Marriage, Class Difference'),  -- sheet 1: Khandani
  ('CR-2026-2138', array['Family Drama', 'Social Drama']::text[], 'Family Dynamics (Larger Family - Main Conflict), Second Marriage, Revenge (Strategic), Female Negative Lead'),  -- sheet 2: Bayhiss
  ('CR-2026-0451', array['Family Drama', 'Social Drama']::text[], 'Family Dynamics (Smaller Family - Main Conflict), Already Married, Class Difference, Education'),  -- sheet 2: Daur
  ('CR-2026-1168', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle, Revenge (Strategic), Female Negative Lead'),  -- sheet 2: Badla - Mah e Noor - Qudsia
  ('CR-2026-8108', array['Romance']::text[], 'Love at First Sight/Obsession, Love Marriage, Revenge (Karma), Class Difference, Social Issues (Legal)'),  -- sheet 2: Zero
  ('CR-2026-0103', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle, Women Empowerment'),  -- sheet 2: Mrs Khan Ka Shadi Ghar
  ('CR-2026-8224', array['Family Drama', 'Romance', 'Supernatural']::text[], 'Romance, Family Dynamics (Smaller Family - Main Conflict), Trap Marriage, Revenge (Brutal), Class Difference, Self Made Success, Super Natural'),  -- sheet 2: Wajood
  ('CR-2026-7460', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Third Marriage, Revenge (Strategic), Class Difference, Self Made Success'),  -- sheet 2: Naacheez
  ('CR-2026-2390', array['Romance']::text[], 'Romance, Love Marriage, Class Difference, Self Made Success'),  -- sheet 2: Apna Time Ayega
  ('CR-2026-4245', array['Romance']::text[], 'Romance, Extra Marital Affair, Revenge (Karma), Social Issues (Legal)'),  -- sheet 2: Ilzam (Long Serial)
  ('CR-2026-6794', array['Romance']::text[], 'Romance, Revenge (Strategic), Class Difference, Alpha Male'),  -- sheet 2: Dilair
  ('CR-2026-4576', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Smaller Family - Main Conflict), Trap Marriage, Revenge (Karma), Class Difference, Women Empowerment'),  -- sheet 2: Tere Liye (formerly ATM)
  ('CR-2026-4254', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Smaller Family - Main Conflict), Accidental Marriage, Class Difference, Self Made Success'),  -- sheet 2: Naam
  ('CR-2026-8143', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle, Class Difference, Joint Family'),  -- sheet 2: Maa Baap
  ('CR-2026-5274', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Issues After Marriage, Revenge (Strategic), Class Difference, Self Made Success'),  -- sheet 2: Baazi
  ('CR-2026-9093', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Issues After Marriage, Revenge (Karma), Joint Family'),  -- sheet 2: Naseeb
  ('CR-2026-0657', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Issues After Marriage, Revenge (Karma), Class Difference, Self Made Success, Joint Family, Female Negative Lead'),  -- sheet 2: Haqq
  ('CR-2026-3736', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle'),  -- sheet 2: Bandhan
  ('CR-2026-8849', array['Family Drama', 'Romance']::text[], 'Romance, Family Dynamics (Larger Family - Main Conflict), Love After Marriage'),  -- sheet 2: Deal
  ('CR-2026-3868', array['Social Drama']::text[], 'Romance, Marriage Struggle, Revenge (Karma), Class Difference, Self Made Success, Women Empowerment, Alpha Male')  -- sheet 2: Saans (Medical Drama)
) as v(code, genre, theme)
where c.call_report_id = v.code
  and c.meeting_type = 'call_report'
  and c.archived_at is null
returning c.call_report_id, c.working_title, c.genre, c.theme;
