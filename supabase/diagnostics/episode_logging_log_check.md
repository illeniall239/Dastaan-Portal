# Episode logging: request log check (production)

Goal: find which request failed when beena.siddiqui@geo.tv tried to log several episodes at once.
Supabase only keeps these logs for a limited time, so do this soon.

Window to check: **26 Oct 2026, 08:40–09:05 UTC** (1:40–2:05 pm PKT).
That's when Naam episodes 8, 9 and 10 were logged one at a time after the multi-episode attempt failed.

## Option A: query (fastest)

1. Supabase dashboard → production project → **Logs** → **Logs Explorer**.
2. Set the time range picker to cover the window above.
3. Paste and run:

```sql
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
```

4. Export or screenshot the result.

If the query errors, use Option B.

## Option B: by hand

1. Supabase dashboard → **Logs** → **API Gateway**.
2. Set the time range to the window above.
3. In the search box, search each of these in turn:
   - `episodes`
   - `/auth/v1/token`
4. Note every row with status **400, 401, 403 or 409**: time, method, path and status.

## What each finding means

| Path | Status | Meaning |
|---|---|---|
| `/storage/v1/object/episodes/...` (POST) | 400 / 401 / 403 | A file upload was rejected (expired session, permissions, or "already exists"). |
| `/rest/v1/episodes` (POST) | 409 | The save hit "episode number already exists". |
| `/rest/v1/episodes` (GET) | 401 / 403 | The page couldn't load her existing episodes, so the next-episode number could be wrong. |
| `/auth/v1/token` (POST) | 400 / 401 | Her login session failed to refresh; requests after it fail until she logs in again. |

Paste the results back so they can be matched against her recording and the episode data.
