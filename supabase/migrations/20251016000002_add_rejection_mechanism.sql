-- =====================================================
-- Add Rejection Mechanism
-- =====================================================
-- This migration adds rejection tracking and archive system

-- =====================================================
-- 1. Add evaluation status enum
-- =====================================================

CREATE TYPE evaluation_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'accepted',
  'needs_improvement',
  'rejected'
);

-- =====================================================
-- 2. Add columns to call_reports for evaluation tracking
-- =====================================================

ALTER TABLE call_reports
ADD COLUMN IF NOT EXISTS evaluation_status evaluation_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS average_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS total_evaluators INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_evaluations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- =====================================================
-- 3. Create rejected_archive table
-- =====================================================

CREATE TABLE IF NOT EXISTS rejected_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Original call report data
  call_report_id TEXT NOT NULL,
  original_id UUID NOT NULL, -- Reference to original call_reports.id
  meeting_type TEXT NOT NULL,
  logged_by TEXT,
  category TEXT,
  writer_name TEXT NOT NULL,
  suggested_writer TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  contact_type TEXT,
  working_title TEXT NOT NULL,
  logline TEXT,
  usp TEXT,
  target_audience TEXT,
  meeting_date TIMESTAMP NOT NULL,
  meeting_attendees TEXT[],
  meeting_notes TEXT,
  next_steps TEXT,
  status TEXT,

  -- Evaluation data
  average_score DECIMAL(3,2) NOT NULL,
  total_evaluations INTEGER NOT NULL,
  rejection_reason TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  original_created_at TIMESTAMP NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW(),
  archived_by UUID REFERENCES users(id)
);

-- =====================================================
-- 4. Create evaluations_snapshot table for archived evaluations
-- =====================================================

CREATE TABLE IF NOT EXISTS evaluations_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id UUID REFERENCES rejected_archive(id) ON DELETE CASCADE,

  -- Snapshot of evaluation data
  form_id TEXT NOT NULL,
  original_evaluation_id UUID NOT NULL,
  evaluator_id UUID REFERENCES users(id),
  evaluator_name TEXT,
  evaluator_email TEXT,

  -- Scores
  premise_conflict_score INTEGER,
  storyline_plot_score INTEGER,
  episodic_progression_score INTEGER,
  characters_score INTEGER,
  dialogues_score INTEGER,
  overall_assessment_score INTEGER,
  average_score DECIMAL(3,2),

  -- Feedback
  comments TEXT,
  first_2_eps_required TEXT,

  -- Metadata
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 5. Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_call_reports_evaluation_status
  ON call_reports(evaluation_status);

CREATE INDEX IF NOT EXISTS idx_call_reports_average_score
  ON call_reports(average_score);

CREATE INDEX IF NOT EXISTS idx_rejected_archive_archived_at
  ON rejected_archive(archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_rejected_archive_average_score
  ON rejected_archive(average_score);

CREATE INDEX IF NOT EXISTS idx_evaluations_snapshot_archive_id
  ON evaluations_snapshot(archive_id);

-- =====================================================
-- 6. Add RLS policies
-- =====================================================

-- Rejected Archive: Admins, management, and executives can view
ALTER TABLE rejected_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rejected archive"
  ON rejected_archive FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'management', 'executive', 'content_manager')
    )
  );

CREATE POLICY "System can insert into rejected archive"
  ON rejected_archive FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Evaluations Snapshot: Same access as archive
ALTER TABLE evaluations_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view evaluations snapshot"
  ON evaluations_snapshot FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'management', 'executive', 'content_manager')
    )
  );

CREATE POLICY "System can insert into evaluations snapshot"
  ON evaluations_snapshot FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 7. Comments for documentation
-- =====================================================

COMMENT ON TABLE rejected_archive IS
'Stores call reports that were rejected based on evaluation scores (average < 5.0)';

COMMENT ON TABLE evaluations_snapshot IS
'Stores snapshots of all evaluations for rejected call reports';

COMMENT ON COLUMN call_reports.evaluation_status IS
'Tracks evaluation progress: pending -> in_progress -> completed -> accepted/needs_improvement/rejected';

COMMENT ON COLUMN call_reports.average_score IS
'Average score across all evaluations (calculated automatically)';

COMMENT ON COLUMN rejected_archive.average_score IS
'Final average score that caused rejection (< 5.0)';
