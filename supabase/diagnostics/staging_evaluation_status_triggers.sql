-- READ-ONLY. Run in the STAGING SQL editor.
-- Staging rejects every submitted one-liner evaluation with:
--   column "evaluation_status" is of type evaluation_status but expression is of type text
-- Production doesn't. This lists the functions that set evaluation_status and the triggers
-- that run them, so the staging version can be compared with production's.
-- (Only plain functions: aggregates like array_agg have no definition to read.)
select
  coalesce(string_agg(distinct t.tgrelid::regclass::text || '.' || t.tgname, ', '), '(no trigger)') as triggers,
  f.proname as function_name,
  f.definition
from (
  select p.oid, p.proname,
         case when p.prokind in ('f', 'p') then pg_get_functiondef(p.oid) end as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f', 'p')
) f
left join pg_trigger t on t.tgfoid = f.oid and not t.tgisinternal
where f.definition ilike '%evaluation_status%'
group by f.oid, f.proname, f.definition
order by f.proname;
