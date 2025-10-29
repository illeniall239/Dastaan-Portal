-- Management Dashboard Performance Optimization Indexes
-- Created: 2025-10-22
-- Purpose: Add indexes to improve query performance for management dashboard

-- Index on call_reports.meeting_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_call_reports_meeting_type
ON call_reports(meeting_type);

-- Index on episodes for drama/call report lookups
CREATE INDEX IF NOT EXISTS idx_episodes_call_report_id
ON episodes(call_report_id);

-- Index on episodes.episode_number for sorting
CREATE INDEX IF NOT EXISTS idx_episodes_episode_number
ON episodes(episode_number);

-- Composite index on episodes for common query patterns
CREATE INDEX IF NOT EXISTS idx_episodes_call_report_episode
ON episodes(call_report_id, episode_number);

-- Index on episodic_evaluations.episode_id for join performance
CREATE INDEX IF NOT EXISTS idx_episodic_evaluations_episode_id
ON episodic_evaluations(episode_id);

-- Index on episodic_evaluations.evaluator_id for filtering
CREATE INDEX IF NOT EXISTS idx_episodic_evaluations_evaluator_id
ON episodic_evaluations(evaluator_id);

-- Index on users.role for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

-- Composite index on users for evaluator queries
CREATE INDEX IF NOT EXISTS idx_users_role_status
ON users(role, status)
WHERE role = 'evaluator';

-- Index on evaluator_forms.evaluator_id for performance queries
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_evaluator_id
ON evaluator_forms(evaluator_id);

-- Index on evaluator_forms.created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_evaluator_forms_created_at
ON evaluator_forms(created_at DESC);

-- Index on call_reports.created_at for sorting
CREATE INDEX IF NOT EXISTS idx_call_reports_created_at
ON call_reports(created_at DESC);

-- Index on stories for status filtering
CREATE INDEX IF NOT EXISTS idx_stories_status
ON stories(status);

-- Comment on the indexes
COMMENT ON INDEX idx_call_reports_meeting_type IS 'Improves performance for filtering call reports by meeting type';
COMMENT ON INDEX idx_episodes_call_report_id IS 'Speeds up episode lookups by call report';
COMMENT ON INDEX idx_episodic_evaluations_episode_id IS 'Optimizes joins between episodes and evaluations';
COMMENT ON INDEX idx_users_role IS 'Faster role-based user queries';
COMMENT ON INDEX idx_evaluator_forms_evaluator_id IS 'Improves evaluator performance queries';
