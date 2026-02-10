-- Fix: PostgREST cannot resolve meetings → users relationship because
-- meetings.created_by references auth.users(id), not public.users(id).
-- Add a FK to public.users so PostgREST can traverse the join.

ALTER TABLE meetings
  ADD CONSTRAINT meetings_created_by_public_users_fk
  FOREIGN KEY (created_by) REFERENCES public.users(id);
