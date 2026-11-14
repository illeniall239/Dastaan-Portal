-- One-off fix: Wujood (CR-2026-8224, geetee.masood@geo.tv) is tagged "Soap"; it should be "Long Serial".
-- Run once in the production SQL editor. Single statement.
--
-- Safe by design: it only changes the row if it is exactly this project, by this creator, still tagged
-- "Soap". Running it twice changes nothing the second time.
-- Expected result: one row with content_type = 'Long Serial'. No rows = nothing matched, nothing changed.

update call_reports cr
set content_type = 'Long Serial'
from users u
where u.id = cr.created_by
  and u.email = 'geetee.masood@geo.tv'
  and cr.call_report_id = 'CR-2026-8224'
  and cr.working_title = 'Wujood'
  and cr.content_type = 'Soap'
returning cr.call_report_id, cr.working_title, cr.content_type, u.email as created_by;
