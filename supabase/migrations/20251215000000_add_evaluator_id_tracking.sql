-- Add evaluator_id column to external_evaluations for browser-based tracking
ALTER TABLE external_evaluations
ADD COLUMN evaluator_id TEXT;

-- ip_address already exists, but ensure it's indexed for duplicate checks
CREATE INDEX IF NOT EXISTS idx_external_evaluations_ip ON external_evaluations(link_id, ip_address);

-- Drop old email-based unique constraint
ALTER TABLE external_evaluations
DROP CONSTRAINT IF EXISTS unique_email_per_link;

-- Add new evaluator_id-based unique constraint
-- This prevents duplicate submissions from same browser (localStorage)
ALTER TABLE external_evaluations
ADD CONSTRAINT unique_evaluator_per_link UNIQUE (link_id, evaluator_id);

-- Create index for faster evaluator_id lookups
CREATE INDEX idx_external_evaluations_evaluator ON external_evaluations(link_id, evaluator_id);

-- NOTE: We do NOT add a unique constraint on (link_id, ip_address) because:
-- - Shared IPs (offices, cafes) would block legitimate different users
-- - We check IP in application logic and return a user-friendly error
