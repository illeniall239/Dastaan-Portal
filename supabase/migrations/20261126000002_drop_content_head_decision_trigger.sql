-- Editing a one-liner evaluation must not decide the project.
-- This trigger (from the old single-content-head workflow) fired on any UPDATE that set `decision`,
-- and set the story to approved/rejected, the call report's evaluation to completed, and added an
-- evaluation log, from whoever edited. Edits always failed before it could run (0 such logs in
-- production); now that edits save, it would flip project status on every edit.
-- Project decisions go through story_approvals. The function is kept, only the trigger goes.
DROP TRIGGER IF EXISTS trigger_process_content_head_decision ON public.evaluator_forms;
