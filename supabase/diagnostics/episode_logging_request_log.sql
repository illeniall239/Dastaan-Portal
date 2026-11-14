-- Run in Supabase dashboard -> Logs -> Logs Explorer (NOT the SQL editor).
-- Set the time picker to 26 Oct 2026, 08:40-09:05 UTC (1:40-2:05 pm PKT) before running.
-- Lists every failed request for episode uploads, episode saves and session refreshes.

select
  cast(timestamp as datetime) as time_utc,
  request.method,
  request.path,
  response.status_code
from edge_logs
  cross join unnest(metadata) as m
  cross join unnest(m.request) as request
  cross join unnest(m.response) as response
where (request.path like '%episodes%' or request.path like '%/auth/v1/token%')
  and response.status_code >= 400
order by time_utc
limit 200
