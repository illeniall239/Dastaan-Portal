-- Add performance indexes for frequently queried columns
-- This migration significantly improves query performance

-- =====================================================
-- Indexes for evaluator_forms table
-- =====================================================

-- Index for filtering evaluations by evaluator
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_evaluator_id
ON evaluator_forms(evaluator_id);

-- Index for filtering evaluations by call report
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_call_report_id
ON evaluator_forms(call_report_id);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_created_at
ON evaluator_forms(created_at DESC);

-- Composite index for common query pattern (evaluator + call report)
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_evaluator_call_report
ON evaluator_forms(evaluator_id, call_report_id);

-- =====================================================
-- Indexes for call_reports table
-- =====================================================

-- Index for filtering by meeting type
CREATE INDEX IF NOT EXISTS idx_call_reports_meeting_type
ON call_reports(meeting_type);

-- Index for filtering by created user
CREATE INDEX IF NOT EXISTS idx_call_reports_created_by
ON call_reports(created_by);

-- Index for sorting by meeting date
CREATE INDEX IF NOT EXISTS idx_call_reports_meeting_date
ON call_reports(meeting_date DESC);

-- Composite index for meeting type + date (common query)
CREATE INDEX IF NOT EXISTS idx_call_reports_type_date
ON call_reports(meeting_type, meeting_date DESC);

-- =====================================================
-- Indexes for attachments table
-- =====================================================

-- Index for filtering attachments by entity
CREATE INDEX IF NOT EXISTS idx_attachments_entity
ON attachments(entity_type, entity_id);

-- Index for filtering by uploader
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by
ON attachments(uploaded_by);

-- =====================================================
-- Indexes for audit_logs table
-- =====================================================

-- Index for filtering audit logs by entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_composite
ON audit_logs(entity_type, entity_id);

-- Index for filtering by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by
ON audit_logs(performed_by);

-- Index for sorting by timestamp
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
ON audit_logs(timestamp DESC);

-- =====================================================
-- Indexes for notifications table
-- =====================================================

-- Index for filtering by read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, is_read);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON notifications(created_at DESC);

-- =====================================================
-- Indexes for users table
-- =====================================================

-- Index for filtering by role
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status);

-- =====================================================
-- Add comment for documentation
-- =====================================================

COMMENT ON INDEX idx_evaluator_forms_evaluator_id IS 'Performance: Speeds up queries filtering evaluations by evaluator';
COMMENT ON INDEX idx_call_reports_meeting_type IS 'Performance: Speeds up queries filtering call reports by meeting type';
COMMENT ON INDEX idx_attachments_entity IS 'Performance: Speeds up queries fetching attachments for entities';
COMMENT ON INDEX idx_audit_logs_entity_composite IS 'Performance: Speeds up audit log queries by entity';
COMMENT ON INDEX idx_notifications_user_read IS 'Performance: Speeds up notification queries for users';
