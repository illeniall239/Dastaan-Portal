-- ============================================================================
-- ENFORCE TEAM ISOLATION - DROP ALL POLICIES AND RECREATE STRICT ONES
-- ============================================================================
-- Purpose: Fix team isolation by removing ALL existing RLS policies
--          (including legacy permissive ones) and creating strict team-scoped policies
--
-- Root Cause: Legacy policy "Authenticated users can view call reports" with
--             USING(true) allows all users to see all data. PostgreSQL combines
--             SELECT policies with OR, so any permissive policy breaks isolation.
-- ============================================================================

-- ============================================================================
-- PART 1: DYNAMICALLY DROP ALL EXISTING POLICIES
-- ============================================================================

-- Drop ALL policies on call_reports
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'call_reports' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON call_reports', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Drop ALL policies on stories
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'stories' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON stories', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Drop ALL policies on episodes
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'episodes' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON episodes', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Drop ALL policies on evaluator_forms
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'evaluator_forms' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON evaluator_forms', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Drop ALL policies on episodic_evaluations
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'episodic_evaluations' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON episodic_evaluations', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Drop ALL policies on detailed_one_liners
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'detailed_one_liners' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON detailed_one_liners', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Drop ALL policies on evaluator_assignments
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'evaluator_assignments' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON evaluator_assignments', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- PART 2: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================

ALTER TABLE call_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodic_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_one_liners ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: CREATE STRICT TEAM-ISOLATED POLICIES
-- ============================================================================

-- Helper function check (recreate to ensure it exists and is correct)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT team_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- -----------------------------
-- CALL_REPORTS POLICIES
-- -----------------------------

-- SELECT: Admin/management see all, others see only their team
CREATE POLICY "call_reports_select_policy"
ON call_reports FOR SELECT
USING (
  -- Admin and management have global access
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  -- Everyone else: strict team match (both must be non-null and equal)
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

-- INSERT: Evaluators and content roles can create (team_id set by trigger)
CREATE POLICY "call_reports_insert_policy"
ON call_reports FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management', 'content_head', 'content_manager', 'evaluator', 'content_creator')
);

-- UPDATE: Admin/management can update all, others only their team
CREATE POLICY "call_reports_update_policy"
ON call_reports FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

-- DELETE: Only admin
CREATE POLICY "call_reports_delete_policy"
ON call_reports FOR DELETE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- -----------------------------
-- STORIES POLICIES
-- -----------------------------

CREATE POLICY "stories_select_policy"
ON stories FOR SELECT
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "stories_insert_policy"
ON stories FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management', 'content_head', 'content_manager', 'evaluator', 'content_creator')
);

CREATE POLICY "stories_update_policy"
ON stories FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "stories_delete_policy"
ON stories FOR DELETE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- -----------------------------
-- EPISODES POLICIES
-- -----------------------------

CREATE POLICY "episodes_select_policy"
ON episodes FOR SELECT
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "episodes_insert_policy"
ON episodes FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management', 'content_head', 'content_manager', 'evaluator', 'content_creator')
);

CREATE POLICY "episodes_update_policy"
ON episodes FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "episodes_delete_policy"
ON episodes FOR DELETE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- -----------------------------
-- EVALUATOR_FORMS POLICIES
-- -----------------------------

CREATE POLICY "evaluator_forms_select_policy"
ON evaluator_forms FOR SELECT
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "evaluator_forms_insert_policy"
ON evaluator_forms FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management', 'content_head', 'content_manager', 'evaluator')
);

CREATE POLICY "evaluator_forms_update_policy"
ON evaluator_forms FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
    AND evaluator_id = auth.uid()
  )
);

-- -----------------------------
-- EPISODIC_EVALUATIONS POLICIES
-- -----------------------------

CREATE POLICY "episodic_evaluations_select_policy"
ON episodic_evaluations FOR SELECT
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "episodic_evaluations_insert_policy"
ON episodic_evaluations FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management', 'content_head', 'content_manager', 'evaluator')
);

CREATE POLICY "episodic_evaluations_update_policy"
ON episodic_evaluations FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
    AND evaluator_id = auth.uid()
  )
);

-- -----------------------------
-- DETAILED_ONE_LINERS POLICIES
-- -----------------------------

