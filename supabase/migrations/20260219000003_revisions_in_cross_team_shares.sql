-- Revisions support in cross-team shares
--
-- Allows sharing specific revisions of call reports and episodes
-- alongside (or instead of) the base versions.
--
-- Changes:
--   1. Add revision_id to cross_team_share_episodes
--   2. New junction table cross_team_share_call_report_revisions
--   3. Update progress trigger to count each revision as a separate item

-- ── 1. Add revision_id to cross_team_share_episodes ─────────────────────────

ALTER TABLE cross_team_share_episodes
  ADD COLUMN revision_id UUID REFERENCES episode_revisions(id) ON DELETE CASCADE;

-- Drop old unique constraint (episode_id only, can't share same episode twice)
ALTER TABLE cross_team_share_episodes
  DROP CONSTRAINT IF EXISTS cross_team_share_episodes_cross_team_share_id_episode_id_key;

-- Base episode (revision_id IS NULL): one per share per episode
CREATE UNIQUE INDEX idx_ctse_base
  ON cross_team_share_episodes(cross_team_share_id, episode_id)
  WHERE revision_id IS NULL;

-- Episode revision: one per share per episode per revision
CREATE UNIQUE INDEX idx_ctse_revision
  ON cross_team_share_episodes(cross_team_share_id, episode_id, revision_id)
  WHERE revision_id IS NOT NULL;

-- ── 2. New junction table for call report revisions in a share ───────────────

CREATE TABLE cross_team_share_call_report_revisions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cross_team_share_id     UUID NOT NULL REFERENCES cross_team_shares(id) ON DELETE CASCADE,
  call_report_revision_id UUID NOT NULL REFERENCES call_report_revisions(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cross_team_share_id, call_report_revision_id)
);

CREATE INDEX idx_ctscr_share ON cross_team_share_call_report_revisions(cross_team_share_id);

-- ── 3. Updated progress trigger ──────────────────────────────────────────────
--
-- Items now include:
--   a) Call report base (if cross_team_shares.call_report_id IS NOT NULL)
--      → done when evaluator_forms has a row with cross_team_share_id=X AND revision_id IS NULL
--   b) Call report revisions (from cross_team_share_call_report_revisions)
--      → done when evaluator_forms has cross_team_share_id=X AND revision_id=that_revision
--   c) Episode base rows (cross_team_share_episodes WHERE revision_id IS NULL)
--      → done when episodic_evaluations has cross_team_share_id=X AND episode_id=Y AND revision_id IS NULL
--   d) Episode revision rows (cross_team_share_episodes WHERE revision_id IS NOT NULL)
--      → done when episodic_evaluations has cross_team_share_id=X AND episode_id=Y AND revision_id=Z

CREATE OR REPLACE FUNCTION update_cross_team_share_progress()
RETURNS TRIGGER AS $$
DECLARE
  share_call_report_id    UUID;
  total_items             INT := 0;
  total_done              INT := 0;
  cr_base_done            INT := 0;
  cr_rev_total            INT := 0;
  cr_rev_done             INT := 0;
  ep_base_total           INT := 0;
  ep_base_done            INT := 0;
  ep_rev_total            INT := 0;
  ep_rev_done             INT := 0;
BEGIN
  IF NEW.cross_team_share_id IS NOT NULL THEN

    SELECT call_report_id INTO share_call_report_id
    FROM cross_team_shares
    WHERE id = NEW.cross_team_share_id;

    -- ── a) Call report base ──────────────────────────────────────────────────
    IF share_call_report_id IS NOT NULL THEN
      total_items := total_items + 1;
      SELECT COUNT(*) INTO cr_base_done
      FROM evaluator_forms
      WHERE cross_team_share_id = NEW.cross_team_share_id
        AND revision_id IS NULL
      LIMIT 1;
      IF cr_base_done > 0 THEN total_done := total_done + 1; END IF;
    END IF;

    -- ── b) Call report revisions ─────────────────────────────────────────────
    SELECT COUNT(*) INTO cr_rev_total
    FROM cross_team_share_call_report_revisions
    WHERE cross_team_share_id = NEW.cross_team_share_id;

    total_items := total_items + cr_rev_total;

    SELECT COUNT(DISTINCT ctscr.call_report_revision_id) INTO cr_rev_done
    FROM cross_team_share_call_report_revisions ctscr
    WHERE ctscr.cross_team_share_id = NEW.cross_team_share_id
      AND EXISTS (
        SELECT 1
        FROM evaluator_forms ef
        WHERE ef.cross_team_share_id = NEW.cross_team_share_id
          AND ef.revision_id = ctscr.call_report_revision_id
      );

    total_done := total_done + cr_rev_done;

    -- ── c) Episode base rows ─────────────────────────────────────────────────
    SELECT COUNT(*) INTO ep_base_total
    FROM cross_team_share_episodes
    WHERE cross_team_share_id = NEW.cross_team_share_id
      AND revision_id IS NULL;

    total_items := total_items + ep_base_total;

    SELECT COUNT(DISTINCT cse.episode_id) INTO ep_base_done
    FROM cross_team_share_episodes cse
    WHERE cse.cross_team_share_id = NEW.cross_team_share_id
      AND cse.revision_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM episodic_evaluations ee
        WHERE ee.episode_id          = cse.episode_id
          AND ee.cross_team_share_id = NEW.cross_team_share_id
          AND ee.revision_id IS NULL
      );

    total_done := total_done + ep_base_done;

    -- ── d) Episode revision rows ─────────────────────────────────────────────
    SELECT COUNT(*) INTO ep_rev_total
    FROM cross_team_share_episodes
    WHERE cross_team_share_id = NEW.cross_team_share_id
      AND revision_id IS NOT NULL;

    total_items := total_items + ep_rev_total;

    SELECT COUNT(*) INTO ep_rev_done
    FROM cross_team_share_episodes cse
    WHERE cse.cross_team_share_id = NEW.cross_team_share_id
      AND cse.revision_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM episodic_evaluations ee
        WHERE ee.episode_id          = cse.episode_id
          AND ee.cross_team_share_id = NEW.cross_team_share_id
          AND ee.revision_id         = cse.revision_id
      );

    total_done := total_done + ep_rev_done;

    -- ── Update the share record ──────────────────────────────────────────────
    UPDATE cross_team_shares SET
      completed_evaluations = total_done,
      required_evaluations  = total_items,
      first_evaluation_at   = COALESCE(first_evaluation_at, NOW()),
      status = CASE
        WHEN total_items > 0 AND total_done >= total_items THEN 'completed'
        WHEN total_done > 0                                THEN 'in_progress'
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

-- Triggers are already in place from prior migrations.
-- The updated function is picked up automatically.
