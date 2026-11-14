-- STAGING ONLY (project ermhlmirkkcwlvpjtklf). Do not run on production; production already has this.
-- Makes staging's attachments SELECT rule match production exactly
-- (production definition read from pg_policies on 2026-10-31).
drop policy if exists "Owners and privileged roles can view attachments" on public.attachments;
create policy "Owners and privileged roles can view attachments"
  on public.attachments for select to authenticated
  using (
    uploaded_by = auth.uid() or
    get_user_role() in ('content_creator', 'content_manager', 'content_head', 'evaluator', 'management', 'executive', 'programmer', 'admin')
  );
