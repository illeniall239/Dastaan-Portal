-- Add created_by field to notifications table to track who triggered the notification
-- This allows us to exclude the creator from receiving notifications about their own actions
-- Date: 2025-01-17

-- Add created_by column to track who performed the action that triggered the notification
ALTER TABLE notifications
ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for performance when filtering notifications
CREATE INDEX idx_notifications_created_by ON notifications(created_by);

-- Add comment explaining the field
COMMENT ON COLUMN notifications.created_by IS
'User ID of the person who performed the action that triggered this notification. Used to exclude creators from receiving notifications about their own actions.';
