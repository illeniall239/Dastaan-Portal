-- Add per-user evaluation access flag.
-- Set to FALSE to make a user view-only on all evaluation forms.
-- Default TRUE so all existing users retain full access.

ALTER TABLE users ADD COLUMN IF NOT EXISTS can_evaluate BOOLEAN NOT NULL DEFAULT TRUE;

-- Revoke evaluation submission access for asad.abidi@geo.tv
UPDATE users SET can_evaluate = FALSE WHERE email = 'asad.abidi@geo.tv';
