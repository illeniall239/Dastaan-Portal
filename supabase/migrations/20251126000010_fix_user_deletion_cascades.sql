-- ============================================================================
-- FIX USER DELETION: Add CASCADE/SET NULL to Foreign Keys
-- ============================================================================
-- Migration: 20251126000010_fix_user_deletion_cascades.sql
-- Purpose: Fix user deletion failures by adding proper ON DELETE constraints
--          to all foreign keys referencing users.id
--
-- Problem: 15+ foreign keys have implicit ON DELETE NO ACTION, blocking user
--          deletion when child records exist
--
-- Solution:
--   - Use ON DELETE SET NULL for historical/audit records (preserve data)
--   - Use ON DELETE CASCADE for user-specific data (delete with user)
-- ============================================================================

-- ============================================================================
-- HISTORICAL/AUDIT RECORDS: SET NULL (preserve record, null out user reference)
-- ============================================================================

-- Stories: Keep story record, null out creator reference
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_created_by_fkey;
ALTER TABLE stories ADD CONSTRAINT stories_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Call Reports: Keep report record, null out creator reference
ALTER TABLE call_reports DROP CONSTRAINT IF EXISTS call_reports_created_by_fkey;
ALTER TABLE call_reports ADD CONSTRAINT call_reports_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- One-Liners: Keep decision record, null out decider reference
ALTER TABLE one_liners DROP CONSTRAINT IF EXISTS one_liners_decided_by_fkey;
ALTER TABLE one_liners ADD CONSTRAINT one_liners_decided_by_fkey
  FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL;

-- Negotiations: Keep negotiation record, null out creator reference
ALTER TABLE negotiations DROP CONSTRAINT IF EXISTS negotiations_created_by_fkey;
ALTER TABLE negotiations ADD CONSTRAINT negotiations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Legal Reviews: Keep review record, null out assigned user
ALTER TABLE legal_reviews DROP CONSTRAINT IF EXISTS legal_reviews_assigned_to_fkey;
ALTER TABLE legal_reviews ADD CONSTRAINT legal_reviews_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- Legal Reviews: Keep review record, null out decider reference
ALTER TABLE legal_reviews DROP CONSTRAINT IF EXISTS legal_reviews_decided_by_fkey;
ALTER TABLE legal_reviews ADD CONSTRAINT legal_reviews_decided_by_fkey
  FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL;

-- Contracts: Keep contract record, null out party representative
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_party_a_rep_id_fkey;
ALTER TABLE contracts ADD CONSTRAINT contracts_party_a_rep_id_fkey
  FOREIGN KEY (party_a_rep_id) REFERENCES users(id) ON DELETE SET NULL;

-- Payments: Keep payment record, null out preparer reference
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_prepared_by_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_prepared_by_fkey
  FOREIGN KEY (prepared_by) REFERENCES users(id) ON DELETE SET NULL;

-- Payments: Keep payment record, null out approver reference
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_approved_by_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Script Feedback: Keep feedback record, null out reviewer reference
ALTER TABLE script_feedback DROP CONSTRAINT IF EXISTS script_feedback_reviewer_id_fkey;
ALTER TABLE script_feedback ADD CONSTRAINT script_feedback_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL;

-- Archive: Keep archive record, null out rejector reference
ALTER TABLE archive DROP CONSTRAINT IF EXISTS archive_rejected_by_fkey;
ALTER TABLE archive ADD CONSTRAINT archive_rejected_by_fkey
  FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL;

-- Attachments: Keep attachment record, null out uploader reference
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_uploaded_by_fkey;
ALTER TABLE attachments ADD CONSTRAINT attachments_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- Audit Logs: Keep audit log, null out performer reference (for compliance)
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_performed_by_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_performed_by_fkey
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Workflow Stages: Keep workflow record, null out assigned user
ALTER TABLE workflow_stages DROP CONSTRAINT IF EXISTS workflow_stages_assigned_to_fkey;
ALTER TABLE workflow_stages ADD CONSTRAINT workflow_stages_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- USER-SPECIFIC DATA: CASCADE (delete with user)
-- ============================================================================

-- Evaluator Forms: Delete evaluator's forms when evaluator is deleted
-- Rationale: Evaluator forms are user-specific work products
ALTER TABLE evaluator_forms DROP CONSTRAINT IF EXISTS evaluator_forms_evaluator_id_fkey;
ALTER TABLE evaluator_forms ADD CONSTRAINT evaluator_forms_evaluator_id_fkey
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE;

-- Evaluator Assignments: Delete assignments when evaluator is deleted
-- Rationale: Assignments are user-specific and meaningless without the evaluator
ALTER TABLE evaluator_assignments DROP CONSTRAINT IF EXISTS evaluator_assignments_evaluator_id_fkey;
ALTER TABLE evaluator_assignments ADD CONSTRAINT evaluator_assignments_evaluator_id_fkey
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- VERIFICATION COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT stories_created_by_fkey ON stories IS
  'ON DELETE SET NULL: Preserve story record when creator is deleted';

COMMENT ON CONSTRAINT call_reports_created_by_fkey ON call_reports IS
  'ON DELETE SET NULL: Preserve call report record when creator is deleted';

COMMENT ON CONSTRAINT evaluator_forms_evaluator_id_fkey ON evaluator_forms IS
  'ON DELETE CASCADE: Delete evaluator forms when evaluator is deleted';

COMMENT ON CONSTRAINT evaluator_assignments_evaluator_id_fkey ON evaluator_assignments IS
  'ON DELETE CASCADE: Delete evaluator assignments when evaluator is deleted';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Post-migration testing instructions:
-- 1. Create a test user with some data (story, call report, evaluator form)
-- 2. Delete the test user
-- 3. Verify:
--    - User is deleted successfully
--    - Stories/call reports still exist with created_by = NULL
--    - Evaluator forms are deleted (CASCADE)
--    - No foreign key constraint errors
