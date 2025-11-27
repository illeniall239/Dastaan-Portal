-- ============================================================================
-- ROLLBACK: Remove Team Isolation Policies and Columns
-- ============================================================================
-- Migration: 20251126000000_rollback_team_policies.sql
-- Purpose: Clean up any partially applied team isolation changes
--          Run this FIRST if you need to start fresh
-- ============================================================================

-- ============================================================================
-- PART 1: DROP ALL TEAM ISOLATION RLS POLICIES
-- ============================================================================

-- Call Reports Policies
DROP POLICY IF EXISTS "Management global access - call_reports SELECT" ON call_reports;
DROP POLICY IF EXISTS "Team-scoped access - call_reports SELECT" ON call_reports;
DROP POLICY IF EXISTS "Management global access - call_reports INSERT" ON call_reports;
DROP POLICY IF EXISTS "Team-scoped access - call_reports INSERT" ON call_reports;
DROP POLICY IF EXISTS "Management global access - call_reports UPDATE" ON call_reports;
DROP POLICY IF EXISTS "Team-scoped access - call_reports UPDATE" ON call_reports;
DROP POLICY IF EXISTS "Management global access - call_reports DELETE" ON call_reports;
DROP POLICY IF EXISTS "Team-scoped access - call_reports DELETE" ON call_reports;

-- Stories Policies
DROP POLICY IF EXISTS "Management global access - stories SELECT" ON stories;
DROP POLICY IF EXISTS "Team-scoped access - stories SELECT" ON stories;
DROP POLICY IF EXISTS "Management global access - stories INSERT" ON stories;
DROP POLICY IF EXISTS "Team-scoped access - stories INSERT" ON stories;
DROP POLICY IF EXISTS "Management global access - stories UPDATE" ON stories;
DROP POLICY IF EXISTS "Team-scoped access - stories UPDATE" ON stories;
DROP POLICY IF EXISTS "Management global access - stories DELETE" ON stories;
DROP POLICY IF EXISTS "Team-scoped access - stories DELETE" ON stories;

-- Evaluator Forms Policies
DROP POLICY IF EXISTS "Management global access - evaluator_forms SELECT" ON evaluator_forms;
DROP POLICY IF EXISTS "Team-scoped access - evaluator_forms SELECT" ON evaluator_forms;
DROP POLICY IF EXISTS "Management global access - evaluator_forms INSERT" ON evaluator_forms;
DROP POLICY IF EXISTS "Team-scoped access - evaluator_forms INSERT" ON evaluator_forms;
DROP POLICY IF EXISTS "Management global access - evaluator_forms UPDATE" ON evaluator_forms;
DROP POLICY IF EXISTS "Team-scoped access - evaluator_forms UPDATE" ON evaluator_forms;
DROP POLICY IF EXISTS "Management global access - evaluator_forms DELETE" ON evaluator_forms;
DROP POLICY IF EXISTS "Team-scoped access - evaluator_forms DELETE" ON evaluator_forms;

-- Evaluator Assignments Policies
DROP POLICY IF EXISTS "Management global access - evaluator_assignments SELECT" ON evaluator_assignments;
DROP POLICY IF EXISTS "Team-scoped access - evaluator_assignments SELECT" ON evaluator_assignments;
DROP POLICY IF EXISTS "Management global access - evaluator_assignments INSERT" ON evaluator_assignments;
DROP POLICY IF EXISTS "Team-scoped access - evaluator_assignments INSERT" ON evaluator_assignments;
DROP POLICY IF EXISTS "Management global access - evaluator_assignments UPDATE" ON evaluator_assignments;
DROP POLICY IF EXISTS "Team-scoped access - evaluator_assignments UPDATE" ON evaluator_assignments;
DROP POLICY IF EXISTS "Management global access - evaluator_assignments DELETE" ON evaluator_assignments;
DROP POLICY IF EXISTS "Team-scoped access - evaluator_assignments DELETE" ON evaluator_assignments;

-- Episodes Policies
DROP POLICY IF EXISTS "Management global access - episodes SELECT" ON episodes;
DROP POLICY IF EXISTS "Team-scoped access - episodes SELECT" ON episodes;
DROP POLICY IF EXISTS "Management global access - episodes INSERT" ON episodes;
DROP POLICY IF EXISTS "Team-scoped access - episodes INSERT" ON episodes;
DROP POLICY IF EXISTS "Management global access - episodes UPDATE" ON episodes;
DROP POLICY IF EXISTS "Team-scoped access - episodes UPDATE" ON episodes;
DROP POLICY IF EXISTS "Management global access - episodes DELETE" ON episodes;
DROP POLICY IF EXISTS "Team-scoped access - episodes DELETE" ON episodes;

