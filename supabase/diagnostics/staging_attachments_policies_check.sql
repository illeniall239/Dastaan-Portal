-- STAGING ONLY. Lists the access rules on attachments so they can be compared with production.
-- Production has: "Owners and privileged roles can view attachments" (SELECT) allowing
-- uploader OR roles content_creator, content_manager, content_head, evaluator, management,
-- executive, programmer, admin.
select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and tablename = 'attachments'
order by cmd, policyname;
