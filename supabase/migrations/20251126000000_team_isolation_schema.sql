-- ============================================================================
-- TEAM ISOLATION: Schema Updates
-- ============================================================================
-- Migration: 20251126000000_team_isolation_schema.sql
-- Purpose: Add team_id denormalization, auto-population triggers, and
--          auto-team creation for content_head users
-- ============================================================================

-- ============================================================================
-- PART 1: DENORMALIZE team_id TO CRITICAL TABLES
-- ============================================================================
-- Rationale: JOIN-based filtering is error-prone and slow. Denormalization
-- ensures watertight security and better query performance.

-- Add team_id to call_reports (denormalized from created_by -> users.team_id)
ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to stories (denormalized from created_by -> users.team_id)
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to evaluator_forms (denormalized from evaluator_id -> users.team_id)
ALTER TABLE evaluator_forms
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to episodes (denormalized from logged_by -> users.team_id)
ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to episodic_evaluations (denormalized from evaluator_id -> users.team_id)
ALTER TABLE episodic_evaluations
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to detailed_one_liners (denormalized from created_by -> users.team_id)
ALTER TABLE detailed_one_liners
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to evaluator_assignments (denormalized from evaluator_id -> users.team_id)
ALTER TABLE evaluator_assignments
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN call_reports.team_id IS 'Denormalized team_id for fast team-scoped filtering';
COMMENT ON COLUMN stories.team_id IS 'Denormalized team_id for fast team-scoped filtering';
COMMENT ON COLUMN evaluator_forms.team_id IS 'Denormalized team_id for fast team-scoped filtering';
COMMENT ON COLUMN episodes.team_id IS 'Denormalized team_id for fast team-scoped filtering';
COMMENT ON COLUMN episodic_evaluations.team_id IS 'Denormalized team_id for fast team-scoped filtering';
COMMENT ON COLUMN detailed_one_liners.team_id IS 'Denormalized team_id for fast team-scoped filtering';
COMMENT ON COLUMN evaluator_assignments.team_id IS 'Denormalized team_id for fast team-scoped filtering';

