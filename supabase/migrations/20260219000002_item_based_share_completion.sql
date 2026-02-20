-- Item-based completion for cross-team shares
--
-- Previously: status = 'completed' when N distinct evaluators submitted anything.
-- Now: status = 'completed' when every shared item (call report + each episode)
--      has at least one evaluation.
--
-- completed_evaluations = count of items that have been evaluated
-- required_evaluations  = total items in the share (set at creation, kept in sync here)

CREATE OR REPLACE FUNCTION update_cross_team_share_progress()
RETURNS TRIGGER AS $$
DECLARE
  share_call_report_id UUID;
  total_items  INT := 0;
  total_done   INT := 0;
  has_any_eval INT := 0;
  cr_done      INT := 0;
  ep_done      INT := 0;
  ep_total     INT := 0;
BEGIN
  IF NEW.cross_team_share_id IS NOT NULL THEN

    -- Get the share's call_report_id
    SELECT call_report_id INTO share_call_report_id
    FROM cross_team_shares
    WHERE id = NEW.cross_team_share_id;

    -- ── Call report item ──────────────────────────────────────────────────────
    IF share_call_report_id IS NOT NULL THEN
      total_items := total_items + 1;
      SELECT COUNT(*) INTO cr_done
      FROM evaluator_forms
      WHERE cross_team_share_id = NEW.cross_team_share_id
      LIMIT 1;
      IF cr_done > 0 THEN total_done := total_done + 1; END IF;
    END IF;

    -- ── Episode items ─────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO ep_total
    FROM cross_team_share_episodes
    WHERE cross_team_share_id = NEW.cross_team_share_id;

    total_items := total_items + ep_total;

    -- Count episodes that have at least one episodic evaluation for this share
    SELECT COUNT(DISTINCT cse.episode_id) INTO ep_done
    FROM cross_team_share_episodes cse
    WHERE cse.cross_team_share_id = NEW.cross_team_share_id
      AND EXISTS (
        SELECT 1
        FROM episodic_evaluations ee
        WHERE ee.episode_id          = cse.episode_id
          AND ee.cross_team_share_id = NEW.cross_team_share_id
      );

    total_done   := total_done + ep_done;
    has_any_eval := cr_done + ep_done;

    -- ── Update the share record ───────────────────────────────────────────────
    UPDATE cross_team_shares SET
      completed_evaluations = total_done,
      required_evaluations  = total_items,
      first_evaluation_at   = COALESCE(first_evaluation_at, NOW()),
      status = CASE
        WHEN total_items > 0 AND total_done >= total_items THEN 'completed'
        WHEN has_any_eval > 0                              THEN 'in_progress'
        ELSE status
      END,
      completed_at = CASE
        WHEN total_items > 0 AND total_done >= total_items THEN NOW()
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = NEW.cross_team_share_id;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers are already in place (from 20260208000002 and 20260219000001).
-- No new triggers needed — the updated function is picked up automatically.
