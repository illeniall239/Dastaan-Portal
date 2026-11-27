-- An episode is approved only when every mandatory approver has approved it.
--
-- episodes.approval_status used to be whatever the last of Humera / Salman submitted. It is now
-- derived from their own evaluations, as one-liners are: only the current round counts (each
-- approver's latest evaluation of the episode's latest revision, or of the original when it has
-- no revisions), and
--   any reject          → rejected
--   any needs revision  → needs_revision
--   every approver approved → approved
--   otherwise           → pending (NULL)
-- approved_by / approved_at = the approver (and time) whose evaluation decided it.
--
-- Approvers are the mandatory approvers in lib/approvals/config.ts (keep the two lists in sync).
-- Triggers keep it current on every evaluation insert/edit/delete and when a revision is added,
-- whether the evaluation comes from the app or an import. The backfill recomputes every episode.
-- Production preview (2026-11-27): 7 episodes change — 5 approved by Salman alone → pending,
-- 2 needs-revision on a version since revised → pending (new round); 1,058 unchanged.

CREATE OR REPLACE FUNCTION public.refresh_episode_approval(p_episode_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approvers text[] := ARRAY['humera.safder@geo.tv', 'salman.ahmed@geo.tv'];
  v_rev uuid;
  v_status text;
  v_by uuid;
  v_at timestamptz;
BEGIN
  IF p_episode_id IS NULL THEN
    RETURN;
  END IF;

  -- Current round: the latest revision, else the original
  SELECT r.id INTO v_rev
  FROM episode_revisions r
  WHERE r.episode_id = p_episode_id
  ORDER BY r.revision_number DESC
  LIMIT 1;

  WITH votes AS (
    SELECT DISTINCT ON (lower(u.email))
           ee.evaluator_id, ee.decision, coalesce(ee.updated_at, ee.created_at) AS at
    FROM episodic_evaluations ee
    JOIN users u ON u.id = ee.evaluator_id
    WHERE ee.episode_id = p_episode_id
      AND ee.revision_id IS NOT DISTINCT FROM v_rev
      AND lower(u.email) = ANY (v_approvers)
    ORDER BY lower(u.email), coalesce(ee.updated_at, ee.created_at) DESC
  ),
  result AS (
    SELECT CASE
             WHEN bool_or(decision = 'reject') THEN 'rejected'
             WHEN bool_or(decision = 'needs_revision') THEN 'needs_revision'
             WHEN count(*) FILTER (WHERE decision = 'approve') = array_length(v_approvers, 1) THEN 'approved'
           END AS status
    FROM votes
  )
  SELECT r.status, d.evaluator_id, d.at
  INTO v_status, v_by, v_at
  FROM result r
  LEFT JOIN LATERAL (
    SELECT v.evaluator_id, v.at
    FROM votes v
    WHERE v.decision = CASE r.status WHEN 'rejected' THEN 'reject'
                                     WHEN 'needs_revision' THEN 'needs_revision'
                                     WHEN 'approved' THEN 'approve' END
    ORDER BY v.at DESC
    LIMIT 1
  ) d ON true;

  UPDATE episodes
  SET approval_status = v_status,
      approved_by = v_by,
      approved_at = v_at
  WHERE id = p_episode_id
    AND (approval_status IS DISTINCT FROM v_status
         OR approved_by IS DISTINCT FROM v_by
         OR approved_at IS DISTINCT FROM v_at);
END;
$$;

-- Shared by both triggers: both tables carry episode_id
CREATE OR REPLACE FUNCTION public.trg_refresh_episode_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM public.refresh_episode_approval(OLD.episode_id);
  END IF;
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.episode_id IS DISTINCT FROM OLD.episode_id) THEN
    PERFORM public.refresh_episode_approval(NEW.episode_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_episode_approval ON public.episodic_evaluations;
CREATE TRIGGER refresh_episode_approval
  AFTER INSERT OR UPDATE OR DELETE ON public.episodic_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_episode_approval();

-- A new revision starts a new round
DROP TRIGGER IF EXISTS refresh_episode_approval ON public.episode_revisions;
CREATE TRIGGER refresh_episode_approval
  AFTER INSERT OR DELETE OR UPDATE OF revision_number, episode_id ON public.episode_revisions
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_episode_approval();

-- Backfill every episode from current evaluations
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.episodes LOOP
    PERFORM public.refresh_episode_approval(r.id);
  END LOOP;
END;
$$;