-- Episodic Evaluations Policies
DROP POLICY IF EXISTS "Management global access - episodic_evaluations SELECT" ON episodic_evaluations;
DROP POLICY IF EXISTS "Team-scoped access - episodic_evaluations SELECT" ON episodic_evaluations;
DROP POLICY IF EXISTS "Management global access - episodic_evaluations INSERT" ON episodic_evaluations;
DROP POLICY IF EXISTS "Team-scoped access - episodic_evaluations INSERT" ON episodic_evaluations;
DROP POLICY IF EXISTS "Management global access - episodic_evaluations UPDATE" ON episodic_evaluations;
DROP POLICY IF EXISTS "Team-scoped access - episodic_evaluations UPDATE" ON episodic_evaluations;
DROP POLICY IF EXISTS "Management global access - episodic_evaluations DELETE" ON episodic_evaluations;
DROP POLICY IF EXISTS "Team-scoped access - episodic_evaluations DELETE" ON episodic_evaluations;

-- Detailed One-Liners Policies
DROP POLICY IF EXISTS "Management global access - detailed_one_liners SELECT" ON detailed_one_liners;
DROP POLICY IF EXISTS "Team-scoped access - detailed_one_liners SELECT" ON detailed_one_liners;
DROP POLICY IF EXISTS "Management global access - detailed_one_liners INSERT" ON detailed_one_liners;
DROP POLICY IF EXISTS "Team-scoped access - detailed_one_liners INSERT" ON detailed_one_liners;
DROP POLICY IF EXISTS "Management global access - detailed_one_liners UPDATE" ON detailed_one_liners;
DROP POLICY IF EXISTS "Team-scoped access - detailed_one_liners UPDATE" ON detailed_one_liners;
DROP POLICY IF EXISTS "Management global access - detailed_one_liners DELETE" ON detailed_one_liners;
DROP POLICY IF EXISTS "Team-scoped access - detailed_one_liners DELETE" ON detailed_one_liners;

-- ============================================================================
-- PART 2: DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS call_reports_auto_team_id ON call_reports;
DROP TRIGGER IF EXISTS stories_auto_team_id ON stories;
DROP TRIGGER IF EXISTS evaluator_forms_auto_team_id ON evaluator_forms;
DROP TRIGGER IF EXISTS episodes_auto_team_id ON episodes;
DROP TRIGGER IF EXISTS episodic_evaluations_auto_team_id ON episodic_evaluations;
DROP TRIGGER IF EXISTS detailed_one_liners_auto_team_id ON detailed_one_liners;
DROP TRIGGER IF EXISTS evaluator_assignments_auto_team_id ON evaluator_assignments;
DROP TRIGGER IF EXISTS users_auto_create_team_trigger ON users;

-- ============================================================================
-- PART 3: DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS auto_populate_team_id() CASCADE;
DROP FUNCTION IF EXISTS auto_create_team_for_content_head() CASCADE;
DROP FUNCTION IF EXISTS has_global_access() CASCADE;
DROP FUNCTION IF EXISTS get_user_team_id() CASCADE;

-- ============================================================================
-- PART 4: DROP INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_call_reports_team_id;
DROP INDEX IF EXISTS idx_stories_team_id;
DROP INDEX IF EXISTS idx_evaluator_forms_team_id;
DROP INDEX IF EXISTS idx_episodes_team_id;
DROP INDEX IF EXISTS idx_episodic_evaluations_team_id;
DROP INDEX IF EXISTS idx_detailed_one_liners_team_id;
DROP INDEX IF EXISTS idx_evaluator_assignments_team_id;

-- ============================================================================
-- PART 5: DROP COLUMNS (OPTIONAL - Comment out if you want to keep data)
-- ============================================================================
-- WARNING: Uncommenting these will DELETE all team_id data from these tables
-- Only uncomment if you want a complete fresh start

-- ALTER TABLE call_reports DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE stories DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE evaluator_forms DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE episodes DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE episodic_evaluations DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE detailed_one_liners DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE evaluator_assignments DROP COLUMN IF EXISTS team_id;

-- ============================================================================
-- END OF ROLLBACK MIGRATION
-- ============================================================================

-- After running this, you can run the team isolation migrations in order:
-- 1. 20251126000000_team_isolation_schema.sql
-- 2. 20251126000001_team_isolation_rls.sql
-- 3. 20251126000002_team_scoped_evaluator_assignment.sql
