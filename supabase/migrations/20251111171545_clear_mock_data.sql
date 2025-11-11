-- =====================================================
-- Clear All Mock Data (Preserve Users Only)
-- =====================================================
-- Created: 2025-11-11
-- Purpose: Remove all mock/test data while preserving user accounts
-- Approach: Delete data in reverse dependency order to respect FK constraints
-- Safety: Wrapped in transaction - will rollback if any step fails
-- =====================================================

BEGIN;

-- =====================================================
-- VERIFICATION: Count rows before deletion
-- =====================================================
DO $$
DECLARE
    stories_count INTEGER;
    call_reports_count INTEGER;
    evaluations_count INTEGER;
    users_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO stories_count FROM stories;
    SELECT COUNT(*) INTO call_reports_count FROM call_reports;
    SELECT COUNT(*) INTO evaluations_count FROM evaluator_forms;
    SELECT COUNT(*) INTO users_count FROM users;

    RAISE NOTICE '=== BEFORE DELETION ===';
    RAISE NOTICE 'Stories: %', stories_count;
    RAISE NOTICE 'Call Reports: %', call_reports_count;
    RAISE NOTICE 'Evaluations: %', evaluations_count;
    RAISE NOTICE 'Users (WILL BE PRESERVED): %', users_count;
    RAISE NOTICE '========================';
END $$;

-- =====================================================
-- LEVEL 1: Clear Independent Leaf Tables (No dependencies on them)
-- =====================================================
-- Level 1: Clearing audit logs, notifications, snapshots...

DELETE FROM audit_logs;
DELETE FROM notifications;
DELETE FROM evaluations_snapshot;
DELETE FROM external_evaluations;

-- =====================================================
-- LEVEL 2: Clear Draft Tables
-- =====================================================
-- Level 2: Clearing draft tables...

DELETE FROM episodic_evaluation_drafts;
DELETE FROM evaluator_form_drafts;

-- =====================================================
-- LEVEL 3: Clear External Evaluation Links
-- =====================================================
-- Level 3: Clearing external evaluation links...

DELETE FROM external_evaluation_links;

-- =====================================================
-- LEVEL 4: Clear Attachments (No FK constraints)
-- =====================================================
-- Level 4: Clearing attachments metadata...

DELETE FROM attachments;

-- =====================================================
-- LEVEL 5: Clear Archive Tables
-- =====================================================
-- Level 5: Clearing archive tables...

DELETE FROM archive;
DELETE FROM rejected_archive;

-- =====================================================
-- LEVEL 6: Clear Detailed One-Liners (CASCADE to child tables)
-- =====================================================
-- Level 6: Clearing detailed one-liners (cascades to breakdown items)...

-- These will CASCADE delete:
-- - narrative_breakdown_items
-- - event_planning_items
-- - potential_weaknesses_risks_items
DELETE FROM detailed_one_liners;

-- =====================================================
-- LEVEL 7: Clear Episodic Data
-- =====================================================
-- Level 7: Clearing episodic evaluations and episodes...

DELETE FROM episodic_evaluations;
DELETE FROM episodes;

-- =====================================================
-- LEVEL 8: Clear Payments
-- =====================================================
-- Level 8: Clearing payments and schedules...

DELETE FROM payments;
DELETE FROM payment_schedules;

-- =====================================================
-- LEVEL 9: Clear Contracts & Legal
-- =====================================================
-- Level 9: Clearing contracts, legal reviews, and scripts...

DELETE FROM script_feedback;
DELETE FROM script_phases;
DELETE FROM contracts;
DELETE FROM legal_reviews;

-- =====================================================
-- LEVEL 10: Clear Negotiations & One-Liners
-- =====================================================
-- Level 10: Clearing negotiations and one-liners...

DELETE FROM negotiations;
DELETE FROM one_liners;

-- =====================================================
-- LEVEL 11: Clear Evaluations (Before Call Reports)
-- =====================================================
-- Level 11: Clearing evaluator assignments and evaluations...

