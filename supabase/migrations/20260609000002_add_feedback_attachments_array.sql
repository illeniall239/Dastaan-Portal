-- Replace single feedback attachment columns with a JSONB array
-- that stores multiple attachments: [{url: string, name: string}]
-- Old columns are kept for backward compatibility with existing data.

ALTER TABLE evaluator_forms
  ADD COLUMN IF NOT EXISTS feedback_attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE episodic_evaluations
  ADD COLUMN IF NOT EXISTS feedback_attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
