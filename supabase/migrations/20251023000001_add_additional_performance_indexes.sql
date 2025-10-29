-- Additional Performance Indexes for Management Dashboard
-- Created: 2025-10-23
-- Purpose: Add missing indexes for payment, contract, and audit queries

-- Index on payments.status for filtering
CREATE INDEX IF NOT EXISTS idx_payments_status
ON payments(status);

-- Index on contracts.status for active contract queries
CREATE INDEX IF NOT EXISTS idx_contracts_status
ON contracts(status);

-- Index on negotiations.status for pending negotiations
CREATE INDEX IF NOT EXISTS idx_negotiations_status
ON negotiations(status);

-- Index on audit_logs.timestamp for time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
ON audit_logs(timestamp DESC);

-- Index on stories for updated_at (used in stuck project detection)
CREATE INDEX IF NOT EXISTS idx_stories_updated_at
ON stories(updated_at DESC);

-- Composite index on stories for completed this month queries
CREATE INDEX IF NOT EXISTS idx_stories_status_updated_at
ON stories(status, updated_at DESC)
WHERE status = 'completed';

-- Index on legal_reviews for pending review queries
CREATE INDEX IF NOT EXISTS idx_legal_reviews_decided_at
ON legal_reviews(decided_at)
WHERE decided_at IS NULL;

-- Comments
COMMENT ON INDEX idx_payments_status IS 'Improves payment status filtering performance';
COMMENT ON INDEX idx_contracts_status IS 'Speeds up active contract queries';
COMMENT ON INDEX idx_negotiations_status IS 'Optimizes negotiation status filtering';
COMMENT ON INDEX idx_audit_logs_timestamp IS 'Faster time-based audit log queries';
COMMENT ON INDEX idx_stories_updated_at IS 'Improves stuck project detection queries';
COMMENT ON INDEX idx_legal_reviews_decided_at IS 'Speeds up pending legal review queries';
