-- Migration: Performance Indexes for Management Portal
-- Adds composite indexes for common management query patterns
-- Improves query performance for filtered and joined queries

-- Episode pipeline indexes
CREATE INDEX IF NOT EXISTS idx_episodes_call_report_id
  ON episodes(call_report_id)
  WHERE call_report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_episodic_evaluations_episode_id
  ON episodic_evaluations(episode_id);

CREATE INDEX IF NOT EXISTS idx_episodic_evaluations_evaluator_id
  ON episodic_evaluations(evaluator_id);

-- Composite index for evaluator performance with date filtering
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_evaluator_created
  ON evaluator_forms(evaluator_id, created_at);

CREATE INDEX IF NOT EXISTS idx_episodic_evals_evaluator_submitted
  ON episodic_evaluations(evaluator_id, submitted_at);

CREATE INDEX IF NOT EXISTS idx_call_reports_created_by
  ON call_reports(created_by);

CREATE INDEX IF NOT EXISTS idx_call_reports_created_by_date
  ON call_reports(created_by, created_at);

-- Financial summary indexes
CREATE INDEX IF NOT EXISTS idx_negotiations_status_writer
  ON negotiations(status, writer_producer_name)
  WHERE status = 'agreed';

CREATE INDEX IF NOT EXISTS idx_contracts_status
  ON contracts(status)
  WHERE status IN ('active', 'pending_signatures', 'completed');

CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id
  ON payment_schedules(contract_id);

CREATE INDEX IF NOT EXISTS idx_payments_schedule_status
  ON payments(schedule_id, status);

-- Critical alerts indexes
CREATE INDEX IF NOT EXISTS idx_stories_status_updated
  ON stories(status, updated_at)
  WHERE status NOT IN ('completed', 'rejected', 'archived');

CREATE INDEX IF NOT EXISTS idx_call_reports_status_created
  ON call_reports(status, created_at)
  WHERE status = 'ready_for_evaluation';

-- Add comments
COMMENT ON INDEX idx_episodes_call_report_id IS 'Optimizes episode fetching by drama/call report';
COMMENT ON INDEX idx_evaluator_forms_evaluator_created IS 'Optimizes evaluator stats with date filtering';
COMMENT ON INDEX idx_episodic_evals_evaluator_submitted IS 'Optimizes evaluator stats with date filtering';
COMMENT ON INDEX idx_negotiations_status_writer IS 'Optimizes writer financial summary aggregations';
COMMENT ON INDEX idx_contracts_status IS 'Optimizes contract queries';
