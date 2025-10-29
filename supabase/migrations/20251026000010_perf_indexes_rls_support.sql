-- Additional performance indexes to support common filters and RLS predicates

-- Call reports: frequently filtered by meeting_type, status, created_by
CREATE INDEX IF NOT EXISTS idx_call_reports_meeting_type ON call_reports(meeting_type);
CREATE INDEX IF NOT EXISTS idx_call_reports_status ON call_reports(status);
CREATE INDEX IF NOT EXISTS idx_call_reports_created_by ON call_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_call_reports_meeting_date ON call_reports(meeting_date);

-- Evaluator forms: lookup by call_report_id, evaluator_id, submitted_at
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_evaluator_id ON evaluator_forms(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_submitted_at ON evaluator_forms(submitted_at);

-- Evaluation logs: final_decision filters and call_report_id joins
CREATE INDEX IF NOT EXISTS idx_evaluation_logs_final_decision ON evaluation_logs(final_decision);

-- Audit logs: timestamp range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Payments: status and payment_date are commonly used
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);