CREATE POLICY "detailed_one_liners_select_policy"
ON detailed_one_liners FOR SELECT
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "detailed_one_liners_insert_policy"
ON detailed_one_liners FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management', 'content_head', 'content_manager', 'evaluator')
);

CREATE POLICY "detailed_one_liners_update_policy"
ON detailed_one_liners FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "detailed_one_liners_delete_policy"
ON detailed_one_liners FOR DELETE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- -----------------------------
-- EVALUATOR_ASSIGNMENTS POLICIES
-- -----------------------------

CREATE POLICY "evaluator_assignments_select_policy"
ON evaluator_assignments FOR SELECT
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "evaluator_assignments_insert_policy"
ON evaluator_assignments FOR INSERT
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management', 'content_head', 'content_manager')
);

CREATE POLICY "evaluator_assignments_update_policy"
ON evaluator_assignments FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'management')
  OR
  (
    team_id IS NOT NULL 
    AND (SELECT team_id FROM users WHERE id = auth.uid()) IS NOT NULL
    AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())
  )
);

-- ============================================================================
-- PART 4: ENSURE TEAM_ID IS POPULATED ON NEW RECORDS
-- ============================================================================

-- Recreate the auto-populate trigger to ensure it's working
CREATE OR REPLACE FUNCTION auto_populate_team_id()
RETURNS TRIGGER AS $$
DECLARE
  creator_team_id UUID;
BEGIN
  -- If team_id is already set, respect it
  IF NEW.team_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get team_id from the relevant user column
  CASE TG_TABLE_NAME
    WHEN 'call_reports' THEN
      SELECT team_id INTO creator_team_id FROM users WHERE id = COALESCE(NEW.created_by, auth.uid());
    WHEN 'stories' THEN
      SELECT team_id INTO creator_team_id FROM users WHERE id = COALESCE(NEW.created_by, auth.uid());
    WHEN 'evaluator_forms' THEN
      SELECT team_id INTO creator_team_id FROM users WHERE id = COALESCE(NEW.evaluator_id, auth.uid());
    WHEN 'episodes' THEN
      SELECT team_id INTO creator_team_id FROM users WHERE id = COALESCE(NEW.logged_by, auth.uid());
    WHEN 'episodic_evaluations' THEN
      SELECT team_id INTO creator_team_id FROM users WHERE id = COALESCE(NEW.evaluator_id, auth.uid());
    WHEN 'detailed_one_liners' THEN
      SELECT team_id INTO creator_team_id FROM users WHERE id = COALESCE(NEW.created_by, auth.uid());
    WHEN 'evaluator_assignments' THEN
      SELECT team_id INTO creator_team_id FROM users WHERE id = COALESCE(NEW.evaluator_id, auth.uid());
    ELSE
      creator_team_id := NULL;
  END CASE;

  -- Fallback: if still null, try to get from auth.uid() directly
  IF creator_team_id IS NULL THEN
    SELECT team_id INTO creator_team_id FROM users WHERE id = auth.uid();
  END IF;

  NEW.team_id := creator_team_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure triggers exist
DROP TRIGGER IF EXISTS call_reports_auto_team_id ON call_reports;
CREATE TRIGGER call_reports_auto_team_id
  BEFORE INSERT ON call_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS stories_auto_team_id ON stories;
CREATE TRIGGER stories_auto_team_id
  BEFORE INSERT ON stories
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS episodes_auto_team_id ON episodes;
CREATE TRIGGER episodes_auto_team_id
  BEFORE INSERT ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS evaluator_forms_auto_team_id ON evaluator_forms;
CREATE TRIGGER evaluator_forms_auto_team_id
  BEFORE INSERT ON evaluator_forms
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS episodic_evaluations_auto_team_id ON episodic_evaluations;
CREATE TRIGGER episodic_evaluations_auto_team_id
  BEFORE INSERT ON episodic_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS detailed_one_liners_auto_team_id ON detailed_one_liners;
CREATE TRIGGER detailed_one_liners_auto_team_id
  BEFORE INSERT ON detailed_one_liners
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_team_id();

DROP TRIGGER IF EXISTS evaluator_assignments_auto_team_id ON evaluator_assignments;
CREATE TRIGGER evaluator_assignments_auto_team_id
  BEFORE INSERT ON evaluator_assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_team_id();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

