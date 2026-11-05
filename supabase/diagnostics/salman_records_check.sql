-- Every record pointing at Salman Ahmed's account, for every user-reference column in the database.
-- Run before and after 20261105000001_team_head_is_member.sql and compare.
--
-- Before (production, 2026-11-05):
--   notifications.user_id 1294, activity_logs.user_id 516, notifications.created_by 48,
--   audit_logs.performed_by 12, episodes.approved_by 6, episodic_evaluations.evaluator_id 6,
--   teams.team_head_id 2, everything else 0.
-- Expected after: the same, except teams.team_head_id = 1 (his empty personal team is gone),
-- plus his team below should read "Programming Team".

with u as (select id from users where email = 'salman.ahmed@geo.tv'),
fks as (
  select c.conrelid::regclass::text tbl, a.attname col
  from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
  where c.contype = 'f' and c.confrelid = 'public.users'::regclass and array_length(c.conkey, 1) = 1
)
select tbl, col,
  (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from %s where %I = %L', tbl, col, (select id from u)), false, true, '')))[1]::text::int as records
from fks
union all
select 'his team: ' || t.name, t.team_type, null from users s join teams t on t.id = s.team_id where s.email = 'salman.ahmed@geo.tv'
order by records desc nulls first, tbl, col;
