-- Fix Notifications RLS Security Vulnerability
-- Issue: Previous policy had WITH CHECK (true) allowing ANY user to create fake notifications
-- Solution: Remove INSERT policy for authenticated users, force server-side creation via service role

-- Drop the insecure policy that allowed any authenticated user to create notifications
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Create new secure policy that blocks all authenticated user inserts
-- Only the service role (via admin client) can create notifications
CREATE POLICY "Only system can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (false); -- Explicitly block all authenticated role inserts

-- Note: Application code in lib/notifications/server.ts will use createAdminClient()
-- to create notifications, bypassing this policy with service role privileges.
-- This ensures notifications can only be created through validated server-side code paths.

-- The existing SELECT, UPDATE, and DELETE policies remain secure:
-- - SELECT: Users can view their own notifications (user_id = auth.uid())
-- - UPDATE: Users can update their own notifications (user_id = auth.uid())
-- - DELETE: Users can delete their own notifications (user_id = auth.uid())
