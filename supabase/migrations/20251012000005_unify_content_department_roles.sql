-- Unify content department roles
-- This migration converts all content_manager and evaluator users to content_creator
-- This simplifies the role structure for the content department

-- Update existing users with content_manager or evaluator roles to content_creator
UPDATE users
SET role = 'content_creator'
WHERE role IN ('content_manager', 'evaluator');

-- Add comment explaining the change
COMMENT ON COLUMN users.role IS 'User role: content_creator (unified content dept), executive, legal, finance, admin';
