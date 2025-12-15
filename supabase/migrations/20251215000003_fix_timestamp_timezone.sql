-- Fix timezone issue: Convert all TIMESTAMP columns to TIMESTAMPTZ
-- This migration fixes the 5-hour offset issue by adding timezone information to all timestamp columns
-- PostgreSQL will preserve existing UTC times and add timezone metadata

-- Core workflow tables
ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ;

ALTER TABLE stories ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE stories ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE stories ALTER COLUMN submitted_at TYPE TIMESTAMPTZ;

ALTER TABLE call_reports ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE call_reports ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE call_reports ALTER COLUMN meeting_date TYPE TIMESTAMPTZ;
ALTER TABLE call_reports ALTER COLUMN evaluation_deadline TYPE TIMESTAMPTZ;

ALTER TABLE evaluator_forms ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE evaluator_forms ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE evaluator_forms ALTER COLUMN submitted_at TYPE TIMESTAMPTZ;

ALTER TABLE evaluation_logs ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE evaluation_logs ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE evaluation_logs ALTER COLUMN evaluated_at TYPE TIMESTAMPTZ;

-- Business logic tables
ALTER TABLE one_liners ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE one_liners ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE one_liners ALTER COLUMN submitted_at TYPE TIMESTAMPTZ;

ALTER TABLE negotiations ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE negotiations ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE negotiations ALTER COLUMN agreed_at TYPE TIMESTAMPTZ;
ALTER TABLE negotiations ALTER COLUMN failed_at TYPE TIMESTAMPTZ;

ALTER TABLE legal_reviews ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE legal_reviews ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE legal_reviews ALTER COLUMN reviewed_at TYPE TIMESTAMPTZ;

ALTER TABLE contracts ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE contracts ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE contracts ALTER COLUMN signing_date TYPE TIMESTAMPTZ;

ALTER TABLE payment_schedules ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE payment_schedules ALTER COLUMN due_date TYPE TIMESTAMPTZ;

ALTER TABLE payments ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE payments ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE payments ALTER COLUMN payment_date TYPE TIMESTAMPTZ;

-- Script development tables
ALTER TABLE script_phases ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE script_phases ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE script_phases ALTER COLUMN started_at TYPE TIMESTAMPTZ;
ALTER TABLE script_phases ALTER COLUMN completed_at TYPE TIMESTAMPTZ;

ALTER TABLE script_feedback ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Supporting tables
ALTER TABLE archive ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE archive ALTER COLUMN rejected_at TYPE TIMESTAMPTZ;

ALTER TABLE attachments ALTER COLUMN created_at TYPE TIMESTAMPTZ;

ALTER TABLE notifications ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE notifications ALTER COLUMN read_at TYPE TIMESTAMPTZ;

ALTER TABLE audit_logs ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- Episodes table
ALTER TABLE episodes ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE episodes ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- Episodic evaluations
ALTER TABLE episodic_evaluations ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE episodic_evaluations ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE episodic_evaluations ALTER COLUMN submitted_at TYPE TIMESTAMPTZ;

-- External evaluations
ALTER TABLE external_evaluation_links ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE external_evaluation_links ALTER COLUMN expires_at TYPE TIMESTAMPTZ;

ALTER TABLE external_evaluations ALTER COLUMN submitted_at TYPE TIMESTAMPTZ;

-- Teams
ALTER TABLE teams ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE teams ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

ALTER TABLE team_members ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE team_members ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

ALTER TABLE team_change_requests ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE team_change_requests ALTER COLUMN resolved_at TYPE TIMESTAMPTZ;