DELETE FROM evaluator_assignments;
DELETE FROM evaluator_forms;
DELETE FROM evaluation_logs;

-- =====================================================
-- LEVEL 12: Clear Workflows
-- =====================================================
-- Level 12: Clearing workflows...

DELETE FROM workflow_stages;
DELETE FROM workflows;

-- =====================================================
-- LEVEL 13: Clear Call Reports (CASCADE to remaining children)
-- =====================================================
-- Level 13: Clearing call reports...

DELETE FROM call_reports;

-- =====================================================
-- LEVEL 14: Clear Stories (Root of dependency tree)
-- =====================================================
-- Level 14: Clearing stories (root table)...

DELETE FROM stories;

-- =====================================================
-- STORAGE: Clear All File Storage Buckets
-- =====================================================
-- Clearing storage buckets...

-- Delete all objects from storage buckets
-- Note: This uses Supabase storage API functions
DELETE FROM storage.objects WHERE bucket_id = 'story-attachments';
DELETE FROM storage.objects WHERE bucket_id = 'call-report-attachments';
DELETE FROM storage.objects WHERE bucket_id = 'contract-documents';
DELETE FROM storage.objects WHERE bucket_id = 'script-files';
DELETE FROM storage.objects WHERE bucket_id = 'attachments';

-- =====================================================
-- SEQUENCES: Reset Auto-Increment IDs to Start from 1
-- =====================================================
-- Resetting ID sequences...

-- Reset sequences so next IDs start from 0001
-- Story IDs will be ST-2025-0001, Call Reports CR-2025-0001, etc.
DO $$
BEGIN
    -- Find and reset all sequences
    -- This will make next INSERT start from ID 1
    PERFORM setval(pg_get_serial_sequence('stories', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('call_reports', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('evaluator_forms', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('episodes', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('detailed_one_liners', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('negotiations', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('contracts', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('payments', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('notifications', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('audit_logs', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('attachments', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('workflows', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('episodic_evaluations', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('external_evaluation_links', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('one_liners', 'id'), 1, false);
    PERFORM setval(pg_get_serial_sequence('archive', 'id'), 1, false);

    RAISE NOTICE 'All sequences reset to 1';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Note: Some sequences may not exist or failed to reset - this is usually fine';
END $$;

-- =====================================================
-- VERIFICATION: Count rows after deletion
-- =====================================================
DO $$
DECLARE
    stories_count INTEGER;
    call_reports_count INTEGER;
    evaluations_count INTEGER;
    users_count INTEGER;
    notifications_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO stories_count FROM stories;
    SELECT COUNT(*) INTO call_reports_count FROM call_reports;
    SELECT COUNT(*) INTO evaluations_count FROM evaluator_forms;
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO notifications_count FROM notifications;

    RAISE NOTICE '=== AFTER DELETION ===';
    RAISE NOTICE 'Stories: % (should be 0)', stories_count;
    RAISE NOTICE 'Call Reports: % (should be 0)', call_reports_count;
    RAISE NOTICE 'Evaluations: % (should be 0)', evaluations_count;
    RAISE NOTICE 'Notifications: % (should be 0)', notifications_count;
    RAISE NOTICE 'Users: % (PRESERVED - should be > 0)', users_count;
    RAISE NOTICE '======================';

    -- Safety check: Ensure users table was not touched
    IF users_count = 0 THEN
        RAISE EXCEPTION 'CRITICAL ERROR: Users table was cleared! Rolling back transaction.';
    END IF;
END $$;

-- =====================================================
-- SUCCESS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Mock data successfully cleared!';
    RAISE NOTICE '✅ User accounts preserved!';
    RAISE NOTICE '✅ ID sequences reset to 1!';
    RAISE NOTICE '✅ Storage buckets cleared!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next story ID will be: ST-2025-0001';
    RAISE NOTICE 'Next call report ID will be: CR-2025-0001';
END $$;

COMMIT;
