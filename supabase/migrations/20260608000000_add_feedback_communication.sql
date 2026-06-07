-- Add feedback communication fields to evaluator_forms and episodic_evaluations tables
-- These fields capture email/written feedback evidence submitted alongside evaluations.

ALTER TABLE evaluator_forms
  ADD COLUMN IF NOT EXISTS feedback_text TEXT,
  ADD COLUMN IF NOT EXISTS feedback_attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS feedback_attachment_name TEXT;

ALTER TABLE episodic_evaluations
  ADD COLUMN IF NOT EXISTS feedback_text TEXT,
  ADD COLUMN IF NOT EXISTS feedback_attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS feedback_attachment_name TEXT;