-- ============================================================================
-- PART 2: CREATE INDEXES FOR TEAM FILTERING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_call_reports_team_id ON call_reports(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stories_team_id ON stories(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_team_id ON evaluator_forms(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_episodes_team_id ON episodes(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_episodic_evaluations_team_id ON episodic_evaluations(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_detailed_one_liners_team_id ON detailed_one_liners(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_team_id ON evaluator_assignments(team_id) WHERE team_id IS NOT NULL;

-- ============================================================================
-- PART 3: BACKFILL EXISTING DATA
-- ============================================================================

-- Backfill team_id for call_reports
UPDATE call_reports cr
SET team_id = u.team_id
FROM users u
WHERE cr.created_by = u.id AND cr.team_id IS NULL AND u.team_id IS NOT NULL;

-- Backfill team_id for stories
UPDATE stories s
SET team_id = u.team_id
FROM users u
WHERE s.created_by = u.id AND s.team_id IS NULL AND u.team_id IS NOT NULL;

-- Backfill team_id for evaluator_forms
UPDATE evaluator_forms ef
SET team_id = u.team_id
FROM users u
WHERE ef.evaluator_id = u.id AND ef.team_id IS NULL AND u.team_id IS NOT NULL;

-- Backfill team_id for episodes
UPDATE episodes e
SET team_id = u.team_id
FROM users u
WHERE e.logged_by = u.id AND e.team_id IS NULL AND u.team_id IS NOT NULL;

-- Backfill team_id for episodic_evaluations
UPDATE episodic_evaluations ee
SET team_id = u.team_id
FROM users u
WHERE ee.evaluator_id = u.id AND ee.team_id IS NULL AND u.team_id IS NOT NULL;

-- Backfill team_id for detailed_one_liners
UPDATE detailed_one_liners dol
SET team_id = u.team_id
FROM users u
WHERE dol.created_by = u.id AND dol.team_id IS NULL AND u.team_id IS NOT NULL;

-- Backfill team_id for evaluator_assignments
UPDATE evaluator_assignments ea
SET team_id = u.team_id
FROM users u
WHERE ea.evaluator_id = u.id AND ea.team_id IS NULL AND u.team_id IS NOT NULL;

-- ============================================================================
-- PART 4: AUTO-POPULATE team_id ON INSERT (TRIGGERS)
-- ============================================================================

-- Trigger function to auto-populate team_id from creator's team
CREATE OR REPLACE FUNCTION auto_populate_team_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get team_id from the user who is creating/evaluating/logging
  IF TG_TABLE_NAME = 'call_reports' THEN
    SELECT team_id INTO NEW.team_id FROM users WHERE id = NEW.created_by;
  ELSIF TG_TABLE_NAME = 'stories' THEN
    SELECT team_id INTO NEW.team_id FROM users WHERE id = NEW.created_by;
  ELSIF TG_TABLE_NAME = 'evaluator_forms' THEN
    SELECT team_id INTO NEW.team_id FROM users WHERE id = NEW.evaluator_id;
  ELSIF TG_TABLE_NAME = 'episodes' THEN
    SELECT team_id INTO NEW.team_id FROM users WHERE id = NEW.logged_by;
  ELSIF TG_TABLE_NAME = 'episodic_evaluations' THEN
    SELECT team_id INTO NEW.team_id FROM users WHERE id = NEW.evaluator_id;
  ELSIF TG_TABLE_NAME = 'detailed_one_liners' THEN
    SELECT team_id INTO NEW.team_id FROM users WHERE id = NEW.created_by;
  ELSIF TG_TABLE_NAME = 'evaluator_assignments' THEN
    SELECT team_id INTO NEW.team_id FROM users WHERE id = NEW.evaluator_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for each table
DROP TRIGGER IF EXISTS call_reports_auto_team_id ON call_reports;
CREATE TRIGGER call_reports_auto_team_id
  BEFORE INSERT ON call_reports
  FOR EACH ROW
  WHEN (NEW.team_id IS NULL)
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS stories_auto_team_id ON stories;
CREATE TRIGGER stories_auto_team_id
  BEFORE INSERT ON stories
  FOR EACH ROW
  WHEN (NEW.team_id IS NULL)
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS evaluator_forms_auto_team_id ON evaluator_forms;
CREATE TRIGGER evaluator_forms_auto_team_id
  BEFORE INSERT ON evaluator_forms
  FOR EACH ROW
  WHEN (NEW.team_id IS NULL)
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS episodes_auto_team_id ON episodes;
CREATE TRIGGER episodes_auto_team_id
  BEFORE INSERT ON episodes
  FOR EACH ROW
  WHEN (NEW.team_id IS NULL)
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS episodic_evaluations_auto_team_id ON episodic_evaluations;
CREATE TRIGGER episodic_evaluations_auto_team_id
  BEFORE INSERT ON episodic_evaluations
  FOR EACH ROW
  WHEN (NEW.team_id IS NULL)
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS detailed_one_liners_auto_team_id ON detailed_one_liners;
CREATE TRIGGER detailed_one_liners_auto_team_id
  BEFORE INSERT ON detailed_one_liners
  FOR EACH ROW
  WHEN (NEW.team_id IS NULL)
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS evaluator_assignments_auto_team_id ON evaluator_assignments;
CREATE TRIGGER evaluator_assignments_auto_team_id
  BEFORE INSERT ON evaluator_assignments
  FOR EACH ROW
  WHEN (NEW.team_id IS NULL)
  EXECUTE FUNCTION auto_populate_team_id();

-- ============================================================================
-- PART 5: AUTO-CREATE TEAM WHEN CONTENT_HEAD USER IS CREATED
-- ============================================================================

-- Function to auto-create team when content_head user is created
CREATE OR REPLACE FUNCTION auto_create_team_for_content_head()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Only create team for content_head role
  IF NEW.role = 'content_head' AND NEW.team_id IS NULL THEN
    -- Create new team with content_head as team_head
    INSERT INTO teams (
      name,
      description,
      team_type,
      team_head_id
    ) VALUES (
      NEW.name || '''s Team',
      'Team automatically created for ' || NEW.name,
      'production', -- Default team type
      NEW.id
    )
    RETURNING id INTO new_team_id;

    -- Assign the content_head to their new team
    NEW.team_id = new_team_id;

    RAISE NOTICE 'Auto-created team % for content_head %', new_team_id, NEW.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-team-creation
DROP TRIGGER IF EXISTS users_auto_create_team_trigger ON users;
CREATE TRIGGER users_auto_create_team_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  WHEN (NEW.role = 'content_head')
  EXECUTE FUNCTION auto_create_team_for_content_head();

-- ============================================================================
-- PART 6: UPDATE HELPER FUNCTIONS
-- ============================================================================

-- Helper function to check if user has management access (sees all teams)
CREATE OR REPLACE FUNCTION has_global_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'management')
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_global_access() IS 'Returns true if user is admin or management (can see all teams)';

-- Helper function to get current user's team_id
CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT team_id
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_team_id() IS 'Returns the team_id of the currently authenticated user';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
