-- One-off, part B of 2026-11-04_clear_default_episode_assessments.sql (part A already ran).
-- Clears the 5/10 on episodes logged by a head (evaluator / GCM / programmer, who log with no score)
-- and last edited by a content creator: the edit form pre-filled 5 and saved it on any edit.
-- 83 episodes on 2026-11-04 (e.g. Angabeen Shah's Ep 1-4). Run on production.

update public.episodes e
set initial_assessment = null
from public.users logger, public.users editor
where logger.id = e.logged_by and editor.id = e.updated_by
  and e.initial_assessment = 5
  and logger.role in ('evaluator', 'gcm', 'programmer')
  and editor.role in ('content_creator', 'content_manager')
returning e.id, e.episode_number, e.call_report_id;
