-- One-off: clear the 5/10 "initial assessment" the episode edit form saved by default.
-- Episodes logged by evaluators, GCM or programmers start with no score (their logging pages have no
-- score field). The edit form then wrote 5 on save: always for those roles (the field is hidden from
-- them), and for content creators whenever they saved without moving the pre-filled 5.
-- Fixed in components/episodes/episode-edit-form.tsx; this removes the scores it already wrote.
-- Run on production.

-- PART A — certain: last edited by an evaluator, GCM or programmer, who never sees the score field
-- (82 episodes on 2026-11-04)
update public.episodes e
set initial_assessment = null
from public.users logger, public.users editor
where logger.id = e.logged_by and editor.id = e.updated_by
  and e.initial_assessment = 5
  and logger.role in ('evaluator', 'gcm', 'programmer')
  and editor.role in ('evaluator', 'gcm', 'programmer')
returning e.id, e.episode_number, e.call_report_id;

-- PART B — very likely: a head's episode last edited by a content creator, who saw a pre-filled 5
-- (83 episodes on 2026-11-04). A creator may have meant 5 on some of these, so only run this if you
-- want those cleared too: remove the "--" in front of each line below.
-- update public.episodes e
-- set initial_assessment = null
-- from public.users logger, public.users editor
-- where logger.id = e.logged_by and editor.id = e.updated_by
--   and e.initial_assessment = 5
--   and logger.role in ('evaluator', 'gcm', 'programmer')
--   and editor.role in ('content_creator', 'content_manager')
-- returning e.id, e.episode_number, e.call_report_id;
