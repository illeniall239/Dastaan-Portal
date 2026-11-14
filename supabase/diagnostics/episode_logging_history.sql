-- Read-only. One query, one result table: every episode beena.siddiqui@geo.tv logged in the
-- last 60 days. Run the whole file in the production SQL editor.
--
-- Columns that matter:
--   has_attachment     false = the episode was saved without its file
--   has_created_audit  false = saved, but the request was cut off before the audit entry was
--                      written (the page would have shown her an error although it saved)
--   saved_together     how many of her episodes were saved in the same second (1 = logged alone)
--   updated_after_sec  seconds between saving and the last edit (small = fixed right after logging)

with me as (
  select id from users where email = 'beena.siddiqui@geo.tv'
),
eps as (
  select e.*
  from episodes e
  where e.logged_by = (select id from me)
    and e.created_at > now() - interval '60 days'
)
select cr.working_title                                   as project,
       e.episode_number,
       e.version,
       e.is_current,
       e.archived_at is not null                          as archived,
       e.attachment_name is not null                      as has_attachment,
       e.attachment_name,
       exists (
         select 1 from audit_logs al
         where al.entity_type = 'episode'
           and al.action = 'created'
           and al.entity_id::text = e.id::text
       )                                                  as has_created_audit,
       (select count(*) from eps e2
         where date_trunc('second', e2.created_at) = date_trunc('second', e.created_at)
       )                                                  as saved_together,
       e.created_at,
       round(extract(epoch from (e.updated_at - e.created_at)))::int as updated_after_sec
from eps e
join call_reports cr on cr.id = e.call_report_id
order by e.created_at, e.episode_number;
