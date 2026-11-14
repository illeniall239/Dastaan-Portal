-- One-off: final genre and theme for the projects in meta-data-tagging.xlsx / -2.xlsx (plus Pukaar, Tapish).
-- Replaces the result of 2026-10-31_genre_theme_from_sheet_tags.sql with a merge:
--   genre = what the project had before that script (read from production earlier on 2026-10-31)
--           plus the sheet-derived genres; Romance stays a genre.
--   theme = the team's original theme text plus the sheet's items, with "Romance" always written as
--           "Love Story" (it is the theme; Romance is the genre).
-- Theme order shows what the story is about (the assistant reads the first theme as the main one):
--   sheet Narrative Type = Love Story -> "Love Story" (or "Love at First Sight/Obsession") first;
--   love story only as a side track    -> the main issue first, "Love Story" last;
--   no love story                      -> the team's text first, then the sheet's items.
-- Pukaar and Tapish (not in the sheets) only get Romance -> Love Story.
-- Sets absolute values, so it is safe to run once whatever ran before. Every theme <= 200 characters.
-- Run on production.

update public.call_reports c
set genre      = coalesce(v.genre, c.genre),
    theme      = v.theme,
    updated_at = now()
from (values
  ('CR-2026-0200', array['Family Drama', 'Romance']::text[], 'Love Story, Family Dynamics (Smaller), Betrayal, Self Made Success, Class Difference, Greed, Family Dynamics (Smaller Family - Main Conflict), Love After Marriage, Women Empowerment'),
  ('CR-2026-9064', array['Action', 'Crime Drama', 'Drama', 'Family Drama', 'Biography', 'News', 'Thriller', 'Social Drama']::text[], 'Social Issue, Real Life, Alpha Female, Crime, Second Marriage, Class Difference, Self Made Success, Social Issues (Legal)'),
  ('CR-2025-1027', array['Romance']::text[], 'Love Story, Social Issue, Family Dynamics (Father & Son Conflict), Marriage Struggle, Class Difference, Self Made Success'),
  ('CR-2026-4067', array['Family Drama', 'Romance']::text[], 'Love Story, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle, Revenge (Brutal)'),
  ('CR-2026-8350', array['Drama', 'Romance', 'Family Drama']::text[], 'Love Story, Family Dynamics (Smaller Family), Class Difference, Jealousy, Women Empowerment, Family Dynamics (Smaller Family - Main Conflict), Marriage Struggle, Alpha Male'),
  ('CR-2026-2031', array['Romance']::text[], 'Love at First Sight/Obsession, Love Marriage, Class Difference'),
  ('CR-2026-8992', array['Social Drama']::text[], 'Murder Mystery, Love after Marriage, Woman Empowerment, Class Difference, Self Made Success, Social Issues (Legal), Alpha Male'),
  ('CR-2026-5719', array['Romance']::text[], 'Love Story, Love Marriage, Women Empowerment, Alpha Male'),
  ('CR-2026-8840', array['Romance']::text[], 'Love Story, Accidental Marriage, Class Difference, Alpha Male'),
  ('CR-2026-6578', array['Family Drama', 'Social Drama']::text[], 'Family drama, Family Dynamics (Larger Family - Main Conflict)'),
  ('CR-2026-3210', array['Family Drama', 'Romance']::text[], 'Love Story, Gen Z Based Issues, Family Dynamics, Class Difference'),
  ('CR-2026-3340', array['Family Drama', 'Marital challenges', 'Social Drama']::text[], 'Marriage Struggle, Women Empowerment'),
  ('CR-2026-0058', array['Romance']::text[], 'Love Story, Forced Marriage, Revenge (Strategic), Class Difference, Self Made Success, Alpha Male'),
  ('CR-2026-1520', array['Thriller Drama', 'Family Drama', 'Social Drama']::text[], 'Family drama, mystery, dark humour, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle, Revenge (Strategic), Harassment'),
  ('CR-2026-1251', array['Family Drama', 'Romance']::text[], 'Love Story, Class Difference, Family Dynamics (Smaller Family - Main Conflict), Second Marriage, Female Negative Lead'),
  ('CR-2026-5729', array['Social Drama']::text[], 'Social Issues (Legal), Love Marriage, Class Difference, Love Story'),
  ('CR-2026-5341', array['Romance']::text[], 'Love Story, Issues After Marriage, Class Difference, Self Made Success'),
  ('CR-2026-6878', array['Social drama', 'Family Drama']::text[], 'Harassment, Family Dynamics (Larger Family - Main Conflict), Simple Marriage, Revenge (Karma), Love Story'),
  ('CR-2026-5431', array['Romance', 'Family Drama']::text[], 'Love Story, family drama, Family Dynamics (Larger Family - Main Conflict), Love Marriage, Class Difference, Self Made Success'),
  ('CR-2026-2261', array['Horror', 'Romance']::text[], 'Love at First Sight/Obsession, Forced Marriage, Black Magic'),
  ('CR-2026-2156', array['Drama', 'Family Drama', 'Romance']::text[], 'Love Story, Family Dynamics (Smaller Family - Main Conflict), Social Issues (Religious), Alpha Male'),
  ('CR-2026-4997', array['Family Drama', 'Social Drama']::text[], 'Social Issues, Family Dynamics (Smaller Family - Main Conflict), Trap Marriage, Class Difference, Self Made Success, Alpha Male, Female Negative Lead'),
  ('CR-2026-8341', array['Family Drama', 'Romance']::text[], 'Love Story, betrayal, class difference, Family Dynamics (Larger Family - Main Conflict), Trap Marriage, Self Made Success'),
  ('CR-2026-2881', array['Family Drama', 'Romance']::text[], 'Love Story, family drama, Family Dynamics (Larger Family - Main Conflict), Issues After Marriage, Class Difference'),
  ('CR-2026-2138', array['Family Drama', 'Social Drama']::text[], 'Family drama, Family Dynamics (Larger Family - Main Conflict), Second Marriage, Revenge (Strategic), Female Negative Lead'),
  ('CR-2026-0451', array['Family Drama', 'Social', 'Social Drama']::text[], 'Social drama, Family Dynamics (Smaller Family - Main Conflict), Already Married, Class Difference, Education'),
  ('CR-2026-1168', array['Family Drama', 'Romance']::text[], 'Love Story, Family conflict, Revenge story, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle, Revenge (Strategic), Female Negative Lead'),
  ('CR-2026-8108', array['Romance']::text[], 'Love at First Sight/Obsession, Love Marriage, Revenge (Karma), Class Difference, Social Issues (Legal)'),
  ('CR-2026-0103', array['Family Drama', 'Romance']::text[], 'Love Story, Wedding, drama, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle, Women Empowerment'),
  ('CR-2026-8224', array['Supernatural', 'Family Drama', 'Romance']::text[], 'Love Story, Intense love and revenge story, Family Dynamics (Smaller Family - Main Conflict), Trap Marriage, Revenge (Brutal), Class Difference, Self Made Success, Super Natural'),
  ('CR-2026-7460', array['Family Drama', 'Romance']::text[], 'Love Story, Family Dynamics (Larger Family - Main Conflict), Third Marriage, Revenge (Strategic), Class Difference, Self Made Success'),
  ('CR-2026-2390', array['Romance']::text[], 'Love Story, Love Marriage, Class Difference, Self Made Success'),
  ('CR-2026-4245', array['Romance']::text[], 'Love Story, Extra Marital Affair, Revenge (Karma), Social Issues (Legal)'),
  ('CR-2026-6794', array['Romance']::text[], 'Love Story, Revenge (Strategic), Class Difference, Alpha Male'),
  ('CR-2026-4576', array['Family Drama', 'Romance']::text[], 'Love Story, Family Dynamics (Smaller Family - Main Conflict), Trap Marriage, Revenge (Karma), Class Difference, Women Empowerment'),
  ('CR-2026-4254', array['Family Drama', 'Romance']::text[], 'Love Story, Family drama, Family Dynamics (Smaller Family - Main Conflict), Accidental Marriage, Class Difference, Self Made Success'),
  ('CR-2026-8143', array['Family Drama', 'Romance']::text[], 'Love Story, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle, Class Difference, Joint Family'),
  ('CR-2026-5274', array['Class Conflict Drama', 'Family Drama', 'Romance']::text[], 'Love Story, Jealousy & Betrayal, Family Dynamics (Larger Family - Main Conflict), Issues After Marriage, Revenge (Strategic), Class Difference, Self Made Success'),
  ('CR-2026-9093', array['Family Drama', 'Romance']::text[], 'Love Story, Family drama, 3 daughters, ghar damaad, Family Dynamics (Larger Family - Main Conflict), Issues After Marriage, Revenge (Karma), Joint Family'),
  ('CR-2026-0657', array['Family Drama', 'Romance']::text[], 'Love Story, Family Dynamics (Larger Family - Main Conflict), Issues After Marriage, Revenge (Karma), Class Difference, Self Made Success, Joint Family, Female Negative Lead'),
  ('CR-2026-3736', array['Family Drama', 'Romance']::text[], 'Love Story, Family Dynamics (Larger Family - Main Conflict), Marriage Struggle'),
  ('CR-2026-8849', array['Family Drama', 'Romance']::text[], 'Love Story, Family Dynamics (Larger Family - Main Conflict), Love After Marriage'),
  ('CR-2026-3868', array['Medical', 'Social Drama']::text[], 'Women Empowerment, Marriage Struggle, Revenge (Karma), Class Difference, Self Made Success, Alpha Male, Love Story'),
  ('CR-2026-2728', null::text[], 'Love Story'),
  ('CR-2026-2854', null::text[], 'Alpha Male, Anti Hero, Love at First Sight / Obsession, Love Story, Class Difference')
) as v(code, genre, theme)
where c.call_report_id = v.code
  and c.meeting_type = 'call_report'
  and c.archived_at is null
returning c.call_report_id, c.working_title, c.genre, c.theme;
